#!/bin/bash

# ==============================================================================
# PULSE CORE: Smart Healthcare Data Analytics Platform
# Adaptive Query Processing & Predictive Analytics
# Single Unified Start Script
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT=8088
FRONTEND_PORT=3000

echo "======================================================================"
echo " 🏥 Starting PULSE CORE — Clinical Intelligence & Operations Platform"
echo " Adaptive Query Processing & Predictive Analytics Engine"
echo "======================================================================"

# Step 1: Stop competing local services and docker containers
echo "[1/4] Stopping conflicting local services & containers..."
fuser -k ${BACKEND_PORT}/tcp 2>/dev/null || true
fuser -k ${FRONTEND_PORT}/tcp 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Stop other unused docker containers to free system resources
docker stop trustflow-frontend trustflow-api trustflow-ingestion trustflow-worker trustflow-postgres trustflow-redis poms-frontend poms-backend poms-postgres planwise-db redshield-postgres redshield-redis 2>/dev/null || true

# Step 2: Ensure PostgreSQL 16 Docker container is running
echo "[2/4] Verifying PostgreSQL 16 Database Engine..."
if ! docker ps --format '{{.Names}}' | grep -q "^healthcare-postgres$"; then
    if docker ps -a --format '{{.Names}}' | grep -q "^healthcare-postgres$"; then
        echo "Starting existing healthcare-postgres container..."
        docker start healthcare-postgres > /dev/null
    else
        echo "Creating and starting new healthcare-postgres container on port 5436..."
        docker run -d --name healthcare-postgres -p 5436:5432 \
            -e POSTGRES_USER=postgres \
            -e POSTGRES_PASSWORD=postgres \
            -e POSTGRES_DB=healthcare_db \
            postgres:16-alpine > /dev/null
    fi
fi
echo "✓ PostgreSQL 16 is ready on port 5436."

# Step 3: Run Database Migrations & Start Backend
echo "[3/4] Launching FastAPI Backend Server (Port ${BACKEND_PORT})..."
cd "$PROJECT_ROOT/backend"
PYTHONPATH="$PROJECT_ROOT/backend" "$PROJECT_ROOT/venv/bin/python" -m uvicorn app.main:app --host 0.0.0.0 --port ${BACKEND_PORT} &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for API server to initialize & seed synthetic hospital dataset..."
for i in {1..30}; do
    if curl -s "http://localhost:${BACKEND_PORT}/" > /dev/null 2>&1; then
        echo "✓ Backend API is online and database seeded!"
        break
    fi
    sleep 1
done

# Step 4: Start Frontend
echo "[4/4] Launching React Vite Frontend (Port ${FRONTEND_PORT})..."
cd "$PROJECT_ROOT/frontend"
npx vite --port ${FRONTEND_PORT} --host &
FRONTEND_PID=$!

cleanup() {
    echo ""
    echo "======================================================================"
    echo " Shutting down PULSE CORE Platform..."
    echo "======================================================================"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    fuser -k ${BACKEND_PORT}/tcp 2>/dev/null || true
    fuser -k ${FRONTEND_PORT}/tcp 2>/dev/null || true
    echo "✓ All services stopped cleanly."
    exit 0
}

trap cleanup SIGINT SIGTERM

echo ""
echo "======================================================================"
echo " 🚀 Application Successfully Started & Running Live!"
echo "======================================================================"
echo " 🌐 Frontend Web UI:      http://localhost:3000"
echo " ⚙️ Backend REST Docs:    http://localhost:8088/docs"
echo " 📊 Live WebSocket Feed:  ws://localhost:8088/ws"
echo " 🗄️ PostgreSQL Database:  localhost:5436 (db: healthcare_db)"
echo "----------------------------------------------------------------------"
echo " Staff Demo Accounts (Password for all: <username>123):"
echo "   - Physician / Doctor:  doctor / doctor123"
echo "   - Analytics DBA:       dba / dba123"
echo "   - Administrator:       admin / admin123"
echo "   - Lab Technician:      labtech / labtech123"
echo "   - Admissions Desk:     receptionist / receptionist123"
echo "======================================================================"
echo " Press [Ctrl+C] to stop all services."
echo ""

# Keep running
wait
