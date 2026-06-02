"""analysis_report_response — Surface output DTO for code analysis results."""

from dataclasses import dataclass


@dataclass
class AnalysisReport:
    """Result of static code analysis."""
    file: str
    classes: list[str]
    functions: list[str]
    complexity_score: float | None = None
    error: str | None = None
