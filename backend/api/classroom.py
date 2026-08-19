from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from typing import Dict, List
from database import get_db
from models import Student, InterventionLog

router = APIRouter(tags=["classroom"])

class ConnectionManager:
    def __init__(self):

        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, classroom_id: str):
        await websocket.accept()
        if classroom_id not in self.active_connections:
            self.active_connections[classroom_id] = []
        self.active_connections[classroom_id].append(websocket)

    def disconnect(self, websocket: WebSocket, classroom_id: str):
        if classroom_id in self.active_connections:
            if websocket in self.active_connections[classroom_id]:
                self.active_connections[classroom_id].remove(websocket)
            if not self.active_connections[classroom_id]:
                del self.active_connections[classroom_id]

    async def broadcast(self, classroom_id: str, message: dict):
        if classroom_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[classroom_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead_connections.append(connection)
            for dead in dead_connections:
                self.disconnect(dead, classroom_id)

ws_manager = ConnectionManager()

@router.get("/api/classroom/{classroom_id}/students")
def get_classroom_students(classroom_id: str, db: Session = Depends(get_db)):
    students = db.query(Student).filter(Student.classroom_id == classroom_id).all()
    result = []
    for s in students:
        last_log = db.query(InterventionLog).filter(
            InterventionLog.student_id == s.id
        ).order_by(InterventionLog.timestamp.desc()).first()
        result.append({
            "id": s.id,
            "name": s.name,
            "disorder_profile": s.disorder_profile,
            "status": "Stable",
            "lastIntervention": last_log.intervention_type if last_log else "None",
            "currentFriction": 0.0,
        })
    return result

@router.websocket("/ws/classroom/{classroom_id}")
async def websocket_endpoint(websocket: WebSocket, classroom_id: str):
    await ws_manager.connect(websocket, classroom_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, classroom_id)
