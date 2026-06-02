"""test_event — Domain event types for agentic-testing."""

from datetime import datetime, timezone
from dataclasses import dataclass


@dataclass
class TestRunStarted:
    """Test run began."""
    __test__ = False
    path: str
    heal_enabled: bool = False
    max_retries: int = 0
    timestamp: str = ""

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now(timezone.utc).isoformat()


@dataclass
class TestRunCompleted:
    """Test run finished."""
    __test__ = False
    path: str
    passed: bool
    healed: bool = False
    healing_attempts: int = 0
    coverage_pct: float = 0.0
    duration_ms: float = 0.0
    timestamp: str = ""

    @property
    def is_passing(self) -> bool:
        return self.passed or self.coverage_pct >= 80.0

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now(timezone.utc).isoformat()


@dataclass
class TestRunFailed:
    """Test run failed."""
    __test__ = False
    path: str
    error_type: str
    error_message: str
    timestamp: str = ""

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now(timezone.utc).isoformat()


@dataclass
class HealApplied:
    """Fix applied to a test file."""
    path: str
    error_type: str
    success: bool
    timestamp: str = ""

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now(timezone.utc).isoformat()
