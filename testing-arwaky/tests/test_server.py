import pytest
from mcp.server.fastmcp import FastMCP


@pytest.mark.asyncio
async def test_mcp_initialization():
    """Test that the FastMCP server can be initialized."""
    mcp = FastMCP("agentic-testing-test")
    assert mcp.name == "agentic-testing-test"


@pytest.mark.asyncio
async def test_tool_registration():
    """Test that tools are registered correctly."""
    from src.surfaces.mcp_tools_registry import register_tools
    from src.agent.dependency_injection_container import Container

    mcp = FastMCP("agentic-testing-test")

    # Use real container or mock
    container = Container()

    register_tools(mcp, container)
    tools = await mcp.list_tools()
    tool_names = [t.name for t in tools]
    assert "execute_command" in tool_names
    assert "list_commands" in tool_names
    assert "check_status" in tool_names
    assert "read_skill_context" in tool_names
    assert "cancel_job" in tool_names
