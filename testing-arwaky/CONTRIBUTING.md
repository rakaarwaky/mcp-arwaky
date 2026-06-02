# Contributing to Agentic Testing

> **Build the Future of Autonomous Testing**

Thank you for your interest. This guide covers everything you need to start contributing effectively.

---

## Why Contribute

| Perks                    | Benefit                                          |
| ------------------------ | ------------------------------------------------ |
| **Real-world impact** | Your code helps teams ship reliable software     |
| **Portfolio builder** | Showcase pytest, AST analysis, AI healing skills |
| **Open source cred**  | Stand out in job applications                    |
| **Learning opportunity** | Study Clean Architecture in practice            |

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Architecture](#architecture)
- [How to Add a Capability](#how-to-add-a-capability)
- [How to Add an Infrastructure Adapter](#how-to-add-an-infrastructure-adapter)
- [How to Add a CLI Command](#how-to-add-a-cli-command)
- [How to Add an MCP Tool](#how-to-add-an-mcp-tool)
- [Testing](#testing)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)

---

## Prerequisites

- Python >= 3.12
- uv (recommended) or pip
- Git
- Familiarity with:
  - Python asyncio
  - Click (CLI framework)
  - mcp (MCP protocol library)
  - pytest

---

## Setup

```bash
# Clone
git clone https://github.com/rakaarwaky/agentic-testing.git
cd agentic-testing

# Install with uv (recommended)
uv sync

# Or with pip
pip install -e ".[dev]"

# Verify installation
python -m pytest tests/taxonomy/test_taxonomy.py -q
# Expected: all tests passing

# Check version
agentic-test version
```

---

## Architecture

### 6-Domain Model

```
src/
  agent/              -- Wiring layer: DI container, logging setup
  capabilities/       -- Thinking layer: test execution, healing, analysis, generation
  contract/           -- Contract layer: pure interfaces and DTOs (ABC enforced)
  infrastructure/     -- Toolbox layer: adapters, file system, transports
  surfaces/           -- Interface layer: CLI, MCP tools
  taxonomy/           -- Language layer: VOs, domain errors, events
```

### Dependency Rules

```
surfaces      → capabilities       OK
surfaces      → infrastructure     OK
capabilities  → infrastructure     OK (use taxonomy interfaces)
infrastructure → taxonomy          OK
agent         → everything         OK (wiring layer)
```

### Key Interfaces

All adapters implement interfaces defined in `src/contract/`:

| Interface          | Location                          | Purpose                        |
| ------------------ | --------------------------------- | ------------------------------ |
| `ITestRunner`      | `contract/test_runner_protocol`   | Execute tests, return results  |
| `ITestHealer`      | `contract/test_healer_protocol`   | Auto-fix test failures          |
| `ICodeAnalyzer`    | `contract/code_analyzer_protocol` | AST analysis of source files    |
| `IQualityAuditor`  | `contract/quality_auditor_protocol`| Coverage auditing             |
| `ITestGenerator`   | `contract/test_generator_protocol`| Test file generation            |
| `IFileSystem`      | `contract/file_system_port`       | File read/write operations      |
| `IGovernance`      | `contract/protocol.py`            | Architectural governance scan   |

### Data Flow

```
User/Agent
    |
    v
Surface (CLI or MCP)
    |
    v
Container (DI) → UseCase (capabilities/)
    |                 |
    v                 v
Adapter (infrastructure/) → External tool (pytest subprocess)
    |
    v
TestResult (taxonomy/)
    |
    v
Healer (if failed) → Retry
```

---

## How to Add a Capability

### 1. Create the capability file

File: `src/capabilities/<domain>_<action>.py`

Implement the relevant interface from `src.contract`:

```python
"""Capability for <description>."""
from src.contract import ICodeAnalyzer

class MyAnalyzer(ICodeAnalyzer):
    async def analyze_file(self, file_path: str) -> dict:
        # Implement analysis logic
        return {"file": file_path, "complexity": 0}
```

### 2. Wire in container

File: `src/agent/dependency_wiring_container.py`

```python
from ..capabilities.my_analyzer import MyAnalyzer

def wire_dependencies() -> dict:
    analyzer = MyAnalyzer()
    return {
        # ... existing deps ...
        "my_analyzer": analyzer,
    }
```

### 3. Add tests

File: `tests/capabilities/test_my_analyzer.py`

```python
import pytest
from capabilities.my_analyzer import MyAnalyzer

@pytest.mark.asyncio
async def test_my_analyzer(tmp_path):
    f = tmp_path / "test.py"
    f.write_text("def foo(): pass\n")
    result = await MyAnalyzer().analyze_file(str(f))
    assert result["file"] == str(f)
```

---

## How to Add an Infrastructure Adapter

### 1. Create the adapter file

File: `src/infrastructure/<name>_adapter.py`

Implement the relevant interface:

```python
"""Adapter for <service>."""
from ..contract import ITestRunner, TestResult

class CustomRunner(ITestRunner):
    async def run_test(self, test_path: str) -> TestResult:
        # Run test, parse output, return TestResult
        return TestResult(target=test_path, passed=True, output_log="OK")
```

### 2. Wire in container

File: `src/agent/dependency_wiring_container.py`

```python
from ..infrastructure.custom_runner_adapter import CustomRunner

def wire_dependencies() -> dict:
    runner = CustomRunner()
    return {
        "runner": runner,
        # ... other deps ...
    }
```

### 3. Add tests

File: `tests/infrastructure/test_custom_runner_adapter.py`

```python
import pytest
from infrastructure.custom_runner_adapter import CustomRunner

@pytest.mark.asyncio
async def test_custom_runner():
    runner = CustomRunner()
    result = await runner.run_test("tests/test_sample.py")
    assert isinstance(result.passed, bool)
```

---

## How to Add a CLI Command

### 1. Choose the right place

Commands are in `src/surfaces/cli_main_entry.py`. 

### 2. Add the command

```python
@cli.command('my-command')
@click.argument('target', type=click.Path(exists=True))
@click.pass_context
def my_command(ctx, target):
    """Description shown in --help."""
    container = ctx.obj['container']

    async def _run():
        # Use container.test_use_case or container.analyzer
        pass

    import asyncio
    asyncio.run(_run())
```

### 3. Add tests

```python
from click.testing import CliRunner
from surfaces.cli_main import cli

def test_my_command():
    runner = CliRunner()
    result = runner.invoke(cli, ['my-command', '.'])
    assert result.exit_code == 0
```

---

## How to Add an MCP Tool

### 1. Add to mcp_tools_registry.py

File: `src/surfaces/mcp_tools_registry.py`

```python
@mcp.tool()
async def my_tool(
    param: str = Field(..., description="Description"),
) -> str:
    """Short description for AI agents."""
    import json
    result = {"param": param}
    return json.dumps(result, indent=2)
```

### 2. Add tests

```python
import pytest

@pytest.mark.asyncio
async def test_my_tool():
    # Test the tool directly
    result = await my_tool(param="test")
    import json
    data = json.loads(result)
    assert data["param"] == "test"
```

---

## Testing

### Run all tests

```bash
python -m pytest tests/ -v --tb=short
```

### Run with coverage

```bash
python -m pytest tests/ --cov=src --cov-report=term-missing
```

### Run specific test file

```bash
python -m pytest tests/capabilities/test_autonomous_testing_actions.py -v
```

### Test structure

```
tests/
  capabilities/    -- Capability tests (unit)
  infrastructure/  -- Adapter tests (mock subprocess)
  surfaces/        -- CLI and MCP tool tests
  taxonomy/        -- Model tests
  conftest.py      -- Shared fixtures
```

### Rules

- Every new function needs at least one test
- Mock external tools (subprocess, filesystem, network)
- Test both success and failure paths
- Use `@pytest.mark.asyncio` for async tests
- Mark data classes with `__test__ = False` to avoid pytest collection

---

## Code Style

### Conventions

- Python 3.12+ features encouraged (type hints, match/case)
- Async where possible
- No bare `except:` — always catch specific exceptions
- Log errors, don't silently swallow them
- Keep files under 300 lines
- Module docstrings: 1 line goal only

### Naming

- Capabilities: `<Action>UseCase` (e.g., `RunTestWithHealingUseCase`)
- Adapters: `<Service>Adapter` (e.g., `PytestRunner`)
- Interfaces: `I<Capability>` (e.g., `ITestRunner`)
- Models: `<Entity>` (e.g., `TestResult`)
- Test files: `test_<module>.py`

---

## Pull Request Process

### Before Submitting

1. **Run tests**: `python -m pytest tests/ -q`
   All tests must pass.
2. **Check coverage**: `python -m pytest tests/ --cov=src`
   New code should have tests. Don't decrease total coverage.
3. **Update docs**:
   - PRD.md if you added features
   - SKILL.md if you changed MCP tools or CLI commands
   - README.md if the user-facing interface changed

### PR Description Template

```markdown
## What
Brief description of what this PR does.

## Why
Why is this change needed?

## How
How does it work? Any design decisions?

## Testing
How was it tested? What test cases were added?

## Checklist
- [ ] Tests passing
- [ ] Coverage not decreased
- [ ] Docs updated if needed
```

### Review Criteria

- Code follows architecture rules
- Tests cover both happy path and error cases
- No hardcoded paths or environment assumptions
- Subprocess calls use secure execution
- Error messages are actionable

---

## Questions?

Open an issue on GitHub or contact the maintainer.
