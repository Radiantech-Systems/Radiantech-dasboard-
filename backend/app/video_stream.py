"""
In-memory manager for on-demand sliced-video HTTP streaming.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from typing import Any


STREAM_TTL_SECONDS = 60


@dataclass
class VideoStreamSession:
    request_id: str
    device_id: str
    path: str
    range_header: str | None = None

    queue: asyncio.Queue = field(
        default_factory=lambda: asyncio.Queue(maxsize=16)
    )

    headers_ready: asyncio.Event = field(
        default_factory=asyncio.Event
    )

    finished: asyncio.Event = field(
        default_factory=asyncio.Event
    )

    headers: dict[str, str] = field(default_factory=dict)
    status_code: int = 200
    created_at: float = field(default_factory=time.time)


class VideoStreamManager:
    def __init__(self):
        self._sessions: dict[str, VideoStreamSession] = {}
        self._commands: dict[str, dict[str, Any]] = {}

    def create_request(
        self,
        device_id: str,
        path: str,
        range_header: str | None = None,
    ) -> VideoStreamSession:

        self.cleanup()

        request_id = str(uuid.uuid4())

        session = VideoStreamSession(
            request_id=request_id,
            device_id=device_id,
            path=path,
            range_header=range_header,
        )

        self._sessions[request_id] = session

        self._commands[device_id] = {
            "request_id": request_id,
            "device_id": device_id,
            "command": "video_stream_request",
            "path": path,
            "range": range_header,
            "created_at": time.time(),
        }

        return session

    def get_pending_command(self, device_id: str):
        self.cleanup()
        return self._commands.get(device_id)

    def acknowledge_command(
        self,
        device_id: str,
        request_id: str,
    ) -> bool:

        command = self._commands.get(device_id)

        if not command:
            return False

        if command["request_id"] != request_id:
            return False

        self._commands.pop(device_id, None)
        return True

    def get_session(self, request_id: str):
        self.cleanup()
        return self._sessions.get(request_id)

    def remove_session(self, request_id: str):
        self._sessions.pop(request_id, None)

    def cleanup(self):
        now = time.time()

        expired = [
            request_id
            for request_id, session in self._sessions.items()
            if now - session.created_at > STREAM_TTL_SECONDS
        ]

        for request_id in expired:
            self._sessions.pop(request_id, None)

        expired_commands = [
            device_id
            for device_id, command in self._commands.items()
            if now - command["created_at"] > STREAM_TTL_SECONDS
        ]

        for device_id in expired_commands:
            self._commands.pop(device_id, None)


video_streams = VideoStreamManager()
