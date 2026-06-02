"""Tests for Unix socket client."""
import json
import socket
import pytest
from unittest.mock import patch, MagicMock
from src.infrastructure.unix_socket_client import (
    execute_via_unix_socket,
    is_socket_available,
    get_socket_path,
    _sync_socket_call,
    _send_command,
)


class TestSocketHelpers:
    def test_get_socket_path_default(self):
        with patch.dict("os.environ", {}, clear=True):
            path = get_socket_path()
            assert path == "/tmp/dc.sock"

    def test_get_socket_path_env_override(self):
        with patch.dict("os.environ", {"DC_SOCKET_PATH": "/custom.sock"}):
            path = get_socket_path()
            assert path == "/custom.sock"

    @pytest.mark.asyncio
    async def test_socket_not_available(self):
        with patch.dict("os.environ", {}, clear=True):
            with patch("os.path.exists", return_value=False):
                available = await is_socket_available()
                assert available is False

    @pytest.mark.asyncio
    async def test_socket_available(self):
        with patch.dict("os.environ", {}, clear=True):
            with patch("os.path.exists", return_value=True):
                available = await is_socket_available()
                assert available is True


class TestExecuteViaUnixSocket:
    @pytest.mark.asyncio
    async def test_socket_not_found(self):
        with patch("os.path.exists", return_value=False):
            result = await execute_via_unix_socket(["echo", "test"])
            assert result["returncode"] == 1
            assert "not found" in result["stderr"].lower()

    @pytest.mark.asyncio
    async def test_command_timeout(self):
        with patch("os.path.exists", return_value=True):
            with patch("asyncio.wait_for", side_effect=TimeoutError("timeout")):
                result = await execute_via_unix_socket(["echo", "test"], timeout=1)
                assert result["returncode"] == 124
                assert "timed out" in result["stderr"]

    @pytest.mark.asyncio
    async def test_socket_error(self):
        async def raise_error(coro, *args, **kwargs):
            # Properly close the coroutine to suppress warnings
            try:
                coro.close()
            except Exception:
                pass
            raise Exception("connection error")

        with patch("os.path.exists", return_value=True):
            with patch("asyncio.wait_for", new=raise_error):
                import warnings
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore", RuntimeWarning)
                    result = await execute_via_unix_socket(["echo", "test"])
                assert result["returncode"] == 1
                assert "error" in result["stderr"].lower()

    @pytest.mark.asyncio
    async def test_execute_success(self):
        expected = {"stdout": "hello", "stderr": "", "returncode": 0}
        with patch("os.path.exists", return_value=True):
            with patch("asyncio.wait_for", return_value=expected):
                result = await execute_via_unix_socket(["echo", "hello"])
                assert result["returncode"] == 0
                assert result["stdout"] == "hello"


class TestSyncSocketCall:
    def test_sync_socket_call_success(self):
        response = {"stdout": "ok", "stderr": "", "returncode": 0}
        response_bytes = json.dumps(response).encode()

        mock_socket = MagicMock()
        mock_socket.recv.side_effect = [response_bytes, b""]

        with patch("socket.socket", return_value=mock_socket):
            result = _sync_socket_call("/tmp/test.sock", {"command": ["echo"]})
            assert result["returncode"] == 0
            assert result["stdout"] == "ok"
            mock_socket.connect.assert_called_once_with("/tmp/test.sock")
            mock_socket.close.assert_called_once()

    def test_sync_socket_call_empty_response(self):
        mock_socket = MagicMock()
        mock_socket.recv.return_value = b""
        
        with patch("socket.socket", return_value=mock_socket):
            result = _sync_socket_call("/tmp/test.sock", {"command": ["echo"]})
            assert result["returncode"] == 1
            assert "No response" in result["stderr"]

    def test_sync_socket_call_connection_error(self):
        with patch("socket.socket") as mock_cls:
            mock_instance = MagicMock()
            mock_instance.connect.side_effect = socket.error("Connection refused")
            mock_cls.return_value = mock_instance
            
            result = _sync_socket_call("/tmp/bad.sock", {"command": ["echo"]})
            assert result["returncode"] == 1
            assert "Connection refused" in result["stderr"]

    def test_sync_socket_call_partial_json(self):
        response = {"stdout": "data", "stderr": "", "returncode": 0}
        full_bytes = json.dumps(response).encode()
        # Split into chunks to test partial read
        chunk1 = full_bytes[:10]
        chunk2 = full_bytes[10:]
        
        mock_socket = MagicMock()
        mock_socket.recv.side_effect = [chunk1, chunk2, b""]
        
        with patch("socket.socket", return_value=mock_socket):
            result = _sync_socket_call("/tmp/test.sock", {"command": ["echo"]})
            assert result["returncode"] == 0
            assert result["stdout"] == "data"


class TestSendCommand:
    @pytest.mark.asyncio
    async def test_send_command_builds_request(self):
        """Test _send_command builds request and calls _sync_socket_call (lines 62-70)."""
        expected = {"stdout": "hello", "stderr": "", "returncode": 0}
        with patch("src.infrastructure.unix_socket_client._sync_socket_call", return_value=expected) as mock_sync:
            result = await _send_command("/tmp/test.sock", ["echo", "hello"], "/tmp")
            assert result["stdout"] == "hello"
            mock_sync.assert_called_once()
            call_args = mock_sync.call_args
            assert call_args[0][0] == "/tmp/test.sock"
            request = call_args[0][1]
            assert request["command"] == ["echo", "hello"]
            assert request["working_dir"] == "/tmp"
