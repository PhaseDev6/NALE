from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List

router = APIRouter(prefix="/ws/classroom", tags=["classroom"])

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

@router.websocket("/{classroom_id}")
async def websocket_endpoint(websocket: WebSocket, classroom_id: str):
    await ws_manager.connect(websocket, classroom_id)
    try:
        while True:

            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, classroom_id)

