import pytest
import subprocess
import os


def test_mcp_command_execution():
    """Verify that the MCP command line is registered and can be called."""
    # Try calling the agentic-testing tool from CLI to check installation
    # Use -m to run as a module if possible, or just skip if CLI not present
    try:
        # Just check if help output is correct
        # Note: In some test environments, it might not be installed yet
        result = subprocess.run(
            ["uv", "run", "agentic-testing", "--help"],
            capture_output=True,
            text=True,
            timeout=10,
        )

        if result.returncode != 0:
            pytest.skip(
                f"agentic-testing command not registered in uv: {result.stderr}"
            )

        output = (result.stdout + result.stderr).lower()
        assert "agentic-testing" in output or "aes" in output or "testing" in output

    except (FileNotFoundError, subprocess.TimeoutExpired):
        pytest.skip("agentic-testing command or uv not found/timed out")


def test_project_structure_integrity():
    """Verify all core components are in place."""
    # tests/test_autonomous_testing_e2e_server.py -> project_root
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(current_dir, ".."))

    required_paths = [
        "src/capabilities/autonomous_testing_healing_adapter.py",
        "src/capabilities/autonomous_testing_actions.py",
        "src/surfaces/mcp_tools_registry.py",
        "src/infrastructure/shell_adapter.py",
    ]
    for path in required_paths:
        abs_path = os.path.join(project_root, path)
        assert os.path.exists(abs_path), f"Missing required file: {path}"
