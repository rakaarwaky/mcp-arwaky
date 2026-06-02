"""lint_identifier_vo — Identifier value objects."""

from pydantic import BaseModel, ConfigDict, field_validator


class TestName(BaseModel):
    """Test identifier."""
    __test__ = False  # Not a pytest test class
    model_config = ConfigDict(frozen=True)

    value: str

    @field_validator("value")
    @classmethod
    def check_non_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Test name cannot be empty")
        return v.strip()

    def __str__(self) -> str:
        return self.value

    def __hash__(self) -> int:
        return hash(self.value)

    def __eq__(self, other: object) -> bool:
        if isinstance(other, TestName):
            return self.value == other.value
        if isinstance(other, str):
            return self.value == other
        return NotImplemented


class FilePath(BaseModel):
    """File path identifier."""
    model_config = ConfigDict(frozen=True)

    value: str

    @field_validator("value")
    @classmethod
    def check_non_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("File path cannot be empty")
        return v.strip().replace("\\", "/").rstrip("/")

    def __str__(self) -> str:
        return self.value

    def __hash__(self) -> int:
        return hash(self.value)

    def __eq__(self, other: object) -> bool:
        if isinstance(other, FilePath):
            return self.value == other.value
        if isinstance(other, str):
            return self.value == other
        return NotImplemented

    @property
    def extension(self) -> str:
        parts = self.value.rsplit(".", 1)
        return parts[-1] if len(parts) > 1 else ""

    def has_extension(self, ext: str) -> bool:
        return self.extension.lower() == ext.lower()


class SymbolName(BaseModel):
    """Code symbol identifier (function, class, variable)."""
    model_config = ConfigDict(frozen=True)

    value: str

    @field_validator("value")
    @classmethod
    def check_non_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Symbol name cannot be empty")
        return v.strip()

    def __str__(self) -> str:
        return self.value

    def __hash__(self) -> int:
        return hash(self.value)

    def __eq__(self, other: object) -> bool:
        if isinstance(other, SymbolName):
            return self.value == other.value
        if isinstance(other, str):
            return self.value == other
        return NotImplemented


class DirectoryPath(BaseModel):
    """Directory path identifier."""
    model_config = ConfigDict(frozen=True)

    value: str

    @field_validator("value")
    @classmethod
    def check_non_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Directory path cannot be empty")
        return v.strip().replace("\\", "/").rstrip("/")

    def __str__(self) -> str:
        return self.value

    def __hash__(self) -> int:
        return hash(self.value)

    def __eq__(self, other: object) -> bool:
        if isinstance(other, DirectoryPath):
            return self.value == other.value
        if isinstance(other, str):
            return self.value == other
        return NotImplemented
