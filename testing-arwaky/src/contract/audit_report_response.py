"""audit_report_response — Surface output DTO for coverage audit results."""

from dataclasses import dataclass


@dataclass
class AuditReport:
    """Result of coverage audit."""
    total_pct: float
    threshold: float
    passed: bool
    summary: str = ""
    error: str | None = None

    @property
    def status(self) -> str:
        return "PASS" if self.passed else "FAIL"
