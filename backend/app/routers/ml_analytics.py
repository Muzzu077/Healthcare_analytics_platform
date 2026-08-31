from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.database import get_db
from app.services.ml_service import ml_engine
from app.models.domain import Patient, ModelPrediction, Admission

router = APIRouter(prefix="/api/analytics", tags=["Predictive Analytics & ML Engine"])

@router.get("/model-comparison")
def get_model_benchmarks():
    """Retrieve 3-model comparative evaluation metrics (Logistic Regression, Random Forest, XGBoost)."""
    return ml_engine.get_model_comparison_metrics()

@router.get("/predict/{patient_id}")
def predict_patient_readmission_risk(patient_id: int, db: Session = Depends(get_db)):
    """Generate 30-day hospital readmission risk score & feature contribution breakdown for patient."""
    res = ml_engine.predict_patient_risk(db, patient_id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res

@router.get("/high-risk-patients")
def get_high_risk_patients(limit: int = 10, db: Session = Depends(get_db)):
    """Retrieve admitted patients flagged with high or critical readmission risk probability."""
    high_risk_preds = db.query(ModelPrediction).filter(
        ModelPrediction.risk_level.in_(["Critical", "High"])
    ).order_by(ModelPrediction.risk_score.desc()).limit(limit).all()

    results = []
    for p in high_risk_preds:
        patient = db.query(Patient).filter(Patient.id == p.patient_id).first()
        if patient:
            results.append({
                "patient_id": patient.id,
                "patient_code": patient.patient_code,
                "patient_name": patient.name,
                "age": patient.age,
                "gender": patient.gender,
                "risk_score": p.risk_score,
                "risk_pct": round(p.risk_score * 100, 1),
                "risk_level": p.risk_level,
                "clinical_recommendation": p.clinical_recommendation,
                "predicted_at": p.created_at.isoformat()
            })

    # If no stored predictions yet, compute dynamically for first batch
    if not results:
        active_patients = db.query(Patient).limit(10).all()
        for pat in active_patients:
            pred = ml_engine.predict_patient_risk(db, pat.id)
            if pred.get("risk_level") in ["Critical", "High"]:
                results.append(pred)

    return results

@router.get("/risk-distribution")
def get_risk_distribution(db: Session = Depends(get_db)):
    """Get overall patient population risk tier distribution."""
    total_patients = db.query(Patient).count()
    if total_patients == 0:
        return {"critical": 0, "high": 0, "moderate": 0, "low": 0}

    # Count by stored prediction risk levels
    critical_cnt = db.query(ModelPrediction).filter(ModelPrediction.risk_level == "Critical").count()
    high_cnt = db.query(ModelPrediction).filter(ModelPrediction.risk_level == "High").count()
    moderate_cnt = db.query(ModelPrediction).filter(ModelPrediction.risk_level == "Moderate").count()
    low_cnt = max(0, total_patients - (critical_cnt + high_cnt + moderate_cnt))

    return {
        "critical": critical_cnt,
        "high": high_cnt,
        "moderate": moderate_cnt,
        "low": low_cnt,
        "total_evaluated": total_patients
    }
