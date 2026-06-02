"""lint_value_vo — Core value objects."""

from enum import Enum
from pydantic import BaseModel, ConfigDict


class Severity(str, Enum):
    """Finding impact level."""
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

    @property
    def score_impact(self) -> float:
        """Return numeric impact on quality score based on severity level."""
        return _SEVERITY_IMPACT[self]


_SEVERITY_IMPACT = {
    Severity.INFO: 0,
    Severity.LOW: 0,
    Severity.MEDIUM: 2,
    Severity.HIGH: 10,
    Severity.CRITICAL: 50,
}


class ErrorCode(BaseModel):
    """Error/test code identifier."""
    model_config = ConfigDict(frozen=True)

    code: str

    def __str__(self) -> str:
        return self.code

    @property
    def is_test_error(self) -> bool:
        """True if code starts with 'E' or 'F' (test failure codes)."""
        return self.code.startswith(("E", "F"))

    @property
    def is_import_error(self) -> bool:
        """True if code starts with 'I' or 'M' (import error codes)."""
        return self.code.startswith(("I", "M"))


class Position(BaseModel):
    """Source file location."""
    model_config = ConfigDict(frozen=True)

    line: int
    column: int = 0

    def __str__(self) -> str:
        if self.column:
            return f"{self.line}:{self.column}"
        return str(self.line)


class Score(BaseModel):
    """Quality score (0.0-100.0)."""
    model_config = ConfigDict(frozen=True)

    value: float

    def __str__(self) -> str:
        return f"{self.value:.1f}"

    @property
    def is_passing(self) -> bool:
        """True if score meets minimum threshold (>= 80.0)."""
        return self.value >= 80.0

    @property
    def is_perfect(self) -> bool:
        """True if score is perfect (>= 100.0)."""
        return self.value >= 100.0
