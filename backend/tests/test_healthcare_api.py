import pytest

def test_patient_registry_pagination(client):
    """Verify paginated patient registry with filtering."""
    res = client.get("/api/healthcare/patients?skip=0&limit=10")
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert len(data["items"]) <= 10
    assert data["items"][0]["patient_code"].startswith("PAT-")

def test_record_vitals_telemetry(client, auth_headers):
    """Verify recording abnormal vitals creates telemetry and triggers prediction evaluation."""
    vitals_payload = {
        "patient_id": 1,
        "heart_rate": 132,
        "systolic_bp": 178,
        "diastolic_bp": 105,
        "temp_celsius": 39.2,
        "oxygen_saturation": 88.5,
        "respiratory_rate": 28,
        "blood_glucose_mgdl": 240
    }
    res = client.post("/api/healthcare/vitals", json=vitals_payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["vital"]["is_abnormal"] is True
    assert "prediction" in data
    assert data["prediction"]["readmission_risk_pct"] >= 0.0

def test_alerts_acknowledge_and_resolve(client, auth_headers):
    """Verify alert retrieval, acknowledgment, and resolution lifecycle."""
    res = client.get("/api/alerts")
    assert res.status_code == 200
    alerts = res.json()
    if len(alerts) > 0:
        alert_id = alerts[0]["id"]
        ack_res = client.put(f"/api/alerts/{alert_id}/acknowledge", headers=auth_headers)
        assert ack_res.status_code == 200

        resolve_res = client.put(f"/api/alerts/{alert_id}/resolve", headers=auth_headers)
        assert resolve_res.status_code == 200
        assert resolve_res.json()["alert"]["is_resolved"] is True
