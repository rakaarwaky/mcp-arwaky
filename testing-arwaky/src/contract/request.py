"""request — Surface input DTOs (what surfaces RECEIVE).

Typed request objects that CLI commands and MCP tools receive.
These replace raw dict/kwargs passing.
"""

from dataclasses import dataclass


@dataclass
class RunTestRequest:
    """Request to run tests with optional healing."""
    test_path: str
    heal: bool = False
    max_retries: int = 3


@dataclass
class AnalyzeRequest:
    """Request to analyze a source file."""
    target_file: str


@dataclass
class AuditRequest:
    """Request to audit coverage."""
    target_dir: str
    threshold: float = 80.0


@dataclass
class GenerateRequest:
    """Request to generate boilerplate tests."""
    source_file: str
    output: str | None = None
