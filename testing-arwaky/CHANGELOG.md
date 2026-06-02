# Changelog

## 1.1.3 (2026-04-30)

### Changed
- **Package Name**: Renamed package to `agentic-testing-mcp` to avoid naming conflicts on PyPI.

## 1.1.2 (2026-04-30)

### Added
- **Installation Scripts**: Added `install.sh` (Linux/macOS) and `install.ps1` (Windows) for easier one-liner installation.
- **Publish Workflow**: Added GitHub Actions workflow for automatic publishing to PyPI.

## 1.1.1 (2026-04-30)

### Fixed
- **ErrorCode Attribute Access**: Fixed a critical `AttributeError` in the healing strategies where it was incorrectly accessing `.value` instead of `.code` for the `ErrorCode` value object.

## 1.1.0 (2026-04-30)

### Fixed & Stabilized
- **Functional Job Cancellation**: Implemented full `cancel_job` tool with process tracking and termination.
- **Asynchronous I/O Transformation**: Converted `IFileSystem` to fully asynchronous implementation using `asyncio.to_thread`, eliminating event loop blocking.
- **Architectural Governance**: Integrated `GovernanceAdapter` into CLI and MCP tools to enforce layer dependency rules.
- **Thread-Safe Backups**: Switched to timestamped unique backup filenames to prevent race conditions during parallel healing.
- **Portability Improvements**: Removed hard-coded developer-specific paths in `DesktopCommander` delegation.
- **Test Suite Restoration**: Fixed systemic import errors in `tests/` directory caused by layer-crossing imports.
- **Defensive Error Handling**: Added try/except guards for test generation and healing actions to prevent tool crashes.

### Improved
- Cleaned up duplicate protocol definitions (`port.py` vs `file_system_port.py`).
- Enhanced `AstAnalyzer` to be asynchronous.
- Added `governance audit` CLI command.

## 1.0.0 (2026-04-13)

### Added

- 5-domain architecture: agent, capabilities, infrastructure, surfaces, taxonomy
- Interface-based design with 6 core interfaces (ITestRunner, ITestHealer, ICodeAnalyzer, IQualityAuditor, ITestGenerator, IFileSystem)
- 5 MCP tools: execute_command, list_commands, check_status, read_skill_context, cancel_job
- 11 CLI commands: run, analyze, audit, generate, generate-data, migrate, find-slow, mock-generate, workflow, version, init
- Self-healing test engine with automatic fix for 6 error types:
  - ImportError / ModuleNotFoundError (sys.path injection)
  - AttributeError (Levenshtein-based typo detection)
  - AssertionError (literal and variable trace fixing)
  - TypeError (missing argument injection)
  - NameError (common import insertion)
- AST-based code analysis (classes, functions, complexity scoring)
- Coverage auditing with configurable thresholds
- Boilerplate test generation from source code analysis
- Synthetic test data generation (strings, numbers, JSON, dates, emails)
- Unittest to pytest migration with regex-based assertion conversion
- Slow test detection using pytest --durations
- Mock generation from function signatures
- Pre-defined workflows: test-and-fix, coverage-gate, full-suite
- MCP server via FastMCP (`mcp.server.fastmcp.FastMCP`)
- CLI via Click with command groups
- Unix socket communication with DesktopCommander
- Secure command execution with blocked commands list (`sudo`, `rm -rf`, `dd`, etc.)
- Path traversal prevention in file system adapter
- Backup creation before auto-fix modifications
- SKILL.md documentation for AI agent consumption
- CONTRIBUTING.md with detailed contribution guides
- README.md with quick start and architecture overview

### Architecture

- Clean Architecture with 5 domains
- DI container with lazy initialization
- Dependency wiring in `agent/wiring.py`
- Tool registry via `mcp_tools.py`
- Taxonomy layer with interfaces and data models

### Dependencies

- mcp[cli], fastmcp, pydantic (core)
- click (CLI framework)
- pytest (test runner)
- pytest-cov (optional, coverage reporting)
