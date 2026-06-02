"""test_result_response — Surface output DTO for test execution results.

Contract layer MUST import domain types from taxonomy — no primitives.
"""

from dataclasses import dataclass
from src.taxonomy.lint_identifier_vo import FilePath
from src.taxonomy.lint_value_vo import Position, ErrorCode


@dataclass
class FailureMetadata:
    """Detailed metadata for a test failure."""
    file_path: FilePath
    position: Position
    error_code: ErrorCode
    message: str = ""


@dataclass
class TestResult:
    """Core entity representing test execution outcome."""

    target: FilePath
    passed: bool
    output_log: str
    error_code: ErrorCode | None = None
    failure: FailureMetadata | None = None
    coverage_pct: float = 0.0
    duration: float = 0.0
    healed: bool = False
    healing_attempts: int = 0

    __test__ = False

    @property
    def position_str(self) -> str:
        """Return target:line if failure has position, else just target."""
        if self.failure:
            return f"{self.target}:{self.failure.position}"
        return str(self.target)

    def mark_healed(self, attempts: int):
        """Mark this result as healed after retry."""
        self.healed = True
        self.healing_attempts = attempts
