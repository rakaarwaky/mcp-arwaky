"""test_healer_protocol — Capability contract for autonomous test healing.

Contract layer MUST use taxonomy types — no primitives.
"""

from abc import ABC, abstractmethod
from .test_result_response import TestResult


class ITestHealer(ABC):
    """Attempts to fix failing tests automatically."""

    @abstractmethod
    async def attempt_fix(self, result: TestResult) -> bool:
        """Tries to fix the code based on the TestResult error."""
        ...
