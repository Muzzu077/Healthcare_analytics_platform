from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import psycopg2
import psycopg2.extras

from app.database import get_db, get_raw_connection
from app.services.query_engine import process_and_execute_sql, parse_query_ast
from app.services.ai_query_service import ai_query_engine
from app.models.domain import QueryHistory, User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/query", tags=["Query Processing & SQL Workspace"])

class QueryRequest(BaseModel):
    sql_query: str

class AIQueryRequest(BaseModel):
    prompt: str

class QueryBuilderRequest(BaseModel):
    table_name: str
    filter_column: Optional[str] = None
    filter_value: Optional[str] = None
    limit: Optional[int] = 50

# Predefined Academic Healthcare Query Presets
ACADEMIC_QUERY_PRESETS = [
    {
        "id": "q1",
        "name": "1. Selective Age + Admissions Join Query",
        "description": "Inner join across patients and active admissions filtered by geriatric age group (> 65).",
        "sql": "SELECT p.patient_code, p.name, p.age, p.gender, a.ward, a.bed_number, a.primary_diagnosis, a.length_of_stay_days FROM patients p JOIN admissions a ON p.id = a.patient_id WHERE p.age > 65 AND a.status = 'admitted';"
    },
    {
        "id": "q2",
        "name": "2. Unindexed Vitals Filter (Sequential Scan Benchmark)",
        "description": "Scans large telemetry vitals table for abnormal indicators. Demonstrates B-Tree indexing speedup.",
        "sql": "SELECT patient_id, heart_rate, systolic_bp, diastolic_bp, oxygen_saturation, temp_celsius, recorded_at FROM vitals WHERE is_abnormal = true AND heart_rate > 105;"
    },
    {
        "id": "q3",
        "name": "3. Critical Diagnostic Lab Aggregation",
        "description": "Groups critical laboratory test results by diagnostic category and calculates test frequency and average value.",
        "sql": "SELECT test_name, category, COUNT(*) as total_tests, ROUND(AVG(result_value)::numeric, 2) as avg_value, MIN(result_value) as min_val, MAX(result_value) as max_val FROM lab_results WHERE status = 'critical' GROUP BY test_name, category ORDER BY total_tests DESC;"
    },
    {
        "id": "q4",
        "name": "4. Multi-Table 3-Way Join (High Complexity)",
        "description": "Complex 3-way join connecting patient demographics, live vital signs, and diagnostic lab results with composite filters.",
        "sql": "SELECT p.patient_code, p.name, p.age, v.heart_rate, v.oxygen_saturation, l.test_name, l.result_value, l.status as lab_status FROM patients p JOIN vitals v ON p.id = v.patient_id JOIN lab_results l ON p.id = l.patient_id WHERE v.is_abnormal = true AND l.status = 'critical';"
    }
]

@router.post("/execute")
def execute_sql_query(
    req: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Safely validate, explain, and execute analytical SQL queries against PostgreSQL."""
    result = process_and_execute_sql(
        sql_query=req.sql_query,
        db_session=db,
        user_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role
    )
    return result

@router.post("/ai-search")
def execute_ai_natural_language_search(
    req: AIQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Intelligent AI Assistant: Translates natural language questions into safe read-only SQL,
    validates with AST guardrails, executes on PostgreSQL, and returns explanation and data.
    """
    return ai_query_engine.execute_ai_query(
        prompt=req.prompt,
        db=db,
        user_id=current_user.id
    )

@router.post("/text-to-sql")
def translate_prompt_to_sql_only(
    req: AIQueryRequest
):
    """Translates a natural language query into SQL without immediate execution."""
    return ai_query_engine.translate_prompt_to_sql(prompt=req.prompt)

@router.get("/presets")
def get_query_presets():
    """Retrieve pre-configured academic healthcare query presets."""
    return ACADEMIC_QUERY_PRESETS

@router.get("/schema")
def get_schema_explorer():
    """Returns database tables, column names, data types, and primary/foreign key metadata for the Schema Explorer."""
    conn = get_raw_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cursor.execute("""
            SELECT 
                t.table_name,
                c.column_name,
                c.data_type,
                c.is_nullable
            FROM information_schema.tables t
            JOIN information_schema.columns c ON t.table_name = c.table_name
            WHERE t.table_schema = 'public' 
              AND t.table_type = 'BASE TABLE'
              AND t.table_name NOT LIKE 'pg_%'
              AND t.table_name NOT LIKE 'alembic_%'
            ORDER BY t.table_name, c.ordinal_position;
        """)
        rows = cursor.fetchall()
        
        schema_dict = {}
        for r in rows:
            tname = r["table_name"]
            if tname not in schema_dict:
                schema_dict[tname] = []
            schema_dict[tname].append({
                "column_name": r["column_name"],
                "data_type": r["data_type"],
                "is_nullable": r["is_nullable"] == "YES"
            })
        return schema_dict
    except Exception as e:
        return {}
    finally:
        cursor.close()
        conn.close()

@router.get("/history")
def get_query_history(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Retrieve query execution performance history and plan telemetry."""
    return db.query(QueryHistory).order_by(QueryHistory.timestamp.desc()).limit(limit).all()

@router.get("/performance-stats")
def get_query_performance_stats(db: Session = Depends(get_db)):
    """Retrieve top slow queries, highest cost queries, and latency trends."""
    history = db.query(QueryHistory).order_by(QueryHistory.timestamp.desc()).limit(100).all()
    
    slow_queries = db.query(QueryHistory).order_by(QueryHistory.execution_time_ms.desc()).limit(5).all()
    high_cost_queries = db.query(QueryHistory).order_by(QueryHistory.cost_estimate.desc()).limit(5).all()
    
    total_queries = db.query(QueryHistory).count()
    bottlenecks_count = db.query(QueryHistory).filter(QueryHistory.has_bottleneck == True).count()

    return {
        "total_queries_logged": total_queries,
        "bottlenecks_detected": bottlenecks_count,
        "slow_queries": slow_queries,
        "high_cost_queries": high_cost_queries,
        "recent_trend": [
            {
                "id": q.id,
                "execution_time_ms": round(q.execution_time_ms, 3),
                "planning_time_ms": round(q.planning_time_ms or 0.1, 3),
                "cost_estimate": round(q.cost_estimate or 0.0, 1),
                "rows": q.rows_affected,
                "timestamp": q.timestamp.isoformat()
            }
            for q in reversed(history[:20])
        ]
    }
