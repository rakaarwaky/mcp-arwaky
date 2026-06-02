"""
Unix Socket client for agentic-testing to communicate with DesktopCommander.

Provides low-latency IPC via Unix domain sockets.
"""

import os
import socket
import json
import asyncio
from typing import Any


DEFAULT_SOCKET_PATH = os.environ.get("DC_SOCKET_PATH", "/tmp/dc.sock")


async def execute_via_unix_socket(
    command: list[str], working_dir: str | None = None, timeout: int = 30
) -> dict[str, Any]:
    """
    Execute command via Unix Socket to DesktopCommander.

    Low-latency IPC without port conflicts.
    """
    socket_path = os.environ.get("DC_SOCKET_PATH", DEFAULT_SOCKET_PATH)

    if not os.path.exists(socket_path):
        return {
            "stdout": "",
            "stderr": f"Unix socket not found: {socket_path}. Is DesktopCommander running with --socket-mode?",
            "returncode": 1,
            "executed_by": "agentic-testing-unix-socket",
            "error": "socket_not_found",
        }

    try:
        result = await asyncio.wait_for(
            _send_command(socket_path, command, working_dir), timeout=timeout
        )
        return result
    except asyncio.TimeoutError:
        return {
            "stdout": "",
            "stderr": f"Command timed out after {timeout}s",
            "returncode": 124,
            "executed_by": "agentic-testing-unix-socket",
        }
    except Exception as e:
        return {
            "stdout": "",
            "stderr": f"Unix socket error: {str(e)}",
            "returncode": 1,
            "executed_by": "agentic-testing-unix-socket",
        }


async def _send_command(
    socket_path: str, command: list[str], working_dir: str | None = None
) -> dict[str, Any]:
    """Send command via Unix socket."""

    request = {
        "command": command,
        "working_dir": working_dir or os.getcwd(),
        "timeout": 30,
    }

    # Run in thread to avoid blocking
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _sync_socket_call, socket_path, request)


def _sync_socket_call(socket_path: str, request: dict) -> dict[str, Any]:
    """Synchronous Unix socket call."""
    try:
        client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        client.settimeout(30)

        try:
            client.connect(socket_path)
            client.sendall((json.dumps(request) + "\n").encode())

            # Read response
            data = b""
            while True:
                chunk = client.recv(4096)
                if not chunk:
                    break
                data += chunk
                # Try to parse to check if complete
                try:
                    json.loads(data.decode())
                    break
                except json.JSONDecodeError:
                    continue

            if data:
                return json.loads(data.decode())
            else:
                return {
                    "stdout": "",
                    "stderr": "No response from server",
                    "returncode": 1,
                }
        finally:
            client.close()

    except socket.error as e:
        return {
            "stdout": "",
            "stderr": f"Socket connection error: {str(e)}",
            "returncode": 1,
            "executed_by": "agentic-testing-unix-socket",
        }


async def is_socket_available() -> bool:
    """Check if Unix socket is available."""
    socket_path = os.environ.get("DC_SOCKET_PATH", DEFAULT_SOCKET_PATH)
    return os.path.exists(socket_path)


def get_socket_path() -> str:
    """Get current socket path."""
    return os.environ.get("DC_SOCKET_PATH", DEFAULT_SOCKET_PATH)
