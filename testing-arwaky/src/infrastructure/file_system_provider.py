from pathlib import Path
import asyncio
from ..contract import IFileSystem
from ..taxonomy.lint_identifier_vo import FilePath


class PathValidationError(ValueError):
    """Raised when a path fails validation."""
    pass


class LocalFileSystem(IFileSystem):
    """Infrastructure adapter for local file system access."""

    def __init__(self, allowed_base: str | None = None):
        """Initialize with optional allowed base directory.

        Args:
            allowed_base: If set, all file operations are restricted to this directory.
                         Defaults to current working directory.
        """
        self.allowed_base = Path(allowed_base).resolve() if allowed_base else Path.cwd().resolve()

    def _validate_path(self, path: str) -> Path:
        """Validate that path is within allowed directory.

        Fix #8: Prevents path traversal attacks by resolving to absolute path
        and verifying it's within the allowed base directory.
        """
        p = Path(path)
        # Resolve relative paths relative to allowed_base, not CWD
        if not p.is_absolute():
            resolved = (self.allowed_base / p).resolve()
        else:
            resolved = p.resolve()
        try:
            resolved.relative_to(self.allowed_base)
        except ValueError:
            raise PathValidationError(
                f"Path '{path}' is outside allowed directory '{self.allowed_base}'"
            )
        return resolved

    async def read_file(self, path: FilePath | str) -> str:
        path_str = str(path)
        validated = self._validate_path(path_str)
        return await asyncio.to_thread(self._sync_read_file, validated)

    def _sync_read_file(self, path: Path) -> str:
        with open(path, "r") as f:
            return f.read()

    async def write_file(self, path: FilePath | str, content: str) -> None:
        path_str = str(path)
        validated = self._validate_path(path_str)
        await asyncio.to_thread(self._sync_write_file, validated, content)

    def _sync_write_file(self, path: Path, content: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            f.write(content)

    async def file_exists(self, path: FilePath | str) -> bool:
        path_str = str(path)
        try:
            validated = self._validate_path(path_str)
            return await asyncio.to_thread(validated.exists)
        except Exception:
            return False

    async def read_lines(self, path: FilePath | str) -> list[str]:
        path_str = str(path)
        validated = self._validate_path(path_str)
        return await asyncio.to_thread(self._sync_read_lines, validated)

    def _sync_read_lines(self, path: Path) -> list[str]:
        with open(path, "r") as f:
            return f.readlines()

    async def write_lines(self, path: FilePath | str, lines: list[str]) -> None:
        path_str = str(path)
        validated = self._validate_path(path_str)
        await asyncio.to_thread(self._sync_write_lines, validated, lines)

    def _sync_write_lines(self, path: Path, lines: list[str]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            f.writelines(lines)

    async def makedirs(self, path: FilePath | str, exist_ok: bool = True) -> None:
        path_str = str(path)
        validated = self._validate_path(path_str)
        await asyncio.to_thread(validated.mkdir, parents=True, exist_ok=exist_ok)
