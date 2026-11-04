"""
In-memory command/result manager for on-demand Jetson snapshot requests.

Snapshot data is temporary and is not persisted in PostgreSQL.
"""

from __future__ import annotations

import time
import uuid
from typing import Any


COMMAND_TTL_SECONDS = 120
RESULT_TTL_SECONDS = 300


class SnapshotCommandManager:
    def __init__(self):
        self._commands: dict[str, dict[str, Any]] = {}
        self._results: dict[str, dict[str, Any]] = {}

    def create_request(
        self,
        device_id: str,
        offset: int = 0,
        limit: int = 30,
    ) -> str:
        self.cleanup()

        request_id = str(uuid.uuid4())

        self._commands[device_id] = {
            "request_id": request_id,
            "device_id": device_id,
            "command": "snapshot_request",
            "offset": offset,
            "limit": limit,
            "created_at": time.time(),
        }

        return request_id

    def get_pending_command(self, device_id: str):
        self.cleanup()

        command = self._commands.get(device_id)

        if not command:
            return None

        return command

    def acknowledge_command(self, device_id: str, request_id: str) -> bool:
        command = self._commands.get(device_id)

        if not command:
            return False

        if command["request_id"] != request_id:
            return False

        self._commands.pop(device_id, None)
        return True

    def store_result(
        self,
        device_id: str,
        request_id: str,
        data: dict[str, Any],
    ) -> bool:
        self.cleanup()

        self._results[request_id] = {
            "request_id": request_id,
            "device_id": device_id,
            "data": data,
            "created_at": time.time(),
        }

        return True

    def get_result(self, request_id: str):
        self.cleanup()

        result = self._results.get(request_id)

        if not result:
            return None

        return result

    def cleanup(self):
        now = time.time()

        expired_commands = [
            device_id
            for device_id, command in self._commands.items()
            if now - command["created_at"] > COMMAND_TTL_SECONDS
        ]

        for device_id in expired_commands:
            self._commands.pop(device_id, None)

        expired_results = [
            request_id
            for request_id, result in self._results.items()
            if now - result["created_at"] > RESULT_TTL_SECONDS
        ]

        for request_id in expired_results:
            self._results.pop(request_id, None)


snapshot_commands = SnapshotCommandManager()
