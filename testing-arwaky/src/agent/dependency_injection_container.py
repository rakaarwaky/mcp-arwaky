from .logging_manager import setup_logging
from .dependency_wiring_container import wire_dependencies


class Container:
    """The central orchestrator for the system's runtime state (Domain 3)."""

    def __init__(self):
        # 1. Initialize Foundation (Level 3a)
        self.logger = setup_logging()

        # 2. Wire Dependencies (Level 3b)
        deps = wire_dependencies()

        # Map dependencies to container attributes
        self.runner = deps["runner"]
        self.file_system = deps["file_system"]
        self.healer = deps["healer"]
        self.test_use_case = deps["test_use_case"]
        self.analyzer = deps["analyzer"]
        self.auditor = deps["auditor"]
        self.generator = deps["generator"]
        self.test_generator = deps["test_generator"]
        self.governance = deps["governance"]
        
        # 3. State Management
        self.job_registry: dict[str, Any] = {}

        self.logger.info("Container fully initialized with AES Domain 3 structure.")


_container = None


def reset_container() -> None:
    """Reset the global container singleton.

    Useful for testing to ensure a fresh container per test.
    """
    global _container
    _container = None


def get_container() -> Container:
    """Lazy initialization of the global container instance."""
    global _container
    if _container is None:
        _container = Container()
    return _container
