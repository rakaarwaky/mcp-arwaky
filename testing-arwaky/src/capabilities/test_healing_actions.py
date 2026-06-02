"""Healing strategies for common test errors (Capability).

Each strategy implements a specific fix for a known error type.
"""

import logging
import re
import difflib
import shutil
from abc import ABC, abstractmethod
from src.contract import TestResult, IFileSystem

logger = logging.getLogger(__name__)


class FixStrategy(ABC):
    """Base class for all fix strategies."""

    def __init__(self, file_system: IFileSystem):
        self.file_system = file_system

    @abstractmethod
    def can_fix(self, result: TestResult) -> bool:
        """Check if this strategy can fix the given error."""
        raise NotImplementedError()  # pragma: no cover

    @abstractmethod
    async def apply_fix(self, result: TestResult) -> bool:
        """Apply the fix. Returns True if successful."""
        raise NotImplementedError()  # pragma: no cover

    async def _create_backup(self, file_path: str) -> str | None:
        """Create backup before modifying a file."""
        import time
        timestamp = int(time.time())
        backup_path = f"{file_path}.{timestamp}.healer.bak"
        try:
            content = await self.file_system.read_file(file_path)
            await self.file_system.write_file(backup_path, content)
            logger.info(f"Backup created: {backup_path}")
            return backup_path
        except OSError as e:
            logger.error(f"Failed to create backup for {file_path}: {e}")
            return None


class ImportErrorStrategy(FixStrategy):
    """Fixes ImportError/ModuleNotFoundError by adding sys.path."""

    def can_fix(self, result: TestResult) -> bool:
        if not result.error_code:
            return False
        return result.error_code.code in ("ImportError", "ModuleNotFoundError")

    async def apply_fix(self, result: TestResult) -> bool:
        file_path = str(result.target)
        try:
            content = await self.file_system.read_file(file_path)
            if "sys.path.insert" in content:
                return False
            trigger = "import pytest"
            if trigger not in content:
                return False
            payload = (
                "\nimport sys\nfrom pathlib import Path\n"
                "sys.path.insert(0, str(Path(__file__).parent.parent))\n"
            )
            new_content = content.replace(trigger, trigger + payload)
            await self.file_system.write_file(file_path, new_content)
            logger.info(f"Fixed missing sys path for {file_path}")
            return True
        except OSError as e:
            logger.error(f"Failed to fix sys path: {e}", exc_info=True)
            return False


class AttributeErrorStrategy(FixStrategy):
    """Fixes AttributeError typos using Levenshtein distance."""

    def can_fix(self, result: TestResult) -> bool:
        return result.error_code is not None and result.error_code.code == "AttributeError"

    async def apply_fix(self, result: TestResult) -> bool:
        file_path = str(result.target)
        log = result.output_log
        try:
            module_match = re.search(r"module '([^']+)' has no attribute '([^']+)'", log)
            object_match = re.search(r"'([^']+)' object has no attribute '([^']+)'", log)

            if module_match:
                owner_name, attr_name = module_match.groups()
                fix_hint = f"# HEALER: Detected missing attribute '{attr_name}' in module '{owner_name}'\n"
            elif object_match:
                owner_name, attr_name = object_match.groups()
                fix_hint = f"# HEALER: Detected missing attribute '{attr_name}' on '{owner_name}'\n"
            else:
                return False

            content = await self.file_system.read_file(file_path)
            words = set(re.findall(r"\w+", content))
            matches = difflib.get_close_matches(attr_name, words, n=1, cutoff=0.8)

            if matches:
                suggested = matches[0]
                new_content = content.replace(f".{attr_name}", f".{suggested}")
                if new_content != content:
                    await self.file_system.write_file(file_path, new_content)
                    logger.info(f"Fixed AttributeError typo: {attr_name} -> {suggested}")
                    return True

            if fix_hint not in content:
                await self.file_system.write_file(file_path, fix_hint + content)
                logger.info(f"Added fallback hint for '{attr_name}'")
                return True
        except Exception as e:
            logger.error(f"Failed to fix attribute error: {e}", exc_info=True)
        return False


class TypeErrorStrategy(FixStrategy):
    """Fixes TypeError from missing arguments."""

    def can_fix(self, result: TestResult) -> bool:
        return result.error_code is not None and result.error_code.code == "TypeError"

    async def apply_fix(self, result: TestResult) -> bool:
        file_path = str(result.target)
        log = result.output_log
        try:
            match = re.search(
                r"(\w+)\(\) missing \d+ required positional argument[s]?: '([^']+)'", log
            )
            if not match:
                return False
            func_name = match.group(1)
            content = await self.file_system.read_file(file_path)
            new_content = content.replace(f"{func_name}()", f"{func_name}(None)")
            if new_content != content:
                await self.file_system.write_file(file_path, new_content)
                logger.info(f"Fixed TypeError: added None to {func_name}")
                return True
        except Exception as e:
            logger.error(f"Failed to fix type error: {e}", exc_info=True)
        return False


class NameErrorStrategy(FixStrategy):
    """Fixes NameError by adding common imports."""

    _COMMON_IMPORTS = {
        "os": "import os",
        "sys": "import sys",
        "pd": "import pandas as pd",
        "np": "import numpy as np",
        "plt": "import matplotlib.pyplot as plt",
        "json": "import json",
        "datetime": "from datetime import datetime",
    }

    def can_fix(self, result: TestResult) -> bool:
        return result.error_code is not None and result.error_code.code == "NameError"

    async def apply_fix(self, result: TestResult) -> bool:
        file_path = str(result.target)
        log = result.output_log
        try:
            match = re.search(r"name '([^']+)' is not defined", log)
            if not match:
                return False
            name = match.group(1)
            if name not in self._COMMON_IMPORTS:
                return False
            content = await self.file_system.read_file(file_path)
            imp = self._COMMON_IMPORTS[name]
            if imp not in content:
                await self.file_system.write_file(file_path, imp + "\n" + content)
                logger.info(f"Fixed NameError: added {imp}")
                return True
        except Exception as e:
            logger.error(f"Failed to fix name error: {e}", exc_info=True)
        return False


class AssertionErrorStrategy(FixStrategy):
    """Fixes AssertionError by patching expected values."""

    def can_fix(self, result: TestResult) -> bool:
        return result.error_code is not None and result.error_code.code == "AssertionError"

    async def apply_fix(self, result: TestResult) -> bool:
        if result.failure and result.failure.position:
            return await self._fix_with_line(result)
        return await self._fix_legacy(result)

    async def _fix_with_line(self, result: TestResult) -> bool:
        failure = result.failure
        if failure is None or failure.position is None:
            return False
        target_file = str(result.target)
        line_no = int(failure.position.line)
        msg = failure.message or ""
        try:
            match = self._parse_assertion(msg)
            if not match:
                return False
            actual, expected = match
            lines = await self.file_system.read_lines(target_file)
            idx = line_no - 1
            if idx >= len(lines):
                return False
            line = lines[idx]
            if str(expected) in line:
                lines[idx] = line.replace(str(expected), str(actual))
                await self.file_system.write_lines(target_file, lines)
                logger.info(f"Fixed assertion (literal): {expected} -> {actual}")
                return True
            assert_var = re.search(r"assert\s+\w+\s*==\s*(\w+)", line)
            if assert_var:
                expected_var = assert_var.group(1)
                search_start = max(0, idx - 10)
                for si in range(idx - 1, search_start - 1, -1):
                    var_match = re.search(
                        rf"{re.escape(expected_var)}\s*=\s*(['\"])(.+?)\1", lines[si]
                    )
                    if var_match:
                        old_val = var_match.group(2)
                        new_val = actual.strip("'\"")
                        lines[si] = lines[si].replace(
                            f"{expected_var} = '{old_val}'",
                            f"{expected_var} = '{new_val}'",
                        )
                        await self.file_system.write_lines(target_file, lines)
                        logger.info(f"Fixed assertion (variable): '{old_val}' -> '{new_val}'")
                        return True
        except Exception as e:
            logger.error(f"Failed to fix assertion: {e}", exc_info=True)
        return False

    async def _fix_legacy(self, result: TestResult) -> bool:
        file_path = str(result.target)
        log = result.output_log
        try:
            match = re.search(r"AssertionError: assert '([^']+)' == '([^']+)'", log)
            if not match:
                return False
            actual, expected = match.groups()
            lines = await self.file_system.read_lines(file_path)
            for i, line in enumerate(lines):
                if f"'{expected}'" in line and "assert" in line:
                    lines[i] = line.replace(f"'{expected}'", f"'{actual}'")
                    await self.file_system.write_lines(file_path, lines)
                    logger.info(f"Fixed legacy assertion in {file_path}")
                    return True
        except Exception as e:
            logger.error(f"Failed to fix legacy assertion: {e}", exc_info=True)
        return False

    def _parse_assertion(self, msg: str):
        match = re.search(r"assert\s+['\"]([^'\"]+)['\"]\s*==\s*['\"]([^'\"]+)['\"]", msg)
        if match:
            return match.groups()
        match = re.search(r"assert\s+(\d+)\s*==\s*(\d+)", msg)
        if match:
            return match.groups()
        match = re.search(r"assert\s+(.+)\s*==\s*(.+)", msg)
        if match:
            return match.groups()
        return None

