from mcp.server.fastmcp import FastMCP
from .mcp_tools_registry import register_tools
from ..agent.dependency_injection_container import get_container


def main() -> None:
    """Main entry point for Agentic Testing (AES Structure)."""
    mcp = FastMCP("Agentic Testing (AES)")
    container = get_container()

    # Register tools
    register_tools(mcp, container)

    # Run server
    mcp.run()


if __name__ == "__main__":
    main()
