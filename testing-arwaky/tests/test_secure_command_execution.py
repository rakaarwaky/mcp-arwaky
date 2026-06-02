"""Tests for secure command adapter - execute_command_secure and additional blocked commands."""
import pytest
from unittest.mock import patch
from src.infrastructure.secure_command_adapter import (
    is_command_safe,
    execute_command_secure,
    is_server_healthy,
    BLOCKED_COMMANDS,
)


class TestIsCommandSafeAdditional:
    def test_all_blocked_commands(self):
        """Verify every command in BLOCKED_COMMANDS is detected."""
        for cmd in BLOCKED_COMMANDS:
            safe, reason = is_command_safe([cmd, "arg"])
            assert safe is False, f"Command '{cmd}' should be blocked"
            assert "blocked" in reason

    def test_path_with_basename(self):
        """Commands with full paths should be checked by basename."""
        safe, reason = is_command_safe(["/usr/bin/sudo", "ls"])
        assert safe is False
        assert "sudo" in reason.lower() or "blocked" in reason.lower()


class TestExecuteCommandSecure:
    @pytest.mark.asyncio
    async def test_blocked_command(self):
        result = await execute_command_secure(["sudo", "ls"])
        assert result["returncode"] == 1
        assert result.get("blocked") is True
        assert "Security blocked" in result["stderr"]

    @pytest.mark.asyncio
    async def test_successful_execution(self):
        result = await execute_command_secure(["echo", "hello"])
        assert result["returncode"] == 0
        assert "hello" in result["stdout"]
        assert result["executed_by"] == "agentic-testing-mcp"

    @pytest.mark.asyncio
    async def test_failing_command(self):
        result = await execute_command_secure(["false"])
        assert result["returncode"] != 0
        assert result["executed_by"] == "agentic-testing-mcp"

    @pytest.mark.asyncio
    async def test_with_working_dir(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            result = await execute_command_secure(["pwd"], working_dir=tmpdir)
            assert tmpdir in result["stdout"].strip()

    @pytest.mark.asyncio
    async def test_timeout(self):
        result = await execute_command_secure(["sleep", "10"], timeout=1)
        assert result["returncode"] == 124
        assert "timed out" in result["stderr"]

    @pytest.mark.asyncio
    async def test_generic_exception(self):
        """Test generic exception handler (lines 96-102)."""
        with patch("subprocess.run", side_effect=OSError("No such process")):
            result = await execute_command_secure(["echo", "test"])
            assert result["returncode"] == 1
            assert "Execution error" in result["stderr"]


class TestServerHealth:
    @pytest.mark.asyncio
    async def test_health(self):
        result = await is_server_healthy()
        assert result["status"] == "ready"
        assert result["version"] == "1.1.1"
