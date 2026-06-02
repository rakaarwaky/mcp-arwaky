"""test_generator_protocol — Capability contract for test boilerplate generation.

Contract layer MUST use taxonomy types — no primitives.
"""

from abc import ABC, abstractmethod
from src.taxonomy.lint_identifier_vo import FilePath


class ITestGenerator(ABC):
    """Generates test boilerplate from source code."""

    @abstractmethod
    async def generate_test(self, source_file: FilePath) -> str:
        """Generates a test file for a given source file."""
        ...
