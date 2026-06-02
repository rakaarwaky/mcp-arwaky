"""generate_test_request — Surface input DTO for test generation requests.

Contract layer MUST import domain types from taxonomy — no primitives.
"""

from dataclasses import dataclass
from src.taxonomy.lint_identifier_vo import FilePath


@dataclass
class GenerateTestRequest:
    """Request to generate boilerplate tests for a source file."""
    source_file: FilePath
    output: FilePath | None = None
