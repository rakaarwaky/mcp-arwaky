"""audit_coverage_request — Surface input DTO for coverage audit requests.

Contract layer MUST import domain types from taxonomy — no primitives.
"""

from dataclasses import dataclass
from src.taxonomy.lint_identifier_vo import DirectoryPath
from src.taxonomy.lint_value_vo import Score


@dataclass
class AuditCoverageRequest:
    """Request to audit coverage with a configurable threshold."""
    target_dir: DirectoryPath
    threshold: Score
