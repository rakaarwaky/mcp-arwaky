---
name: agentic-testing
description: MCP server for autonomous test generation and self-healing — FOR AI AGENTS.
version: 1.1.0
---
# Agentic Testing Skill

> **This SKILL is designed FOR AI AGENTS.**
>
> Humans: use CLI `agentic-test` instead.

Autonomous test engine with self-healing capabilities. Built specifically for AI agents to:
- Generate tests autonomously
- Self-heal broken tests
- Audit code coverage
- Create synthetic test data

## Why AI Agents Use agentic-testing

| Feature                | Benefit for Agent                          |
| ---------------------- | ------------------------------------------ |
| **5 MCP Tools**  | Complete control via execute_command       |
| **Self-Healing** | Auto-fix broken tests without intervention |
| **Coverage Gate** | Ensure coverage meets thresholds           |
| **Data Gen**     | Create edge-case test data automatically   |
| **AST Analysis** | Understand code structure intelligently    |

## Install

```bash
pip install -e /path/to/agentic-testing
```

## MCP Tools (5 tools)

### `execute_command(action: str, args: dict | None)`

Execute any CLI command. This is the primary tool.

```json
{"action": "run", "args": {"test_path": "tests/test_parser.py", "heal": true, "max_retries": 3}}
{"action": "analyze", "args": {"target_file": "src/my_module.py"}}
{"action": "audit", "args": {"target_dir": "./src", "threshold": 80}}
{"action": "generate", "args": {"source_file": "src/my_module.py"}}
{"action": "generate-data", "args": {"data_type": "emails", "count": 10}}
{"action": "migrate", "args": {"test_path": "tests/old_test.py", "backup": true}}
{"action": "workflow", "args": {"workflow": "test-and-fix", "target": "tests/"}}
{"action": "governance", "args": {"target_dir": "."}}
{"action": "version"}
{"action": "init", "args": {"config_path": "config.json"}}
```

### `list_commands(domain: str | None)`

List all available CLI commands with descriptions.

```json
{ "domain": "test" }
```

Domains: `test`, `data`, `migration`, `performance`, `workflow`, `utility`

### `read_skill_context(section: str | None)`

Read SKILL.md documentation sections.

```json
{ "section": "workflows" }
```

Sections: `directives`, `mcp-tools`, `cli-commands`, `workflows`, `architecture`, `token-efficiency`

### `check_status(job_id: str | None)`

Check server health, execution mode, and socket availability.

### `cancel_job(job_id: str)`

Cancel a running test job.

## Recommended Agent Workflow

```
1. list_commands()              — discover available commands
2. execute_command("analyze", {"target_file": "src/my_module.py"})  — understand code
3. execute_command("generate", {"source_file": "src/my_module.py"}) — generate tests
4. execute_command("run", {"test_path": "tests/test_my_module.py", "heal": true})  — run with healing
5. execute_command("audit", {"target_dir": "./src", "threshold": 80})  — verify coverage
```

## CLI Commands Reference

### Test Commands

| Command                                            | Description                                |
| -------------------------------------------------- | ------------------------------------------ |
| `agentic-test run <path> [--heal] [--max-retries N]` | Run tests with self-healing            |
| `agentic-test analyze <file>`                    | AST analysis (classes, functions, complexity) |
| `agentic-test audit <dir> [--threshold N]`       | Coverage audit with pass/fail gate         |
| `agentic-test generate <file>`                   | Generate boilerplate tests from AST        |

### Data & Migration

| Command                                          | Description                            |
| ------------------------------------------------ | -------------------------------------- |
| `agentic-test generate-data <type> [--count N]` | Generate synthetic test data (strings, numbers, json, dates, emails) |
| `agentic-test migrate <file> [--backup]`        | Migrate unittest to pytest             |

### Performance & Workflow

| Command                                     | Description                          |
| ------------------------------------------- | ------------------------------------ |
| `agentic-test find-slow <dir> [--threshold N]` | Find slow tests                  |
| `agentic-test mock-generate "<signature>"`  | Generate mock from function signature |
| `agentic-test workflow <name> <target>`     | Run pre-defined workflows (test-and-fix, coverage-gate, full-suite) |

### Utility

| Command                     | Description                   |
| --------------------------- | ----------------------------- |
| `agentic-test version`    | Show version                  |
| `agentic-test init <path>`| Initialize configuration file |
| `agentic-test governance <dir>`| Architectural governance scan |

## Self-Healing Capabilities

The healer can automatically fix:

| Error Type          | Fix Strategy                                      |
| ------------------- | ------------------------------------------------- |
| **ImportError**     | Add missing `sys.path` entries                    |
| **ModuleNotFoundError** | Same as ImportError                           |
| **AttributeError**  | Detect typos using Levenshtein distance           |
| **AssertionError**  | Patch expected values with actual values          |
| **TypeError**       | Add missing positional arguments                  |
| **NameError**       | Insert common imports (`os`, `sys`, `json`, etc.) |

## Configuration

### Environment Variables

| Variable              | Default          | Description             |
| --------------------- | ---------------- | ----------------------- |
| `DC_SOCKET_PATH`    | `/tmp/dc.sock` | Unix socket for DesktopCommander |

### Config File

```json
{
  "test": {
    "default_max_retries": 3,
    "heal_by_default": true
  },
  "audit": {
    "default_threshold": 80
  },
  "generate": {
    "test_directory": "tests"
  }
}
```

## Architecture

5-domain structure:

```
src/
├── agent/              # DI container, wiring, logging
├── capabilities/       # Test execution, healing, analysis, generation
├── infrastructure/     # Pytest runner, file system, transports
├── surfaces/           # CLI (Click), MCP (FastMCP)
└── taxonomy/           # Interfaces, models, data classes
```

## Transport

Connects to DesktopCommander via Unix socket for command execution.

```
DESKTOP_COMMANDER_URL              Mode
────────────────────────────────────────────────
/tmp/dc.sock                       Unix Socket (default)
```
