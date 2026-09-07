import json
import logging
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("signaling")

class ConsultationSignalingManager:
    def __init__(self):
        # room_id -> { participant_id: {"websocket": WebSocket, "role": str, "name": str} }
        self.rooms: Dict[str, Dict[str, dict]] = {}

    async def connect(self, websocket: WebSocket, room_id: str, participant_id: str, role: str, name: str):
        await websocket.accept()
        if room_id not in self.rooms:
            self.rooms[room_id] = {}

        # Store connection
        self.rooms[room_id][participant_id] = {
            "websocket": websocket,
            "role": role,
            "name": name
        }
        logger.info(f"[Signaling] Participant {participant_id} ({role}: {name}) joined room: {room_id}")

        # Notify existing participants that a new peer joined
        for pid, client in self.rooms[room_id].items():
            if pid != participant_id:
                try:
                    await client["websocket"].send_json({
                        "type": "peer-joined",
                        "sender": participant_id,
                        "role": role,
                        "name": name,
                        "room_peers_count": len(self.rooms[room_id])
                    })
                except Exception as e:
                    logger.error(f"Error sending peer-joined message to {pid}: {e}")

        # Send current room status back to joining peer
        peer_list = [
            {"id": pid, "role": p["role"], "name": p["name"]}
            for pid, p in self.rooms[room_id].items()
            if pid != participant_id
        ]
        await websocket.send_json({
            "type": "room-state",
            "room_id": room_id,
            "peers": peer_list,
            "total_participants": len(self.rooms[room_id])
        })

        # If both Doctor and Patient are present, broadcast "ready-for-negotiation"
        roles = [p["role"] for p in self.rooms[room_id].values()]
        if "DOCTOR" in roles and "PATIENT" in roles:
            for pid, client in self.rooms[room_id].items():
                try:
                    await client["websocket"].send_json({
                        "type": "ready-for-negotiation",
                        "message": "Both parties are connected. Initializing secure WebRTC video link."
                    })
                except Exception:
                    pass

    async def disconnect(self, room_id: str, participant_id: str):
        if room_id in self.rooms and participant_id in self.rooms[room_id]:
            leaving_info = self.rooms[room_id].pop(participant_id, None)
            logger.info(f"[Signaling] Participant {participant_id} left room: {room_id}")

            # Notify remaining participants
            for pid, client in self.rooms[room_id].items():
                try:
                    await client["websocket"].send_json({
                        "type": "peer-left",
                        "sender": participant_id,
                        "role": leaving_info["role"] if leaving_info else "UNKNOWN",
                        "name": leaving_info["name"] if leaving_info else "Participant"
                    })
                except Exception:
                    pass

            if not self.rooms[room_id]:
                del self.rooms[room_id]

    async def broadcast_to_peer(self, room_id: str, sender_id: str, message: dict):
        """Relay message to the other participant in the consultation room"""
        if room_id not in self.rooms:
            return

        for pid, client in self.rooms[room_id].items():
            if pid != sender_id:
                try:
                    await client["websocket"].send_json(message)
                except Exception as e:
                    logger.error(f"[Signaling] Failed to relay to {pid}: {e}")

signaling_manager = ConsultationSignalingManager()
