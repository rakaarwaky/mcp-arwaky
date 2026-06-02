# Product Requirements Document (PRD)

## Agentic Testing — Autonomous Test Engine v1.0.0

---

## 1. Product Overview

**Name**: Agentic Testing
**Type**: MCP Server + CLI Tool
**Version**: 1.1.1
**License**: MIT
**Language**: Python >= 3.12

Agentic Testing is an autonomous test engine with self-healing capabilities. It runs as both an MCP server for AI agents and a CLI tool for developers.

Uses `mcp.server.fastmcp.FastMCP` for the MCP server interface.
Connects to DesktopCommander via Unix socket for secure command execution.

---

## 2. Problem Statement

Writing and maintaining tests is tedious and error-prone. Developers and AI agents need:

- Automated test generation from source code
- Self-healing tests that fix themselves when they break
- Coverage auditing with configurable thresholds
- Synthetic test data generation for edge cases
- Migration tools for legacy test frameworks (unittest → pytest)

**The Real Cost of Inaction:**

| Issue                | Impact                                  |
| -------------------- | --------------------------------------- |
| Manual test writing  | 5+ hours/week per developer             |
| Brittle tests        | Tests break on minor refactors          |
| Low coverage         | Undetected bugs reach production        |
| Test data creation   | Manual edge case discovery is slow      |
| Framework migration  | Costly and risky to migrate by hand     |

---

## 3. AI Agent Value

In 2026, AI agents do the coding. Agentic Testing enables:

| Value Driver             | Description                                 |
| ------------------------ | ------------------------------------------- |
| **Agent Autonomy** | Agent generates and runs tests independently  |
| **Self-Healing**   | Agent auto-fixes broken tests automatically   |
| **Coverage Gates** | Agent enforces coverage thresholds in CI      |
| **Data Synthesis** | Agent generates edge-case test data           |

---

## 4. Target Users

| User           | Interface          | Use Case                                         |
| -------------- | ------------------ | ------------------------------------------------ |
| **AI Agents**  | MCP tools (5 tools) | Autonomous test generation and self-healing    |
| **Developers** | CLI (11+ commands)  | Run tests, generate tests, audit coverage       |
| **CI/CD**      | CLI + exit codes    | Coverage gates, quality metrics                |
| **Contributors** | GitHub + PRs     | Add capabilities, adapters, CLI commands        |

---

## 5. Functional Requirements

### 5.1 Test Execution

| ID     | Requirement                                    | Status |
| ------ | ---------------------------------------------- | ------ |
| FR-001 | Run pytest on individual test files            | Done   |
| FR-002 | Parse pytest output for failure metadata       | Done   |
| FR-003 | Self-healing retry loop (up to N attempts)     | Done   |
| FR-004 | Extract error type, line number, message       | Done   |
| FR-005 | Create backup before auto-fix                  | Done   |

### 5.2 Self-Healing

| ID     | Requirement                                    | Status |
| ------ | ---------------------------------------------- | ------ |
| FR-010 | Fix ImportError/ModuleNotFoundError            | Done   |
| FR-011 | Fix AttributeError typos (Levenshtein match)  | Done   |
| FR-012 | Fix AssertionError (literal + variable trace)  | Done   |
| FR-013 | Fix TypeError (missing arguments)              | Done   |
| FR-014 | Fix NameError (common imports)                 | Done   |

### 5.3 Code Analysis

| ID     | Requirement                                    | Status |
| ------ | ---------------------------------------------- | ------ |
| FR-020 | AST-based file analysis (classes, functions)  | Done   |
| FR-021 | Complexity scoring                           | Done   |
| FR-022 | Coverage auditing with threshold               | Done   |

### 5.4 Test Generation

| ID     | Requirement                                    | Status |
| ------ | ---------------------------------------------- | ------ |
| FR-030 | Generate boilerplate tests from AST           | Done   |
| FR-031 | Generate synthetic test data (strings, etc.)  | Done   |
| FR-032 | Migrate unittest → pytest                      | Done   |
| FR-033 | Generate mocks from function signatures        | Done   |

### 5.5 Integration

| ID     | Requirement                                    | Status |
| ------ | ---------------------------------------------- | ------ |
| FR-040 | MCP server via FastMCP                        | Done   |
| FR-041 | CLI via Click with command groups             | Done   |
| FR-042 | Unix socket communication                     | Done   |
| FR-043 | Secure command execution (blocked commands)   | Done   |

### 5.6 Report Formats

| ID     | Requirement                                    | Status |
| ------ | ---------------------------------------------- | ------ |
| FR-050 | Text output (human-readable)                   | Done   |
| FR-051 | JSON output (machine-readable)                 | Done   |

---

## 6. Non-Functional Requirements

| ID      | Requirement                | Target    | Current (v1.0) |
| ------- | -------------------------- | --------- | -------------- |
| NFR-001 | Test coverage              | 100%      | ✅ 100% |
| NFR-002 | All tests passing          | 100%      | ✅ 397/397 passed |
| NFR-003 | Python version             | >= 3.12   | ✅ 3.12+ |
| NFR-004 | Self-healing success rate  | > 70%     | ⚠️ ~40% (5 error types, rule-based) |
| NFR-005 | Startup time (MCP server)  | < 2s      | ✅ ~1s |
| NFR-006 | Linting (ruff)             | 0 errors  | ✅ Clean |
| NFR-007 | Type checking (mypy)       | 0 errors  | ✅ Clean |

---

## 7. Architecture

### 7.1 Domain Model (5 Domains)

```
src/
  agent/              -- Wiring layer: DI container, logging
  capabilities/       -- Thinking logic: test execution, healing, analysis, generation
  infrastructure/     -- Toolbox: pytest runner, file system, transports
  surfaces/           -- Interfaces: CLI (Click), MCP (FastMCP)
  taxonomy/           -- Shared language: interfaces, models, data classes
```

### 7.2 Dependency Rules

```
surfaces      → capabilities       OK
surfaces      → infrastructure     OK
capabilities  → infrastructure     OK (via taxonomy interfaces)
infrastructure → taxonomy          OK
agent         → everything         OK (wiring layer)
```

### 7.3 MCP Server Architecture

Uses `mcp.server.fastmcp.FastMCP` with decorator-based tool registration:

```
mcp_server.py       -- creates FastMCP, registers tools
mcp_tools.py        -- all 5 MCP tool definitions
```

---

## 8. MCP Interface (5 Tools)

| Tool                    | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| `execute_command`     | Execute any CLI command with security check  |
| `list_commands`       | Discover available CLI commands              |
| `check_status`        | Check server health and socket availability  |
| `read_skill_context`  | Read SKILL.md documentation sections         |
| `cancel_job`          | Cancel a running test job                    |

---

## 9. CLI Interface (11 Commands)

| Category    | Commands                                                       |
| ----------- | -------------------------------------------------------------- |
| Test        | run, analyze, audit, generate                                  |
| Data        | generate-data                                                  |
| Migration   | migrate                                                        |
| Performance | find-slow, mock-generate                                       |
| Workflow    | workflow                                                       |
| Utility     | version, init                                                  |

---

## 10. Security

| Feature                  | Description                                       |
| ------------------------ | ------------------------------------------------- |
| Blocked commands list  | `sudo`, `rm -rf`, `dd`, `chmod`, etc.            |
| Path validation        | Prevents directory traversal attacks              |
| Unix socket only       | No network exposure, local IPC only              |
| Timeout enforcement    | 300s default timeout for all commands            |

---

## 10b. Roadmap

### Phase 1: v1.1 — Smart Assertion Generation 🔥 *HIGHEST PRIORITY*

**Goal: Transform boilerplate `assert True` into meaningful assertions powered by LLM.**

| Feature | Description | Acceptance Criteria |
|---------|-------------|-------------------|
| LLM-powered assertion gen | AI reads source code, generates assertions that verify actual behavior | `test_parse_data()` → `assert isinstance(result, dict)` + `assert "id" in result` |
| Return-type aware assertions | Assertions derived from function return type annotations | `def foo() -> User` → `assert isinstance(result, User)` |
| Exception test generation | Detect raised exceptions, generate `pytest.raises()` tests | Function raises ValueError → `with pytest.raises(ValueError):` |
| Parameterized test gen | Multiple inputs → `@pytest.mark.parametrize` boilerplate | At least 3 test cases per function |
| Smart import resolution | Auto-detect and inject required imports | No manual import editing needed |

**Impact:** Developer goes from "write entire test" → "review AI-generated test"

---

### Phase 2: v1.2 — Better Self-Healing

**Goal: Expand healing from 5 error types to 10+ covering real-world failure scenarios.**

| Feature | Description | Why It Matters |
|---------|-------------|---------------|
| LLM-assisted healing | AI analyzes failure context, suggests semantic fixes | Beyond regex — understands WHY test failed |
| Fixture error detection | Auto-detect missing pytest fixtures, inject them | `NameError: fixture_x` → auto-create fixture |
| Async test healing | Fix missing `await`, event loop issues, async fixture problems | Async tests are the #2 failure category |
| Mock patch healing | Fix `@patch` decorator targets, import paths | Common source of test brittleness |
| Database/test data healing | Reset DB state between tests, clean up fixtures | Integration tests fail due to dirty state |
| Deprecation warning fix | Auto-update deprecated API calls in tests | Keeps tests current with library updates |

**Current:** 5 error types, ~40% success rate  
**Target:** 10+ error types, > 85% success rate

---

### Phase 3: v1.5 — Mutation Testing

**Goal: Measure test QUALITY, not just coverage quantity.**

| Feature | Description | Acceptance Criteria |
|---------|-------------|-------------------|
| Mutation analysis engine | Mutate code (change operators, values), verify tests catch mutations | Mutation score > 70% |
| Weak test detection | Flag tests that always pass even when code is mutated | Report lists tests with 0 mutation kills |
| Coverage quality score | Replace "% lines covered" with "% mutations killed" | Actionable quality metric |
| Mutation visualization | Show which mutations survived and where | Developer can see weak spots |
| CI mutation gate | Block PRs if mutation score drops below threshold | Exit code 1 on failure |

**Why this matters:** 100% line coverage with `assert True` = zero protection. Mutation testing fixes this lie.

---

### Phase 4: v2.0 — Multi-Language Support

**Goal: Expand beyond Python to capture the broader testing market.**

| Language | Test Frameworks | Priority | Effort |
|----------|----------------|----------|--------|
| **JavaScript/TypeScript** | Jest, Vitest, Mocha | P0 (huge market) | High |
| **Go** | Built-in `testing` package | P1 | Medium |
| **Rust** | `#[test]` macros, `cargo test` | P2 | Medium |

**Per-language plugin architecture:**
```
src/
  capabilities/
    languages/
      python/       # Current implementation
      javascript/   # Jest runner, healing strategies
      go/           # Go test runner, healing strategies
      rust/         # Rust test runner, healing strategies
```

---

### Phase 5: v2.5 — Predictive Testing

**Goal: Proactive test management — not reactive.**

| Feature | Description | Impact |
|---------|-------------|--------|
| Git diff test gen | Detect code changes → auto-generate tests for new/modified code | Zero-delay test coverage |
| Flaky test detection | Auto-identify tests that pass/fail inconsistently | Eliminate CI noise |
| Test impact analysis | Code changed → determine which tests must run | Faster CI, fewer false negatives |
| Visual coverage heatmap | Identify files with weak/no test coverage | Prioritize testing effort |
| Test suite optimization | Parallelize tests, eliminate redundant tests | Faster CI pipelines |

---

### Phase 6: v3.0 — Vision State

```
┌─────────────────────────────────────────────────────────────────┐
│                    VISION STATEMENT                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  "Zero human effort for writing and maintaining tests"          │
│                                                                 │
│  AI agents write code → Agentic Testing auto-generates tests → │
│  Auto-heals when broken → Auto-detects weak tests →            │
│  Developers REVIEW, never WRITE from scratch                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Target outcomes:**
- Developer saves 5-10 hours/week
- Production bugs down 60%+
- Test maintenance down 80%

---

### Roadmap Timeline

```
v1.0 (NOW)     ████████████████████████████████████████████ ✅ DONE
                Self-healing (5 types), AST analysis, coverage audit, boilerplate gen

v1.1 (NEXT)    █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 📋 PLANNING
                LLM-powered assertion generation

v1.2           ░░░░░█░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ⏳ NOT STARTED
                Better self-healing (10+ error types)

v1.5           ░░░░░░░░░░░░█░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ⏳ NOT STARTED
                Mutation testing

v2.0           ░░░░░░░░░░░░░░░░░░░░░░█░░░░░░░░░░░░░░░░░░ ⏳ NOT STARTED
                Multi-language (JS/TS, Go)

v2.5           ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█░░░░░░░░ ⏳ NOT STARTED
                Predictive testing

v3.0           ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█ ⏳ NOT STARTED
                Zero-effort testing vision
```

---

## 11. Dependencies

| Package      | Type     | Purpose                        |
| ------------ | -------- | ------------------------------ |
| mcp[cli]     | Core     | MCP protocol library           |
| fastmcp      | Core     | FastMCP server framework       |
| pydantic     | Core     | Data validation                |
| click        | Core     | CLI framework                  |
| pytest       | Core     | Test runner                    |
| pytest-cov   | Optional | Coverage reporting             |

---

## 12. Constraints

- Python only (3.12+)
- Free models only (no paid API dependencies)
- Unix socket for DesktopCommander communication
- No database required (file-based operations only)
- Platform: Linux, macOS, Windows

---

## 13. Success Metrics

| Metric | Baseline (v1.0) | Target (v2.0) | How Measured |
|--------|-----------------|---------------|--------------|
| Self-healing success rate | ~40% (5 error types) | > 85% | Tests healed / total failures |
| Test generation quality | Boilerplate only (`assert True`) | LLM-powered meaningful assertions | Mutation score > 70% |
| Time to first test | Manual (5+ hrs/week) | < 30 seconds per file | Developer survey + telemetry |
| CI pipeline integration | Manual CLI | Native GitHub Actions / GitLab CI | Adoption rate |
| Language support | Python only | Python + TypeScript + Go | # of language plugins |
| Developer satisfaction | N/A | NPS > 50 | Quarterly survey |
| Bugs caught pre-production | Baseline unknown | 60% reduction | Production incident tracking |

---

## 14. Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Self-healing creates false positives | Medium | High | Backup before every fix, reversible changes, dry-run mode |
| LLM generates incorrect assertions | Medium | Medium | Assertion validation step, mutation testing as quality gate |
| Scope creep (too many languages) | High | Medium | Phase rollout — Python first, then TypeScript, then Go |
| Competition from established tools | High | Medium | Differentiate via MCP agent autonomy, not just CLI |
| LLM dependency adds cost | Medium | Medium | Support local models (Ollama, LM Studio) alongside cloud APIs |
| Over-reliance on auto-healing | Low | High | Audit log of all auto-fixes, require human review for production |

---

## 15. Competitor Landscape

| Tool | What It Does | Why Agentic Testing is Different |
|------|-------------|--------------------------------|
| **Stryker** | Mutation testing for JS/C#/Scala | We do mutation + self-healing + AI generation — all in one |
| **pytest-watch** | Auto-run tests on file change | We don't just watch — we heal and fix |
| **Hypothesis** | Property-based testing | We generate tests from code, not properties |
| **Pynguin** | Automated unit test generation for Python | We add self-healing + MCP agent integration |
| **Codium.ai** | AI test generation | We are open-source, self-healing, MCP-native |

---

## 16. Glossary

| Term | Definition |
|------|-----------|
| **Self-Healing** | Automatic detection and repair of failing tests without human intervention |
| **MCP (Model Context Protocol)** | Standard protocol for AI models to interact with tools and data |
| **AST (Abstract Syntax Tree)** | Tree representation of source code structure used for analysis |
| **Mutation Testing** | Technique that mutates code to verify tests are meaningful |
| **Coverage Gate** | CI/CD checkpoint that blocks merges if coverage falls below threshold |
| **Boilerplate Test** | Skeleton test file with structure but no assertion logic |
| **Meaningful Assertion** | Test assertion that verifies actual behavior, not just `assert True` |
| **Governance Adapter** | Component that enforces architectural layer rules |
