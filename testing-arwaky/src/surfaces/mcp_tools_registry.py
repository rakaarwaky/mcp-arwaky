"""
MCP Surface — Agentic Testing (Hybrid Architecture).

Layer 1 Discovery: Every tool description lists available CLI actions.
Layer 3 Discovery: `list_commands` runs `--help` on-demand for dynamic enumeration.
Full CLI reference lives in SKILL.md (Layer 2).
"""

import os
import json
from pydantic import Field
from mcp.server.fastmcp import FastMCP
from ..agent.dependency_injection_container import Container
from ..infrastructure.secure_command_adapter import is_command_safe
from ..infrastructure.unix_socket_client import (
    execute_via_unix_socket,
    is_socket_available,
    get_socket_path,
)


def _get_execution_mode() -> str:
    """Determine which execution mode to use."""
    if os.environ.get("USE_UNIX_SOCKET", "").lower() == "true":
        return "unix_socket"
    elif os.environ.get("USE_DESKTOP_COMMANDER_MCP", "").lower() == "true":
        return "http"
    else:
        return "direct"


def register_tools(mcp: FastMCP, container: Container) -> None:
    """Bridges Capabilities to the MCP Surface (Domain 5)."""

    # ─── Core Tool 1: execute_command ─────────────────────────────────────────
    # This is the main gateway to all CLI commands via DesktopCommander

    @mcp.tool()
    async def execute_command(
        action: str = Field(
            ...,
            description="Command to execute: run, analyze, audit, generate, generate-data, migrate, find-slow, mock-generate, workflow, version, init",
        ),
        args: dict | None = Field(
            default=None, description="Arguments for the command as JSON string or dict"
        ),
    ) -> str:
        """
        Execute ANY agentic-test CLI command. Core of hybrid architecture.

        This tool delegates to DesktopCommander for security, audit logging, and validation.

        Available actions:
        - run: Run tests with self-healing (args: test_path, max_retries, heal, format)
        - analyze: AST analysis (args: target_file, format)
        - audit: Coverage audit (args: target_dir, threshold, format)
        - generate: Generate boilerplate tests (args: source_file, output)
        - generate-data: Generate synthetic data (args: data_type, count, format)
        - migrate: Migrate unittest to pytest (args: test_path, backup)
        - find-slow: Find slow tests (args: target_dir, threshold, top)
        - mock-generate: Generate mock from signature (args: function_signature, output)
        - workflow: Run pre-defined workflow (args: workflow, target, threshold, max_retries)
        - version: Show version
        - init: Initialize config (args: config_path)

        Example: {"action": "run", "args": {"test_path": "tests/test_parser.py", "heal": True}}
        """
        # Build command
        import sys
        cmd = [sys.executable, "-m", "src.surfaces.cli_main_entry", action]

        if args:
            if action == "run":
                if args.get("test_path"):
                    cmd.append(args["test_path"])
                if args.get("heal"):
                    cmd.append("--heal")
                if args.get("max_retries"):
                    cmd.extend(["--max-retries", str(args["max_retries"])])
                if args.get("format"):
                    cmd.extend(["--format", args["format"]])
            elif action == "analyze":
                if args.get("target_file"):
                    cmd.append(args["target_file"])
                if args.get("format"):
                    cmd.extend(["--format", args["format"]])
            elif action == "audit":
                if args.get("target_dir"):
                    cmd.append(args["target_dir"])
                if args.get("threshold"):
                    cmd.extend(["--threshold", str(args["threshold"])])
                if args.get("format"):
                    cmd.extend(["--format", args["format"]])
            elif action == "generate":
                if args.get("source_file"):
                    cmd.append(args["source_file"])
                if args.get("output"):
                    cmd.extend(["--output", args["output"]])
            elif action == "generate-data":
                if args.get("data_type"):
                    cmd.append(args["data_type"])
                if args.get("count"):
                    cmd.extend(["--count", str(args["count"])])
                if args.get("format"):
                    cmd.extend(["--format", args["format"]])
            elif action == "migrate":
                if args.get("test_path"):
                    cmd.append(args["test_path"])
                if args.get("backup"):
                    cmd.append("--backup")
            elif action == "find-slow":
                if args.get("target_dir"):
                    cmd.append(args["target_dir"])
                if args.get("threshold"):
                    cmd.extend(["--threshold", str(args["threshold"])])
                if args.get("top"):
                    cmd.extend(["--top", str(args["top"])])
            elif action == "mock-generate":
                if args.get("function_signature"):
                    cmd.append(args["function_signature"])
                if args.get("output"):
                    cmd.extend(["--output", args["output"]])
            elif action == "workflow":
                if args.get("workflow"):
                    cmd.append(args["workflow"])
                if args.get("target"):
                    cmd.append(args["target"])
                if args.get("threshold"):
                    cmd.extend(["--threshold", str(args["threshold"])])
                if args.get("max_retries"):
                    cmd.extend(["--max-retries", str(args["max_retries"])])
            elif action == "init":
                if args.get("config_path"):
                    cmd.append(args["config_path"])

        # Security validation before execution
        safe, reason = is_command_safe(cmd)
        if not safe:
            return json.dumps({
                "command": " ".join(cmd),
                "stdout": "",
                "stderr": f"Security blocked: {reason}",
                "returncode": 1,
                "executed_by": "agentic-testing-mcp",
                "blocked": True,
            }, indent=2)

        mode = _get_execution_mode()
        job_id = f"job_{len(container.job_registry) + 1}"
        
        if mode == "unix_socket":
            # Execute via secure Unix socket
            result = await execute_via_unix_socket(cmd, timeout=300)
        else:
            # Direct execution with job tracking
            from ..infrastructure.secure_command_adapter import execute_command_async
            import asyncio
            
            proc, result = await execute_command_async(cmd, timeout=300)
            if proc:
                container.job_registry[job_id] = proc
                try:
                    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=300)
                    result["stdout"] = stdout.decode()
                    result["stderr"] = stderr.decode()
                    result["returncode"] = proc.returncode
                    result["job_id"] = job_id
                except asyncio.TimeoutError:
                    proc.kill()
                    await proc.wait()
                    result["stdout"] = ""
                    result["stderr"] = "Command timed out after 300s"
                    result["returncode"] = 124
                finally:
                    if job_id in container.job_registry:
                        del container.job_registry[job_id]
            
        return json.dumps(
            {
                "command": " ".join(cmd),
                "stdout": result.get("stdout", ""),
                "stderr": result.get("stderr", ""),
                "returncode": result.get("returncode", 1),
                "executed_by": "agentic-testing-mcp",
                "job_id": job_id if mode != "unix_socket" else None
            },
            indent=2,
        )

    # ─── Core Tool 2: list_commands ────────────────────────────────────────────

    @mcp.tool()
    async def list_commands(
        domain: str | None = Field(
            default=None,
            description="Filter by domain: test, data, migration, performance, workflow, utility",
        ),
    ) -> str:
        """
        List ALL available CLI commands for the `agentic-test` tool.

        Returns the full --help output so the agent can discover commands
        without consuming extra MCP tool slots.

        CLI entry: `agentic-test --help`

        Domain filters:
        - test: run, analyze, audit, generate
        - data: generate-data
        - migration: migrate
        - performance: find-slow, mock-generate
        - workflow: workflow
        - utility: version, init
        """
        import sys
        cmd = [sys.executable, "-m", "src.surfaces.cli_main_entry", "--help"]
        result = await execute_via_unix_socket(cmd, timeout=30)

        output = result.get("stdout", "") or result.get("stderr", "")

        if domain and output:
            # Filter output by domain
            domain_keywords = {
                "test": ["run", "analyze", "audit", "generate"],
                "data": ["generate-data"],
                "migration": ["migrate"],
                "performance": ["find-slow", "mock-generate"],
                "workflow": ["workflow"],
                "utility": ["version", "init"],
            }
            if isinstance(domain, str) and domain.lower() in domain_keywords:
                lines = output.split("\n")
                filtered = []
                for line in lines:
                    if any(
                        kw in line.lower() for kw in domain_keywords[domain.lower()]
                    ):
                        filtered.append(line)
                return (
                    "\n".join(filtered)
                    if filtered
                    else f"No commands found for domain: {domain}"
                )

        if not output.strip():
            return (
                "Available `agentic-test` commands:\n"
                "  run       <test_path> [--max-retries N] [--heal] [--format json|text]\n"
                "  analyze   <target_file> [--format json|text]\n"
                "  audit     <target_dir> [--threshold N] [--format json|text]\n"
                "  generate  <source_file> [--output PATH]\n"
                "  generate-data <strings|numbers|json|dates|emails|all> [--count N] [--format]\n"
                "  migrate   <test_file> [--backup]\n"
                "  find-slow <target_dir> [--threshold N] [--top N]\n"
                '  mock-generate "<function_signature>" [--output PATH]\n'
                "  workflow <test-and-fix|coverage-gate|full-suite> <target>\n"
                "  version\n"
                "  init <config_path>\n\n"
                "Tip: Run `agentic-test <command> --help` for details."
            )
        return output

    # ─── Core Tool 3: check_status ─────────────────────────────────────────────

    @mcp.tool()
    async def check_status(
        job_id: str | None = Field(
            default=None, description="Job ID to check (returns latest if not provided)"
        ),
    ) -> str:
        """
        Check status of agentic-testing server and execution mode.

        Returns server health, execution mode, and socket availability.
        """
        execution_mode = _get_execution_mode()
        socket_available = await is_socket_available()

        return json.dumps(
            {
                "status": "ready",
                "installed": True,
                "security_enabled": True,
                "execution_mode": execution_mode,
                "unix_socket_available": socket_available,
                "unix_socket_path": get_socket_path(),
                "version": "1.1.1",
            },
            indent=2,
        )

    # ─── Core Tool 4: read_skill_context ────────────────────────────────────────

    @mcp.tool()
    async def read_skill_context(
        section: str | None = Field(
            default=None,
            description="Section to read: directives, mcp-tools, cli-commands, workflows, architecture, token-efficiency",
        ),
    ) -> str:
        """
        Read SKILL.md documentation sections for agentic-testing.

        This provides context about the tool without needing to load the full SKILL.md.

        Sections:
        - directives: Agentic directives and rules
        - mcp-tools: MCP tool documentation
        - cli-commands: CLI command reference
        - workflows: Common workflow examples
        - architecture: Architecture patterns
        - token-efficiency: Token optimization info
        """
        sections = {
            "directives": """
# Agentic Directives

## 1. The 100% Coverage Gate
Every piece of code in `src/` is a cost center unless verified. You MUST achieve 100% coverage for all "Living Stock" (reachable code).
- Tool: Use `test_audit` to identify gaps.
- Action: If coverage < 100%, generate missing tests immediately.

## 2. Autonomous Healing Workflow
Do not stop at the first failure. Follow the recovery loop:
1. **Analyze**: Use `test_analyze` to understand why the code failed.
2. **Heal**: Run `test_run` with `max_retries=3`. The heuristic healer handles `ImportError`, `AttributeError`, and `AssertionError`.
3. **Verify**: Run `test_run` again with 0 retries to confirm the fix is permanent.

## 3. Edge Case Synthesis
Never rely solely on static fixtures.
- Use `test_generate_data` to stress-test your logic with emails, empty strings, and boundary numbers.
""",
            "mcp-tools": """
# MCP Tools (5 Core + Hybrid)

This skill implements the **MCP+CLI+SKILL hybrid pattern** for optimal token efficiency:
- **5 Core MCP Tools** (under Gemini's 100 tool limit)
- **11+ CLI Commands** (unlimited, not counted against limit)
- **SKILL.md Context** (this file, one-time load)

## Core Tools:
1. `execute_command` - Execute any CLI command
2. `list_commands` - List available commands
3. `check_status` - Check server status
4. `read_skill_context` - Read documentation
5. (placeholder for future)
""",
            "cli-commands": """
# CLI Commands (11+ commands)

## Test Commands
- `agentic-test run <test_path>` - Run tests with optional self-healing
- `agentic-test analyze <target_file>` - AST analysis of source file
- `agentic-test audit <target_dir>` - Coverage audit
- `agentic-test generate <source_file>` - Generate boilerplate tests

## Test Data Commands
- `agentic-test generate-data <type>` - Generate synthetic test data

## Migration Commands
- `agentic-test migrate <test_file>` - Migrate unittest to pytest

## Performance Commands
- `agentic-test find-slow <target_dir>` - Find slow tests
- `agentic-test mock-generate "<signature>"` - Generate mock from signature

## Workflow Commands
- `agentic-test workflow <workflow> <target>` - Run pre-defined workflows

## Utility Commands
- `agentic-test version` - Show version
- `agentic-test init <config_path>` - Initialize configuration
""",
            "workflows": """
# Common Workflows

## Pre-Commit Quality Gate
```bash
agentic-test run tests/ --heal --max-retries 3
agentic-test audit ./src --threshold 80
agentic-test generate src/uncovered_module.py
```

## Test-Driven Development (TDD)
```bash
agentic-test analyze src/new_feature.py
agentic-test generate src/new_feature.py
agentic-test run tests/test_new_feature.py --heal
```

## Legacy Test Migration
```bash
agentic-test migrate tests/old_test.py --backup
agentic-test run tests/old_test.py --heal
```
""",
            "architecture": """
# Architecture

This repository uses a **Clean 5-Domain Architecture**:
1. **Agent**: Lifecycle, orchestration, DI container
2. **Capabilities**: Thinking logic — test execution, healing, analysis
3. **Infrastructure**: Adapters — pytest runner, file system, transports
4. **Surfaces**: Interfaces — CLI (Click), MCP (FastMCP)
5. **Taxonomy**: Value objects, interfaces, models

## Hybrid Architecture Pattern
```
AI Agent → 5 Core MCP Tools → 11+ CLI Commands → SKILL.md Context
```
""",
        }

        if isinstance(section, str) and section.lower() in sections:
            return sections[section.lower()]
        elif section:
            return f"Section '{section}' not found. Available: {', '.join(sections.keys())}"
        else:
            return (
                "Use `section` parameter to specify which part to read. Available: "
                + ", ".join(sections.keys())
            )

    # ─── Core Tool 5: cancel_job ───────────────────────────────────────────────

    @mcp.tool()
    async def cancel_job(
        job_id: str = Field(..., description="Job ID to cancel"),
    ) -> str:
        """
        Cancel a running test job.
        """
        if job_id in container.job_registry:
            proc = container.job_registry[job_id]
            try:
                proc.kill()
                # We don't wait here to avoid blocking the cancel tool call
                # The execute_command task will handle cleanup
                return json.dumps(
                    {
                        "status": "cancelled",
                        "message": f"Job {job_id} has been terminated.",
                        "job_id": job_id,
                    },
                    indent=2,
                )
            except Exception as e:
                return json.dumps(
                    {
                        "status": "error",
                        "message": f"Failed to cancel job {job_id}: {str(e)}",
                        "job_id": job_id,
                    },
                    indent=2,
                )
        else:
            return json.dumps(
                {
                    "status": "not_found",
                    "message": f"Job {job_id} not found or already completed.",
                    "job_id": job_id,
                },
                indent=2,
            )
