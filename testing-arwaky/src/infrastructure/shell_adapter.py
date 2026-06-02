"""shell_adapter — PytestRunner infrastructure adapter.

Implements ITestRunner contract. Uses taxonomy types for domain values.
"""

import asyncio
import subprocess
import re
import os
import sys

from ..contract import ITestRunner, TestResult, FailureMetadata
from ..taxonomy import FilePath, ErrorCode


class PytestRunner(ITestRunner):
    """Infrastructure adapter for running pytest."""

    # Default timeout for test execution in seconds
    DEFAULT_TIMEOUT = int(os.environ.get("AGENTIC_TEST_TIMEOUT", "30"))

    def __init__(self, timeout: int | None = None):
        self.timeout = timeout if timeout is not None else self.DEFAULT_TIMEOUT

    async def run_test(self, test_path: str) -> TestResult:
        """Execute pytest on the given test path and return structured result.

        Uses subprocess.exec (not shell) to prevent injection attacks.
        Parses pytest output to extract error types, line numbers, and messages.
        """
        proc = await asyncio.create_subprocess_exec(
            sys.executable, "-m", "pytest", test_path, "-v", "--tb=short",
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=self.timeout)
        except asyncio.TimeoutError:
            proc.kill()
            # Wait for process to terminate after kill
            await proc.communicate()
            output = ""
            error_output = f"Test execution timed out after {self.timeout} seconds"
            exit_code = -1  # Indicate timeout
            # We'll treat timeout as a failure with a special error code
            error_code = ErrorCode(code="TimeoutError")
            failure_meta = FailureMetadata(
                file_path=FilePath(value=test_path),
                position=Position(line=0),
                error_code=error_code,
                message=error_output,
            )
            fp = FilePath(value=test_path)
            return TestResult(
                target=fp,
                passed=False,
                output_log=error_output,
                error_code=error_code,
                failure=failure_meta,
            )
        output = stdout.decode() + stderr.decode()
        exit_code = proc.returncode

        error_code: ErrorCode | None = None
        failure_meta: FailureMetadata | None = None

        if exit_code != 0:
            base_name = os.path.basename(test_path)
            line_match = re.search(rf"{re.escape(base_name)}:(\d+):", output)
            line_number = int(line_match.group(1)) if line_match else None

            error_match = re.search(r"E\s+([a-zA-Z]+Error):?\s+(.*)", output)
            if error_match:
                raw_error = error_match.group(1)
                message = error_match.group(2).strip()

                if raw_error == "AssertionError":
                    match = re.search(
                        r"assert\s+['\"]([^'\"]+)['\"]\s*==\s*['\"]([^'\"]+)['\"]",
                        message,
                    )
                    if match:
                        actual, expected = match.groups()
                        message = f"AssertionError: Expected '{expected}', got '{actual}'"

                error_code = ErrorCode(code=raw_error)

                # Map taxonomy types to FailureMetadata (contract dataclass)
                failure_fp = FilePath(value=test_path)
                from src.taxonomy.lint_value_vo import Position
                failure_meta = FailureMetadata(
                    file_path=failure_fp,
                    position=Position(line=line_number or 0),
                    error_code=error_code,
                    message=message,
                )
            else:
                if "ModuleNotFoundError" in output:
                    raw_error = "ModuleNotFoundError"
                elif "ImportError" in output:
                    raw_error = "ImportError"
                elif "AssertionError" in output:
                    raw_error = "AssertionError"
                else:
                    raw_error = "UnknownError"

                error_code = ErrorCode(code=raw_error)

        fp = FilePath(value=test_path)
        return TestResult(
            target=fp,
            passed=(exit_code == 0),
            output_log=output,
            error_code=error_code,
            failure=failure_meta,
        )
