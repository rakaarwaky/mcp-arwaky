# Agentic Testing

[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP Server](https://img.shields.io/badge/MCP-Server-blue.svg)](https://modelcontextprotocol.io/)
[![AI Agent Ready](https://img.shields.io/badge/AI%20Agent-Ready-green.svg)](SKILL.md)

> Autonomous test engine with self-healing capabilities. Built for AI agents that write and maintain tests 24/7.

**For AI Agents:**
- Autonomous test generation and execution
- Self-healing test code (auto-fix failures)
- Coverage auditing and quality gating
- Synthetic test data generation

---

## Choose Your Path

| I'm a...              | Start Here               | What I'll Do                          |
| --------------------- | ------------------------ | ------------------------------------- |
| **AI Agent**          | [SKILL.md](./SKILL.md)  | Autonomous testing, self-healing      |
| **Developer**         | [Quick Start](#quick-start) | Run tests, generate tests, audit coverage |
| **Contributor**       | [Contributing](#contributing) | Add capabilities, adapters, CLI commands |

---

## Why Use Agentic Testing

### For Users

| Benefit                | Description                                        |
| ---------------------- | -------------------------------------------------- |
| **Self-Healing** | Automatically fixes broken tests                   |
| **AST Analysis** | Understands code structure to generate smart tests |
| **Coverage Audit** | Ensures test coverage meets thresholds             |
| **Data Generation** | Creates edge-case test data automatically          |
| **CI-Ready**     | Exit codes and JSON output for pipelines             |

### The Cost of NOT Using Agentic Testing

```
┌─────────────────────────────────────────────────────────────────┐
│ What you're losing right now:                                     │
├─────────────────────────────────────────────────────────────────┤
│ ❌ Hours writing boilerplate tests manually                    │
│ ❌ Brittle tests that break on minor refactors                │
│ ❌ Low coverage on edge cases                                  │
│ ❌ Test suites that drift out of sync with code               │
│ ❌ Manual test data creation for boundary conditions          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Install

### One-Liner (Linux/macOS)
```bash
curl -sSL https://raw.githubusercontent.com/rakaarwaky/agentic-testing/main/install.sh | bash
```

### One-Liner (Windows PowerShell)
```powershell
iwr https://raw.githubusercontent.com/rakaarwaky/agentic-testing/main/install.ps1 | iex
```

### Manual Install
```bash
pip install agentic-testing-mcp
```

Or with [uv](https://github.com/astral-sh/uv):
```bash
uv tool install agentic-testing
```

### Verify

```bash
agentic-test version
agentic-test --help
```

---

## Quick Start

```bash
# Run tests with self-healing
agentic-test run tests/test_parser.py --heal --max-retries 3

# Analyze source code
agentic-test analyze src/my_module.py

# Audit coverage
agentic-test audit ./src --threshold 80

# Generate boilerplate tests
agentic-test generate src/my_module.py

# Generate synthetic test data
agentic-test generate-data emails --count 10
```

---

## CLI Commands

### Test Commands

| Command                                            | Description                                |
| -------------------------------------------------- | ------------------------------------------ |
| `agentic-test run <path> [--heal] [--max-retries N]` | Run tests with optional self-healing     |
| `agentic-test analyze <file>`                    | AST analysis of source file                |
| `agentic-test audit <dir> [--threshold N]`       | Coverage audit with pass/fail gate         |
| `agentic-test generate <file>`                   | Generate boilerplate tests from AST        |

### Data & Migration

| Command                                          | Description                            |
| ------------------------------------------------ | -------------------------------------- |
| `agentic-test generate-data <type> [--count N]` | Generate synthetic test data           |
| `agentic-test migrate <file> [--backup]`        | Migrate unittest to pytest             |

### Performance & Workflow

| Command                                     | Description                          |
| ------------------------------------------- | ------------------------------------ |
| `agentic-test find-slow <dir> [--threshold N]` | Find slow tests                  |
| `agentic-test mock-generate "<signature>"`  | Generate mock from function signature |
| `agentic-test workflow <name> <target>`     | Run pre-defined workflows            |

### Utility

| Command                     | Description                   |
| --------------------------- | ----------------------------- |
| `agentic-test version`    | Show version                  |
| `agentic-test init <path>`| Initialize configuration file |
| `agentic-test governance <dir>`| Architectural governance scan |

Full list: `agentic-test --help`

---

## Architecture

5-domain structure (same as auto_linter):

```
src/
├── agent/              # Lifecycle, orchestration, DI container
├── capabilities/       # Thinking logic — test execution, healing, analysis
├── infrastructure/     # Adapters — pytest runner, file system, transports
├── surfaces/           # Interfaces — CLI (Click), MCP (FastMCP)
└── taxonomy/           # Value objects, interfaces, models
```

### Dependency Rules

```
surfaces      → capabilities       OK
surfaces      → infrastructure     OK
capabilities  → infrastructure     OK (uses interfaces from taxonomy)
infrastructure → taxonomy          OK
agent         → everything         OK (wiring layer)
```

---

## Self-Healing

Agentic Testing can automatically fix common test failures:

| Error Type          | Fix Strategy                                      |
| ------------------- | ------------------------------------------------- |
| **ImportError**     | Add missing `sys.path` entries                    |
| **AttributeError**  | Detect typos using Levenshtein distance           |
| **AssertionError**  | Patch expected values with actual values          |
| **TypeError**       | Add missing positional arguments                  |
| **NameError**       | Insert common imports (`os`, `sys`, `json`, etc.) |

Example healing loop:
```
1. Run test → FAIL (ImportError)
2. Healer detects missing sys.path
3. Applies fix, retries → PASS
```

---

## Configuration

### Environment Variables

| Variable              | Default          | Description             |
| --------------------- | ---------------- | ----------------------- |
| `DC_SOCKET_PATH`    | `/tmp/dc.sock` | Unix socket path for DesktopCommander |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on:
- Adding new test capabilities
- Adding CLI commands
- Adding MCP tools
- Testing guidelines

---

## License

MIT License. See [LICENSE](LICENSE).
