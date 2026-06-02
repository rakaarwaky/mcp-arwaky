"""quality_auditor_protocol — Capability contract for quality/coverage auditing.

Contract layer MUST use taxonomy types — no primitives.
"""

from abc import ABC, abstractmethod
from src.taxonomy.lint_identifier_vo import DirectoryPath


class IQualityAuditor(ABC):
    """Audits code quality metrics (coverage, etc)."""

    @abstractmethod
    async def check_coverage(self, target_dir: DirectoryPath) -> dict:
        """Check coverage for a directory and return metrics."""
        ...
