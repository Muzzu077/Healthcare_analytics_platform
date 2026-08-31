import time
import json
import hashlib
import psycopg2
import psycopg2.extras
import sqlglot
from sqlglot import exp
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.database import get_raw_connection
from app.models.domain import QueryHistory
from app.services.audit_service import log_audit_event
from app.services.event_service import event_manager
from app.config import settings

# ==============================================================================
# AST PARSER & READ-ONLY SECURITY VALIDATOR
# ==============================================================================

FORBIDDEN_EXPRESSION_TYPES = (
    exp.Insert, exp.Update, exp.Delete, exp.Drop, exp.Create,
    exp.Alter, exp.TruncateTable, exp.Grant, exp.Revoke, exp.Command,
    exp.Transaction, exp.Commit, exp.Rollback
)

FORBIDDEN_FUNCTIONS = {
    "pg_sleep", "pg_read_file", "pg_write_file", "pg_ls_dir",
    "pg_stat_file", "lo_export", "lo_import", "dblink", "dblink_exec",
    "pg_terminate_backend", "pg_cancel_backend", "current_setting"
}

def validate_safe_readonly_sql(sql_string: str) -> Tuple[bool, Optional[str], Optional[exp.Expression]]:
    """Strictly validates that SQL is single-statement, read-only SELECT/CTE query."""
    clean_sql = sql_string.strip()
    if not clean_sql:
        return False, "Query cannot be empty.", None

    try:
        parsed_statements = sqlglot.parse(clean_sql)
        if not parsed_statements:
            return False, "Unable to parse SQL query.", None

        if len(parsed_statements) > 1:
            return False, "Multiple stacked statements are forbidden for security. Submit one query at a time.", None

        parsed = parsed_statements[0]
        if parsed is None:
            return False, "Invalid SQL syntax.", None

        # Ensure top-level is Select or CTE (With)
        if not isinstance(parsed, (exp.Select, exp.Union)):
            return False, f"Statement type '{parsed.key.upper()}' is not permitted. Only read-only SELECT and analytical CTE statements are allowed.", None

        # Check for any forbidden expression types in the AST
        for forbidden_type in FORBIDDEN_EXPRESSION_TYPES:
            if parsed.find(forbidden_type) is not None:
                return False, f"Dangerous operation '{forbidden_type.__name__.upper()}' detected and blocked by AST guardrails.", None

        # Check for dangerous built-in functions
        for func in parsed.find_all(exp.Anonymous):
            if func.name and func.name.lower() in FORBIDDEN_FUNCTIONS:
                return False, f"Function '{func.name}' is restricted for database security.", None

        return True, None, parsed

    except Exception as e:
        return False, f"SQL parsing error: {str(e)}", None

def compute_query_fingerprint(sql_string: str) -> str:
    """Computes a normalized hash fingerprint of the query for performance aggregation."""
    try:
        transpiled = sqlglot.transpile(sql_string, read="postgres", write="postgres", identify=False)[0]
        normalized = " ".join(transpiled.lower().split())
        return hashlib.md5(normalized.encode('utf-8')).hexdigest()
    except Exception:
        normalized = " ".join(sql_string.strip().lower().split())
        return hashlib.md5(normalized.encode('utf-8')).hexdigest()

def parse_query_ast(sql_string: str) -> Dict[str, Any]:
    """Parse SQL query using sqlglot to extract structural complexity metrics."""
    is_safe, error_msg, _ = validate_safe_readonly_sql(sql_string)
    if not is_safe:
        raise ValueError(error_msg or "Invalid read-only SQL statement.")

    try:
        parsed = sqlglot.parse_one(sql_string)
        tables = [t.name for t in parsed.find_all(exp.Table) if t.name]
        columns = [c.name for c in parsed.find_all(exp.Column) if c.name]
        joins = [j.kind or "INNER" for j in parsed.find_all(exp.Join)]
        has_where = parsed.find(exp.Where) is not None
        has_group = parsed.find(exp.Group) is not None
        has_order = parsed.find(exp.Order) is not None
        has_subquery = parsed.find(exp.Subquery) is not None

        # Structural complexity score (1 to 100)
        complexity = 10
        complexity += len(set(tables)) * 12
        complexity += len(joins) * 18
        if has_where: complexity += 10
        if has_group: complexity += 15
        if has_order: complexity += 8
        if has_subquery: complexity += 20

        return {
            "is_valid": True,
            "tables": list(set(tables)),
            "columns": list(set(columns)),
            "join_types": joins,
            "has_where": has_where,
            "has_group_by": has_group,
            "has_order_by": has_order,
            "has_subquery": has_subquery,
            "complexity_score": min(100, complexity)
        }
    except ValueError:
        raise
    except Exception as e:
        return {
            "is_valid": False,
            "tables": [],
            "columns": [],
            "join_types": [],
            "has_where": False,
            "has_group_by": False,
            "has_order_by": False,
            "has_subquery": False,
            "complexity_score": 0,
            "parse_error": str(e)
        }

# ==============================================================================
# EXPLAIN ANALYZE PLAN EXTRACTION & METRICS ENGINE
# ==============================================================================

def flatten_plan_nodes(plan_node: Dict[str, Any], nodes_list: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """Recursively extract key plan nodes and metadata."""
    if nodes_list is None:
        nodes_list = []
    
    if not plan_node or not isinstance(plan_node, dict):
        return nodes_list

    node_type = plan_node.get("Node Type", "Unknown")
    relation = plan_node.get("Relation Name", "")
    alias = plan_node.get("Alias", "")
    index_name = plan_node.get("Index Name", "")
    startup_cost = float(plan_node.get("Startup Cost", 0.0))
    total_cost = float(plan_node.get("Total Cost", 0.0))
    actual_time = float(plan_node.get("Actual Total Time", plan_node.get("Execution Time", 0.0)))
    actual_rows = int(plan_node.get("Actual Rows", plan_node.get("Plan Rows", 0)))
    filter_cond = plan_node.get("Filter", plan_node.get("Index Cond", ""))
    
    nodes_list.append({
        "node_type": node_type,
        "relation_name": relation,
        "alias": alias,
        "index_name": index_name,
        "startup_cost": startup_cost,
        "total_cost": total_cost,
        "actual_time_ms": actual_time,
        "actual_rows": actual_rows,
        "filter": filter_cond,
        "plans": plan_node.get("Plans", [])
    })

    for child in plan_node.get("Plans", []):
        flatten_plan_nodes(child, nodes_list)
        
    return nodes_list

def extract_plan_telemetry(plan_node: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively traverses execution plan to collect scans, joins, indexes, and buffer metrics."""
    scan_types = set()
    join_types = set()
    used_indexes = set()
    sort_operations = set()
    has_large_seq_scan = False

    def traverse(node: Dict[str, Any]):
        nonlocal has_large_seq_scan
        ntype = node.get("Node Type", "")
        if "Scan" in ntype:
            scan_types.add(ntype)
            if ntype == "Seq Scan":
                plan_rows = node.get("Plan Rows", 0)
                actual_rows = node.get("Actual Rows", plan_rows)
                if actual_rows > 500 or plan_rows > 500:
                    has_large_seq_scan = True

        if "Join" in ntype or "Loop" in ntype:
            join_types.add(ntype)

        if "Index Name" in node and node["Index Name"]:
            used_indexes.add(node["Index Name"])

        if "Sort" in ntype:
            sort_operations.add(ntype)

        for child in node.get("Plans", []):
            traverse(child)

    traverse(plan_node)

    return {
        "scan_types": list(scan_types),
        "join_types": list(join_types),
        "used_indexes": list(used_indexes),
        "sort_operations": list(sort_operations),
        "has_large_seq_scan": has_large_seq_scan
    }

def process_and_execute_sql(
    sql_query: str,
    db_session: Optional[Session] = None,
    user_id: Optional[int] = None,
    actor_username: Optional[str] = None,
    actor_role: Optional[str] = None
) -> Dict[str, Any]:
    """Safely validates, explains, and executes query against PostgreSQL with complete telemetry."""
    
    # 1. AST Validation & Security Guardrail
    is_safe, error_msg, _ = validate_safe_readonly_sql(sql_query)
    if not is_safe:
        return {
            "success": False,
            "error": f"Security Validation Failed: {error_msg}",
            "sql_query": sql_query,
            "execution_time_ms": 0.0,
            "cost_estimate": 0.0,
            "rows_returned": 0,
            "results": []
        }

    ast_info = parse_query_ast(sql_query)
    fingerprint = compute_query_fingerprint(sql_query)

    conn = get_raw_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        # Set execution timeout to avoid runaway queries
        cursor.execute(f"SET statement_timeout = {settings.QUERY_TIMEOUT_MS};")

        # 2. Run EXPLAIN (ANALYZE, COSTS, BUFFERS, VERBOSE, FORMAT JSON)
        explain_sql = f"EXPLAIN (ANALYZE, COSTS, BUFFERS, VERBOSE, FORMAT JSON) {sql_query}"
        cursor.execute(explain_sql)
        explain_result = cursor.fetchall()
        
        plan_root = {}
        planning_time = 0.0
        execution_time = 0.0
        
        if explain_result and len(explain_result) > 0:
            row0 = explain_result[0]
            raw_explain_json = row0.get("QUERY PLAN") if isinstance(row0, dict) else row0[0]
            if isinstance(raw_explain_json, list) and len(raw_explain_json) > 0:
                first_plan = raw_explain_json[0]
                plan_root = first_plan.get("Plan", {})
                planning_time = float(first_plan.get("Planning Time", 0.0))
                execution_time = float(first_plan.get("Execution Time", 0.0))

        cost_estimate = float(plan_root.get("Total Cost", 0.0))
        plan_rows = int(plan_root.get("Plan Rows", 0))
        actual_rows = int(plan_root.get("Actual Rows", plan_rows))

        # Extract buffer statistics
        shared_hit = int(plan_root.get("Shared Hit Blocks", 0))
        shared_read = int(plan_root.get("Shared Read Blocks", 0))

        # Extract telemetry details
        telemetry = extract_plan_telemetry(plan_root)

        # 3. Execute actual SQL query for data preview (with safe preview limit)
        preview_sql = f"SELECT * FROM ({sql_query.rstrip(';')}) AS subq LIMIT {settings.MAX_QUERY_RESULT_ROWS};"
        cursor.execute(preview_sql)
        query_rows = cursor.fetchall()

        columns = list(query_rows[0].keys()) if query_rows else []
        clean_rows = []
        for r in query_rows:
            clean_row = {}
            for k, v in r.items():
                if hasattr(v, 'isoformat'):
                    clean_row[k] = v.isoformat()
                else:
                    clean_row[k] = v
            clean_rows.append(clean_row)

        has_bottleneck = telemetry["has_large_seq_scan"] or execution_time > 15.0 or (cost_estimate > 500 and not telemetry["used_indexes"])
        bottleneck_type = "Sequential Scan on Large Table" if telemetry["has_large_seq_scan"] else ("High Estimated Cost" if cost_estimate > 500 else None)

        # 4. Record to QueryHistory
        if db_session:
            try:
                hist_record = QueryHistory(
                    sql_query=sql_query,
                    query_fingerprint=fingerprint,
                    execution_time_ms=execution_time,
                    planning_time_ms=planning_time,
                    cost_estimate=cost_estimate,
                    rows_affected=len(clean_rows),
                    buffers_hit=shared_hit,
                    buffers_read=shared_read,
                    scan_type=", ".join(telemetry["scan_types"]) or "Seq Scan",
                    join_type=", ".join(telemetry["join_types"]) or "None",
                    used_indexes=", ".join(telemetry["used_indexes"]) or "None",
                    plan_tree_json=plan_root,
                    has_bottleneck=has_bottleneck,
                    bottleneck_type=bottleneck_type,
                    user_id=user_id
                )
                db_session.add(hist_record)
                db_session.commit()

                # Record audit log
                log_audit_event(
                    db=db_session,
                    action="EXECUTE_QUERY",
                    resource_type="QueryHistory",
                    resource_id=str(hist_record.id),
                    actor_user_id=user_id,
                    actor_username=actor_username,
                    actor_role=actor_role,
                    metadata={
                        "execution_time_ms": execution_time,
                        "cost_estimate": cost_estimate,
                        "rows_returned": len(clean_rows),
                        "has_bottleneck": has_bottleneck
                    }
                )
            except Exception as e:
                db_session.rollback()
                print(f"Failed to record query history: {e}")

        # 5. Broadcast real-time event for system dashboard
        # Note: asyncio background task or event broadcast handled at router layer

        return {
            "success": True,
            "sql_query": sql_query,
            "query_fingerprint": fingerprint,
            "execution_time_ms": execution_time,
            "planning_time_ms": planning_time,
            "cost_estimate": cost_estimate,
            "rows_returned": len(clean_rows),
            "buffers_hit": shared_hit,
            "buffers_read": shared_read,
            "columns": columns,
            "results": clean_rows,
            "ast_info": ast_info,
            "scan_types": telemetry["scan_types"],
            "join_types": telemetry["join_types"],
            "used_indexes": telemetry["used_indexes"],
            "execution_plan_tree": plan_root,
            "has_bottleneck": has_bottleneck,
            "bottleneck_type": bottleneck_type
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"PostgreSQL Execution Error: {str(e)}",
            "sql_query": sql_query,
            "execution_time_ms": 0.0,
            "planning_time_ms": 0.0,
            "cost_estimate": 0.0,
            "rows_returned": 0,
            "columns": [],
            "results": [],
            "ast_info": ast_info,
            "scan_types": [],
            "join_types": [],
            "used_indexes": [],
            "execution_plan_tree": {}
        }
    finally:
        cursor.close()
        conn.close()
