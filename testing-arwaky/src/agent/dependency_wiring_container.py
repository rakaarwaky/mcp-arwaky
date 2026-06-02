from ..infrastructure.shell_adapter import PytestRunner
from ..infrastructure.file_system_provider import LocalFileSystem
from ..capabilities.autonomous_testing_actions import RunTestWithHealingUseCase
from ..capabilities.autonomous_testing_healing_adapter import HeuristicHealer
from ..capabilities.code_analysis_actions import AstAnalyzer
from ..capabilities.code_analysis_audit_analyzer import CoverageAuditor
from ..capabilities.synthetic_data_actions import SimpleDataGenerator
from ..capabilities.autogenerate_actions import AutogenerateTestUseCase
from ..capabilities.governance_adapter import GovernanceAdapter

import typing

# ─── Architecture Rules ──────────────────────────────────────────────────────
# AES Layer Rules: strict dependency direction
LAYER_RULES = [
    ("capabilities", "surfaces", "Capabilities must not import Surfaces"),
    ("infrastructure", "surfaces", "Infrastructure must not import Surfaces"),
]

LAYER_MAP = {
    "infrastructure": "infrastructure",
    "capabilities": "capabilities",
    "surfaces": "surfaces",
    "agent": "agent",
    "taxonomy": "taxonomy",
}


def wire_dependencies() -> dict[str, typing.Any]:
    """Level 3b: Production - Wiring specific infrastructure and capabilities."""

    # Infrastructure
    runner = PytestRunner()
    file_system = LocalFileSystem()

    # Capability: Autonomous Testing
    healer = HeuristicHealer(file_system)
    test_use_case = RunTestWithHealingUseCase(runner, healer)

    # Capability: Code Analysis
    analyzer = AstAnalyzer(file_system)
    auditor = CoverageAuditor()

    # Capability: Synthetic Data
    generator = SimpleDataGenerator()

    # Capability: Autogenerate
    test_generator = AutogenerateTestUseCase(analyzer, file_system)

    # Capability: Governance
    governance = GovernanceAdapter(rules=LAYER_RULES, layer_map=LAYER_MAP)

    return {
        "runner": runner,
        "file_system": file_system,
        "healer": healer,
        "test_use_case": test_use_case,
        "analyzer": analyzer,
        "auditor": auditor,
        "generator": generator,
        "test_generator": test_generator,
        "governance": governance,
    }
