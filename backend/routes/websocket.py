import uuid
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from backend.services.websocket_manager import manager
from backend.auth.jwt_handler import decode_token

router = APIRouter()
logger = logging.getLogger(__name__)

@router.websocket("/events")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    try:
        decode_token(token)
    except Exception:
        await websocket.close(code=4001)
        return
    client_id = str(uuid.uuid4())
    await manager.connect(websocket, client_id)
    await manager.send_to(client_id, {"type": "connected", "client_id": client_id})
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await manager.send_to(client_id, {"type": "pong"})
    except WebSocketDisconnect:
        await manager.disconnect(client_id)
