import pytest
from app.services.ml_service import ml_engine

def test_ml_model_training_and_metrics():
    """Verify 3 models (Logistic Regression, Random Forest, XGBoost) evaluate with reasonable performance."""
    metrics = ml_engine.get_model_comparison_metrics()
    assert len(metrics) == 3
    model_names = [m["model_name"] for m in metrics]
    assert any("XGBoost" in name for name in model_names)
    assert any("Random Forest" in name for name in model_names)
    assert any("Logistic Regression" in name for name in model_names)

    for m in metrics:
        assert m["accuracy"] > 0.60
        assert m["f1_score"] > 0.50
        assert m["roc_auc"] > 0.60
        assert "confusion_matrix" in m

def test_patient_readmission_prediction(client, auth_headers):
    """Verify endpoint generates risk score and feature contributions with disclaimer."""
    res = client.get("/api/analytics/predict/1", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "readmission_risk_score" in data
    assert "readmission_risk_pct" in data
    assert data["risk_level"] in ["Low", "Moderate", "High", "Critical"]
    assert len(data["feature_contributions"]) > 0
    assert "clinical_recommendation" in data
    assert "disclaimer" in data
