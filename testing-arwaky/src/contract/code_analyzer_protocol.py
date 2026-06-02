"""code_analyzer_protocol — Capability contract for static code analysis.

Contract layer MUST use taxonomy types — no primitives.
"""

from abc import ABC, abstractmethod
from src.taxonomy.lint_identifier_vo import FilePath


class ICodeAnalyzer(ABC):
    """Analyzes source code structure via AST."""

    @abstractmethod
    async def analyze_file(self, file_path: FilePath) -> dict:
        """Analyze a source file and return structured data."""
        ...
