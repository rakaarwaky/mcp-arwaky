"""generate_report_response — Surface output DTO for test generation results."""

from dataclasses import dataclass


@dataclass
class GenerateReport:
    """Result of test generation."""
    source_file: str
    output_file: str
    functions_covered: int = 0
    classes_covered: int = 0
    error: str | None = None
