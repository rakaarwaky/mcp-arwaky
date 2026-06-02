"""analyze_code_request — Surface input DTO for source code analysis.

Contract layer MUST import domain types from taxonomy — no primitives.
"""

from dataclasses import dataclass
from src.taxonomy.lint_identifier_vo import FilePath


@dataclass
class AnalyzeCodeRequest:
    """Request to analyze a source file."""
    target_file: FilePath
