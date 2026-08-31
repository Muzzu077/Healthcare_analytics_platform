from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from app.database import get_db
from app.services.query_engine import process_and_execute_sql
from app.services.optimizer import analyze_and_optimize, run_adaptive_benchmark, validate_and_apply_index_ddl
from app.models.domain import BenchmarkHistory, User, UserRoleEnum
from app.routers.auth import get_current_user, require_role

router = APIRouter(prefix="/api/optimizer", tags=["Adaptive Query Optimization & Benchmarking"])

class OptimizeRequest(BaseModel):
    sql_query: str

class BenchmarkRequest(BaseModel):
    sql_query: str
    ddl_statements: List[str]

class ApplyIndexRequest(BaseModel):
    ddl_statement: str

@router.post("/recommend")
def get_optimization_recommendations(
    req: OptimizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Analyzes execution plan tree & AST metadata to generate contextual index & rewrite recommendations."""
    exec_result = process_and_execute_sql(
        sql_query=req.sql_query,
        db_session=db,
        user_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role
    )
    if not exec_result.get("success"):
        raise HTTPException(status_code=400, detail=exec_result.get("error", "Query execution failed"))

    analysis = analyze_and_optimize(req.sql_query, exec_result)
    return analysis

@router.post("/apply-index")
def apply_index_optimization(
    req: ApplyIndexRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.ADMIN.value, UserRoleEnum.ANALYTICS_DBA.value]))
):
    """Safely executes an approved CREATE INDEX DDL statement (Admin / DBA only)."""
    try:
        res = validate_and_apply_index_ddl(
            ddl_statement=req.ddl_statement,
            db=db,
            actor_user_id=current_user.id,
            actor_username=current_user.username,
            actor_role=current_user.role
        )
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/benchmark")
def run_benchmark_test(
    req: BenchmarkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Runs genuine before-and-after performance benchmarking and records speedup measurements."""
    res = run_adaptive_benchmark(
        sql_query=req.sql_query,
        ddl_statements=req.ddl_statements,
        db_session=db,
        user_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role
    )
    return res

@router.get("/benchmarks")
def get_benchmark_history(
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Retrieve historical measured query benchmarks."""
    return db.query(BenchmarkHistory).order_by(BenchmarkHistory.created_at.desc()).limit(limit).all()
