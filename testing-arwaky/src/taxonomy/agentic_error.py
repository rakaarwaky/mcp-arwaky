"""agentic_error — Error types for agentic-testing."""

from typing import Optional


class AgenticTestingError(Exception):
    """Base error for agentic-testing."""

    def __init__(self, message: str, cause: Optional[str] = None):
        super().__init__(message)
        self.message = message
        self.cause = cause

    def __str__(self) -> str:
        if self.cause:
            return f"{self.message} (caused by: {self.cause})"
        return self.message


class InfrastructureError(AgenticTestingError):
    """Raised when external commands or processes fail."""

    pass


class AnalysisError(AgenticTestingError):
    """Raised when parsing or static analysis fails."""

    pass


class GenerationError(AgenticTestingError):
    """Raised when test generation fails."""

    pass
