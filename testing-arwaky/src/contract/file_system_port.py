"""file_system_port — Infrastructure contract for file system operations.

Infrastructure adapters (e.g., LocalFileSystem) MUST implement this.
Contract layer MUST use taxonomy types — no primitives.
"""

from abc import ABC, abstractmethod
from src.taxonomy.lint_identifier_vo import FilePath


class IFileSystem(ABC):
    """File system operations that infrastructure adapters must provide."""

    @abstractmethod
    async def read_file(self, path: FilePath | str) -> str:
        """Reads content from a file."""
        ...

    @abstractmethod
    async def write_file(self, path: FilePath | str, content: str) -> None:
        """Writes content to a file."""
        ...

    @abstractmethod
    async def file_exists(self, path: FilePath | str) -> bool:
        """Checks if a file exists."""
        ...

    @abstractmethod
    async def read_lines(self, path: FilePath | str) -> list[str]:
        """Reads content as lines."""
        ...

    @abstractmethod
    async def write_lines(self, path: FilePath | str, lines: list[str]) -> None:
        """Writes lines to a file."""
        ...

    @abstractmethod
    async def makedirs(self, path: FilePath | str, exist_ok: bool = True) -> None:
        """Creates a directory and all parent directories."""
        ...
