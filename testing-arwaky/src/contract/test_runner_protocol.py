"""test_runner_protocol — Capability contract for test execution.

Contract layer MUST use taxonomy types — no primitives.
"""

from abc import ABC, abstractmethod
from .test_result_response import TestResult
from src.taxonomy.lint_identifier_vo import FilePath


class ITestRunner(ABC):
    """Executes tests and returns structured results."""

    @abstractmethod
    async def run_test(self, test_path: FilePath) -> TestResult:
        """Executes a test run for a specific file."""
        ...
