import asyncio
import json
import logging
from typing import Dict
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        async with self._lock:
            self.active_connections[client_id] = websocket

    async def disconnect(self, client_id: str):
        async with self._lock:
            self.active_connections.pop(client_id, None)

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return
        data = json.dumps(message)
        dead = []
        async with self._lock:
            connections = dict(self.active_connections)
        for client_id, ws in connections.items():
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(client_id)
        for client_id in dead:
            await self.disconnect(client_id)

    async def send_to(self, client_id: str, message: dict):
        ws = self.active_connections.get(client_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                await self.disconnect(client_id)

manager = ConnectionManager()

async def broadcast_risk_update(data: dict):
    await manager.broadcast(data)
