"""
DesktopCommander MCP client for agentic-testing.

This provides MCP-to-MCP integration where agentic-testing delegates
actual command execution to DesktopCommander.
"""

import os
from typing import Any


DESKTOP_COMMANDER_URL = os.environ.get(
    "DESKTOP_COMMANDER_URL", "http://localhost:8080/execute"
)


async def execute_via_desktop_commander_mcp(
    command: list[str], working_dir: str | None = None, timeout: int = 300
) -> dict[str, Any]:
    """
    Execute command via DesktopCommander MCP.

    This requires DesktopCommander to be running as an MCP server
    and accessible. If not available, falls back to direct execution.
    """
    # Check if we should use DesktopCommander MCP
    use_mcp = os.environ.get("USE_DESKTOP_COMMANDER_MCP", "false").lower() == "true"

    if not use_mcp:
        # Fallback to direct execution with security
        from .secure_command_adapter import execute_command_secure

        return await execute_command_secure(command, working_dir, timeout)

    # MCP-to-MCP execution via HTTP bridge
    try:
        import httpx

        # Call DesktopCommander HTTP bridge
        response = await httpx.AsyncClient(timeout=timeout).post(
            DESKTOP_COMMANDER_URL,
            json={
                "command": command,
                "working_dir": working_dir or os.getcwd(),
                "timeout": timeout,
                "source": "agentic-testing-mcp",
            },
        )

        if response.status_code == 200:
            result = response.json()
            return {
                "stdout": result.get("stdout", ""),
                "stderr": result.get("stderr", ""),
                "returncode": result.get("returncode", 0),
                "executed_by": "agentic-testing-via-desktop-commander",
            }
        else:
            # Fallback
            from .secure_command_adapter import execute_command_secure

            return await execute_command_secure(command, working_dir, timeout)

    except Exception:
        # Fallback on any error
        from .secure_command_adapter import execute_command_secure

        return await execute_command_secure(command, working_dir, timeout)


async def is_desktop_commander_available() -> bool:
    """Check if DesktopCommander MCP is available."""
    try:
        import httpx

        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.post(
                DESKTOP_COMMANDER_URL, json={"command": ["echo", "test"], "timeout": 5}
            )
            return response.status_code == 200
    except Exception:
        return False
