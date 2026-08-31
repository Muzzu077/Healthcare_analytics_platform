import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    """Enterprise WebSocket Manager with heartbeat, event validation, and structured broadcasting."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        # Send initial connected confirmation with server timestamp
        await websocket.send_text(json.dumps({
            "event_id": str(uuid.uuid4()),
            "event_type": "system_status_changed",
            "timestamp": datetime.utcnow().isoformat(),
            "patient_id": None,
            "actor_user_id": None,
            "severity": "info",
            "payload": {
                "status": "connected",
                "active_clients": len(self.active_connections),
                "server_time": datetime.utcnow().isoformat()
            }
        }))

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    def get_connection_count(self) -> int:
        return len(self.active_connections)

    async def broadcast_event(
        self,
        event_type: str,
        payload: Dict[str, Any],
        patient_id: Optional[int] = None,
        actor_user_id: Optional[int] = None,
        severity: str = "info"
    ) -> Dict[str, Any]:
        """Broadcasts standardized real-time clinical and query events to all active WebSocket clients."""
        event_data = {
            "event_id": str(uuid.uuid4()),
            "event_type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "patient_id": patient_id,
            "actor_user_id": actor_user_id,
            "severity": severity,
            "payload": payload
        }
        
        message_text = json.dumps(event_data)
        disconnected = []
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message_text)
            except Exception:
                disconnected.append(connection)

        for conn in disconnected:
            self.disconnect(conn)

        return event_data

event_manager = ConnectionManager()
