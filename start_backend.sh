#!/bin/bash
echo "Starting Smart Healthcare Analytics Backend API Server..."
cd "$(dirname "$0")"
source ./venv/bin/activate
export PYTHONPATH=$PYTHONPATH:$(pwd)/backend
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
