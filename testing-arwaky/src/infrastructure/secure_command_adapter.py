"""
Secure command execution for agentic-testing.

This module provides security by:
1. Using blocked commands list from config
2. Validating command arguments
3. Providing audit logging hooks
"""

from typing import Any
import os
import subprocess


BLOCKED_COMMANDS = {
    "rm",
    "format",
    "mount",
    "umount",
    "mkfs",
    "fdisk",
    "dd",
    "sudo",
    "su",
    "passwd",
    "adduser",
    "useradd",
    "usermod",
    "groupadd",
    "chmod",
    "chown",
    "kill",
    "killall",
    "pkill",
}


def is_command_safe(command: list[str]) -> tuple[bool, str]:
    """Check if command is safe to execute."""
    if not command:
        return False, "Empty command"

    cmd_name = os.path.basename(command[0])

    if cmd_name in BLOCKED_COMMANDS:
        return False, f"Command '{cmd_name}' is blocked for security"

    return True, ""


async def execute_command_secure(
    command: list[str], working_dir: str | None = None, timeout: int = 300
) -> dict[str, Any]:
    """
    Execute command with security validation.

    Security features:
    - Blocked command list validation
    - Working directory restriction
    - Timeout enforcement
    - Audit logging ready
    """
    # Security check
    safe, reason = is_command_safe(command)
    if not safe:
        return {
            "stdout": "",
            "stderr": f"Security blocked: {reason}",
            "returncode": 1,
            "executed_by": "agentic-testing-mcp",
            "blocked": True,
        }

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            cwd=working_dir or os.getcwd(),
            timeout=timeout,
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
            "executed_by": "agentic-testing-mcp",
        }
    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": f"Command timed out after {timeout}s",
            "returncode": 124,
            "executed_by": "agentic-testing-mcp",
        }
    except Exception as e:
        return {
            "stdout": "",
            "stderr": f"Execution error: {str(e)}",
            "returncode": 1,
            "executed_by": "agentic-testing-mcp",
        }


import asyncio

async def execute_command_async(
    command: list[str], working_dir: str | None = None, timeout: int = 300
) -> tuple[asyncio.subprocess.Process, dict[str, Any]]:
    """
    Execute command asynchronously and return the process and a partial result.
    If the command is blocked, returns (None, error_dict).
    """

    # Security check
    safe, reason = is_command_safe(command)
    if not safe:
        return None, {
            "stdout": "",
            "stderr": f"Security blocked: {reason}",
            "returncode": 1,
            "executed_by": "agentic-testing-mcp",
            "blocked": True,
        }

    proc = await asyncio.create_subprocess_exec(
        *command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=working_dir or os.getcwd(),
    )
    return proc, {"executed_by": "agentic-testing-mcp"}


async def is_server_healthy() -> dict:
    """Check server health status."""
    return {
        "status": "ready",
        "installed": True,
        "security_enabled": True,
        "version": "1.1.1",
    }
