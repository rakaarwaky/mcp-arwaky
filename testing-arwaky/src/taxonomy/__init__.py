"""taxonomy — Shared language for all domains (VOs, errors, events).

Responsibility:
- Value Objects (domain-typed primitives): FilePath, TestName, Severity, etc.
- Domain errors: AgenticTestingError, InfrastructureError, etc.
- Domain events: TestRunStarted, HealApplied, etc.

Contract layer imports FROM taxonomy — never the reverse.
Consumers that need contracts should import from src.contract directly.
"""

__all__ = [
    # Value Objects: Core
    "Severity", "ErrorCode", "Position", "Score",
    # Value Objects: Identifiers
    "TestName", "FilePath", "SymbolName", "DirectoryPath",
    # Value Objects: Domain
    "ScopeRef", "Location",
    # Errors
    "AgenticTestingError", "InfrastructureError", "AnalysisError", "GenerationError",
    # Events
    "TestRunStarted", "TestRunCompleted", "TestRunFailed", "HealApplied",
]

# -- Value Objects: Core --
from .lint_value_vo import (
    Severity as Severity,
    ErrorCode as ErrorCode,
    Position as Position,
    Score as Score,
)

# -- Value Objects: Identifiers --
from .lint_identifier_vo import (
    TestName as TestName,
    FilePath as FilePath,
    SymbolName as SymbolName,
    DirectoryPath as DirectoryPath,
)

# -- Value Objects: Domain --
from .lint_domain_vo import (
    ScopeRef as ScopeRef,
    Location as Location,
)

# -- Errors --
from .agentic_error import (
    AgenticTestingError as AgenticTestingError,
    InfrastructureError as InfrastructureError,
    AnalysisError as AnalysisError,
    GenerationError as GenerationError,
)

# -- Events --
from .test_event import (
    TestRunStarted as TestRunStarted,
    TestRunCompleted as TestRunCompleted,
    TestRunFailed as TestRunFailed,
    HealApplied as HealApplied,
)
