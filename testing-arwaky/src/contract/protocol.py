"""protocol — Capability contracts (what capabilities CAN do).

These define the behavior each capability must implement.
Capabilities live in `src/capabilities/` and implement these interfaces.
"""

from abc import ABC, abstractmethod
from .response import TestResult


class ITestRunner(ABC):
    """Executes tests and returns structured results."""

    @abstractmethod
    async def run_test(self, test_path: str) -> TestResult:
        """Executes a test run for a specific file."""
        ...


class ITestHealer(ABC):
    """Attempts to fix failing tests automatically."""

    @abstractmethod
    async def attempt_fix(self, result: TestResult) -> bool:
        """Tries to fix the code based on the TestResult error."""
        ...


class ICodeAnalyzer(ABC):
    """Analyzes source code structure via AST."""

    @abstractmethod
    async def analyze_file(self, file_path: str) -> dict:
        """Analyze a source file and return structured data."""
        ...


class IQualityAuditor(ABC):
    """Audits code quality metrics (coverage, etc)."""

    @abstractmethod
    async def check_coverage(self, target_dir: str) -> dict:
        """Check coverage for a directory and return metrics."""
        ...


class ITestGenerator(ABC):
    """Generates test boilerplate from source code."""

    @abstractmethod
    async def generate_test(self, source_file: str) -> str:
        """Generates a test file for a given source file."""
        ...
