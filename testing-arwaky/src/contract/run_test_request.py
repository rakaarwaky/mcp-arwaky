"""run_test_request — Surface input DTO for test execution requests.

Contract layer MUST import domain types from taxonomy — no primitives.
"""

from dataclasses import dataclass
from src.taxonomy.lint_identifier_vo import FilePath


@dataclass
class RunTestRequest:
    """Request to run tests with optional healing."""
    test_path: FilePath
    heal: bool = False
    max_retries: int = 3
