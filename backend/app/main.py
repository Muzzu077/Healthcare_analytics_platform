from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.services.seed_service import seed_initial_database_data
from app.services.event_service import event_manager

from app.routers import (
    auth, healthcare, query_engine, optimizer,
    ml_analytics, dashboard, alerts, audit, system
)

# Initialize FastAPI App
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="PULSE CORE: Clinical Intelligence and Healthcare Data Operations Platform with Adaptive Query Processing & Predictive Analytics",
    version=settings.VERSION
)

# Configure CORS Origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include All System Routers
app.include_router(auth.router)
app.include_router(healthcare.router)
app.include_router(query_engine.router)
app.include_router(optimizer.router)
app.include_router(ml_analytics.router)
app.include_router(dashboard.router)
app.include_router(alerts.router)
app.include_router(audit.router)
app.include_router(system.router)

@app.on_event("startup")
def startup_event():
    """Create database tables and seed initial clinical telemetry dataset."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_initial_database_data(db)
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "status": "online",
        "app_name": settings.PROJECT_NAME,
        "academic_core": "Adaptive Query Plan Analysis & Performance Optimization",
        "clinical_domain": "Real-Time Telemetry & XGBoost Predictive Risk Analytics",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time authenticated WebSocket gateway for streaming hospital telemetry & query events."""
    await event_manager.connect(websocket)
    try:
        while True:
            # Receive client ping or subscriptions
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type": "pong"}')
    except WebSocketDisconnect:
        event_manager.disconnect(websocket)
    except Exception:
        event_manager.disconnect(websocket)
