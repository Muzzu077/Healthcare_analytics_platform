import pytest
from app.services.query_engine import parse_query_ast, process_and_execute_sql
from app.database import SessionLocal

def test_ast_valid_select_query():
    """Verify sqlglot AST parser extracts projection and relations from valid SELECT."""
    sql = "SELECT id, name, age FROM patients WHERE age > 60 ORDER BY age DESC;"
    ast_info = parse_query_ast(sql)
    assert ast_info["is_valid"] is True
    assert "patients" in [t.lower() for t in ast_info["tables"]]
    assert ast_info["has_where"] is True
    assert ast_info["has_order_by"] is True

def test_ast_blocks_mutation_queries():
    """Verify sqlglot AST parser strictly rejects INSERT, UPDATE, DELETE, and DROP statements."""
    forbidden_queries = [
        "INSERT INTO patients (name, age) VALUES ('Malicious User', 30);",
        "UPDATE patients SET age = 100 WHERE id = 1;",
        "DELETE FROM vitals WHERE id > 0;",
        "DROP TABLE patients CASCADE;",
        "TRUNCATE TABLE lab_results;",
        "ALTER TABLE users ADD COLUMN is_hacked BOOLEAN;",
        "SELECT 1; DROP TABLE users;"
    ]
    for bad_sql in forbidden_queries:
        with pytest.raises(ValueError) as exc:
            parse_query_ast(bad_sql)
        err = str(exc.value).lower()
        assert "not permitted" in err or "forbidden" in err or "dangerous" in err

def test_explain_analyze_execution(client, dba_auth_headers):
    """Verify EXPLAIN (ANALYZE, BUFFERS) returns valid telemetry metrics."""
    res = client.post(
        "/api/query/execute",
        json={"sql_query": "SELECT id, name, age FROM patients WHERE age > 50 LIMIT 10;"},
        headers=dba_auth_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["execution_time_ms"] >= 0.0
    assert data["planning_time_ms"] >= 0.0
    assert data["cost_estimate"] >= 0.0
    assert "columns" in data
    assert "results" in data
    assert "execution_plan_tree" in data

def test_schema_explorer_endpoint(client):
    """Verify schema catalog returns relational table columns and types."""
    res = client.get("/api/query/schema")
    assert res.status_code == 200
    schema = res.json()
    assert "patients" in schema
    assert "vitals" in schema
    assert "admissions" in schema

def test_ai_natural_language_query_search(client, dba_auth_headers):
    """Verify AI text-to-SQL translates natural language prompts into executable queries."""
    res = client.post(
        "/api/query/ai-search",
        json={"prompt": "Find critical cardiac lab results with abnormal troponin or BNP"},
        headers=dba_auth_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "SELECT" in data["sql_query"].upper()
    assert "lab_results" in data["sql_query"].lower()
    assert len(data["ai_explanation"]) > 0
    assert "results" in data
    assert data["execution_time_ms"] >= 0.0
