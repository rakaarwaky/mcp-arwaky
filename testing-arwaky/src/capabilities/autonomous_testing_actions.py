from src.contract import ITestRunner, ITestHealer, TestResult
from src.taxonomy import FilePath


class RunTestWithHealingUseCase:
    """Orchestrates the Test-Heal-Retry loop (Capability)."""

    def __init__(self, runner: ITestRunner, healer: ITestHealer):
        self.runner = runner
        self.healer = healer

    async def execute(self, test_path: str, max_retries: int = 2) -> TestResult:
        """Runs the test, attempting to heal up to max_retries times upon failure."""
        fp = FilePath(value=test_path)

        # Initial Run
        result = await self.runner.run_test(test_path)
        if result.passed:
            return result

        # Healing Loop
        attempts = 0
        while not result.passed and attempts < max_retries:
            attempts += 1

            # Attempt Heal
            healed = await self.healer.attempt_fix(result)
            if not healed:
                break  # Cannot heal this error type

            # Retry
            result = await self.runner.run_test(test_path)
            result.healed = True
            result.healing_attempts = attempts

        return result
