import pytest
from unittest.mock import patch
from src.surfaces.mcp_server_entry import main


def test_main_execution():
    with patch("src.surfaces.mcp_server_entry.FastMCP") as mock_fastmcp:
        with patch("src.surfaces.mcp_server_entry.get_container") as mock_get_container:
            with patch("src.surfaces.mcp_server_entry.register_tools") as mock_register_tools:
                mock_instance = mock_fastmcp.return_value

                main()

                mock_fastmcp.assert_called_once_with("Agentic Testing (AES)")
                mock_get_container.assert_called_once()
                mock_register_tools.assert_called_once_with(
                    mock_instance, mock_get_container.return_value
                )
                mock_instance.run.assert_called_once()


@pytest.mark.filterwarnings("ignore::RuntimeWarning")
def test_main_block():
    import runpy
    from mcp.server.fastmcp import FastMCP

    with patch.object(FastMCP, "run"):
        with patch("src.surfaces.mcp_server_entry.register_tools"):
            with patch("src.surfaces.mcp_server_entry.get_container"):
                runpy.run_module("src.surfaces.mcp_server_entry", run_name="__main__")
                # If we reached here without error, it called main()
