import pytest

def test_jwt_auth_and_profile(client, auth_headers):
    """Verify JWT authentication and /api/auth/me session identity."""
    res = client.get("/api/auth/me", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "doctor"
    assert data["role"] == "doctor"

def test_rbac_access_control(client, auth_headers, dba_auth_headers):
    """Verify RBAC role protection on privileged DBA/Admin routes."""
    # Doctor attempting to access compliance audit logs (requires Admin/DBA)
    res_doc = client.get("/api/audit", headers=auth_headers)
    assert res_doc.status_code == 403

    # DBA accessing compliance audit logs
    res_dba = client.get("/api/audit", headers=dba_auth_headers)
    assert res_dba.status_code == 200
    assert "items" in res_dba.json()

def test_system_health_check(client):
    """Verify system diagnostics endpoint returns status for DB, WS, ML, and API."""
    res = client.get("/api/system/status")
    assert res.status_code == 200
    data = res.json()
    assert data["overall_status"] == "healthy"
    assert data["services"]["database"]["status"] == "healthy"
    assert data["services"]["ml_engine"]["models_trained"] >= 3
