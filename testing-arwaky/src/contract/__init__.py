"""contract — Pure interfaces and DTOs (no logic, no domain rules).

Responsibilities:
- protocol: Capability contracts (what capabilities CAN do) — ABC enforced
- port: Infrastructure contracts (what adapters CAN do) — ABC enforced
- request: Surface input DTOs (what surfaces RECEIVE)
- response: Surface output DTOs (what surfaces RETURN)

This is separate from taxonomy which holds:
- Value Objects (domain-typed primitives)
- Domain errors
- Domain events

Enforcement: ABC + @abstractmethod (runtime) + mypy --strict (type-time).
"""

__all__ = [
    # Protocol: Capability Contracts (ABC enforced)
    "ITestRunner", "ITestHealer", "ICodeAnalyzer",
    "IQualityAuditor", "ITestGenerator",
    # Port: Infrastructure Contracts (ABC enforced)
    "IFileSystem",
    # Request: Surface Input DTOs
    "RunTestRequest", "AnalyzeCodeRequest", "AuditCoverageRequest", "GenerateTestRequest",
    # Response: Surface Output DTOs
    "TestResult", "FailureMetadata",
    "AnalysisReport", "AuditReport", "GenerateReport",
]

# -- Protocol: Capability Contracts --
from .test_runner_protocol import ITestRunner as ITestRunner
from .test_healer_protocol import ITestHealer as ITestHealer
from .code_analyzer_protocol import ICodeAnalyzer as ICodeAnalyzer
from .quality_auditor_protocol import IQualityAuditor as IQualityAuditor
from .test_generator_protocol import ITestGenerator as ITestGenerator

# -- Port: Infrastructure Contracts --
from .file_system_port import IFileSystem as IFileSystem

# -- Request: Surface Input DTOs --
from .run_test_request import RunTestRequest as RunTestRequest
from .analyze_code_request import AnalyzeCodeRequest as AnalyzeCodeRequest
from .audit_coverage_request import AuditCoverageRequest as AuditCoverageRequest
from .generate_test_request import GenerateTestRequest as GenerateTestRequest

# -- Response: Surface Output DTOs --
from .test_result_response import TestResult as TestResult, FailureMetadata as FailureMetadata
from .analysis_report_response import AnalysisReport as AnalysisReport
from .audit_report_response import AuditReport as AuditReport
from .generate_report_response import GenerateReport as GenerateReport
