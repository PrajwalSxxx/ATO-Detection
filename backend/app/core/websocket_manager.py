"""WebSocket Connection Manager for Real-Time Admin Security Event Stream."""
from __future__ import annotations
import asyncio
import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import WebSocket, WebSocketDisconnect

from app.core.security import decode_token


class WebSocketSecurityManager:
    """Manages authenticated WebSocket connections for the Security Operations Dashboard."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop

    async def connect(self, websocket: WebSocket, token: Optional[str]) -> Optional[Dict[str, Any]]:
        """
        Authenticate and accept an incoming WebSocket connection.
        Only 'admin' and 'analyst' roles are authorized.
        Returns the decoded user payload on success, or None on rejection.
        """
        if not token:
            await websocket.close(code=1008, reason="Authentication token missing")
            return None

        # Strip 'Bearer ' if present
        if token.startswith("Bearer "):
            token = token[7:].strip()

        try:
            payload = decode_token(token)
            role = payload.get("role", "").lower()
            if role not in ("admin", "analyst"):
                await websocket.close(code=1008, reason="Insufficient privileges: admin or analyst required")
                return None

            await websocket.accept()
            self.active_connections.append(websocket)

            # Send initial connection acknowledgment
            await websocket.send_json({
                "type": "connection_established",
                "status": "connected",
                "user": payload.get("email"),
                "role": role,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "message": "Connected to real-time ITDR security event stream",
            })
            return payload
        except Exception as e:
            try:
                await websocket.close(code=1008, reason=f"Token verification failed: {e}")
            except Exception:
                pass
            return None

    def disconnect(self, websocket: WebSocket):
        """Remove a disconnected WebSocket."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_event_async(self, event_data: Dict[str, Any]):
        """Broadcast an event dictionary to all connected admin WebSockets."""
        dead_connections = []
        payload = {
            "type": "security_event",
            "event": event_data,
            "broadcast_time": datetime.now(timezone.utc).isoformat(),
        }

        for connection in list(self.active_connections):
            try:
                await connection.send_json(payload)
            except Exception:
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)

    def broadcast_security_event(self, event_data: Dict[str, Any]):
        """
        Thread-safe sync/async bridge to broadcast events from anywhere
        (including sync route handlers or background workers).
        """
        if not self.active_connections:
            return

        try:
            loop = self._loop
            if not loop or loop.is_closed():
                try:
                    loop = asyncio.get_running_loop()
                except RuntimeError:
                    loop = None

            if loop and loop.is_running():
                asyncio.run_coroutine_threadsafe(self.broadcast_event_async(event_data), loop)
            else:
                try:
                    asyncio.run(self.broadcast_event_async(event_data))
                except Exception:
                    pass
        except Exception as e:
            print(f"[WebSocketManager] Broadcast note: {e}")


# Singleton instance
ws_manager = WebSocketSecurityManager()
