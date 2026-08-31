import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models.domain import User, UserRoleEnum
from app.services.seed_service import seed_initial_database_data

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Ensure tables and seed data are ready for test suite."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_initial_database_data(db)
    finally:
        db.close()

@pytest.fixture
def client():
    """FastAPI TestClient fixture."""
    return TestClient(app)

@pytest.fixture
def auth_headers(client):
    """Obtains a valid JWT auth header for doctor role."""
    res = client.post(
        "/api/auth/token",
        data={"username": "doctor", "password": "doctor123"}
    )
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def dba_auth_headers(client):
    """Obtains a valid JWT auth header for DBA role."""
    res = client.post(
        "/api/auth/token",
        data={"username": "dba", "password": "dba123"}
    )
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
