import logging
from src.contract import ITestHealer, TestResult, IFileSystem
from .test_healing_actions import (
    FixStrategy,
    ImportErrorStrategy,
    AttributeErrorStrategy,
    TypeErrorStrategy,
    NameErrorStrategy,
    AssertionErrorStrategy,
)

logger = logging.getLogger(__name__)


class HeuristicHealer(ITestHealer):
    """Rule-based healer for common test issues (Capability).

    Uses the Strategy Pattern to delegate fixes to specialized strategies.
    """

    def __init__(self, file_system: IFileSystem):
        self.file_system = file_system
        self._backup_created = False
        self._strategies: list[FixStrategy] = [
            ImportErrorStrategy(file_system),
            AttributeErrorStrategy(file_system),
            AssertionErrorStrategy(file_system),
            TypeErrorStrategy(file_system),
            NameErrorStrategy(file_system),
        ]

    async def _create_backup(self, file_path: str) -> str | None:
        """Create backup before modifying a file. Returns backup path."""
        import time
        timestamp = int(time.time())
        backup_path = f"{file_path}.{timestamp}.healer.bak"
        try:
            content = await self.file_system.read_file(file_path)
            await self.file_system.write_file(backup_path, content)
            logger.info(f"Backup created: {backup_path}")
            self._backup_created = True
            return backup_path
        except OSError as e:
            logger.error(f"Failed to create backup for {file_path}: {e}")
            return None

    async def attempt_fix(self, result: TestResult) -> bool:
        """Attempts to fix based on error_code using strategy pattern."""
        if not result.error_code:
            return False

        # Create backup before any fix attempt
        file_path = str(result.target)
        if file_path:
            await self._create_backup(file_path)

        # Find and apply the first matching strategy
        for strategy in self._strategies:
            if strategy.can_fix(result):
                return await strategy.apply_fix(result)

        return False
