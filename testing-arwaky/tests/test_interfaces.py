"""Tests for contract interfaces — ABC enforcement."""

import pytest
from src.contract import (
    ITestRunner,
    ITestHealer,
    ICodeAnalyzer,
    IQualityAuditor,
    ITestGenerator,
    IFileSystem,
)


class TestITestRunner:
    """Verify ITestRunner abstract contract."""

    def test_cannot_instantiate(self):
        """ITestRunner is abstract and cannot be instantiated directly."""
        with pytest.raises(TypeError):
            ITestRunner()

    def test_requires_run_test(self):
        """Concrete subclass must implement run_test."""

        class Incomplete(ITestRunner):
            pass

        with pytest.raises(TypeError):
            Incomplete()

    def test_concrete_subclass_ok(self):
        """Concrete subclass with run_test can be instantiated."""

        class Concrete(ITestRunner):
            async def run_test(self, test_path: str):
                return None

        instance = Concrete()
        assert isinstance(instance, ITestRunner)


class TestITestHealer:
    """Verify ITestHealer abstract contract."""

    def test_cannot_instantiate(self):
        with pytest.raises(TypeError):
            ITestHealer()

    def test_requires_attempt_fix(self):
        class Incomplete(ITestHealer):
            pass

        with pytest.raises(TypeError):
            Incomplete()

    def test_concrete_subclass_ok(self):
        class Concrete(ITestHealer):
            async def attempt_fix(self, result):
                return True

        instance = Concrete()
        assert isinstance(instance, ITestHealer)


class TestICodeAnalyzer:
    """Verify ICodeAnalyzer abstract contract."""

    def test_cannot_instantiate(self):
        with pytest.raises(TypeError):
            ICodeAnalyzer()

    def test_requires_analyze_file(self):
        class Incomplete(ICodeAnalyzer):
            pass

        with pytest.raises(TypeError):
            Incomplete()

    def test_concrete_subclass_ok(self):
        class Concrete(ICodeAnalyzer):
            async def analyze_file(self, file_path: str):
                return {"functions": [], "classes": []}

        instance = Concrete()
        assert isinstance(instance, ICodeAnalyzer)


class TestIQualityAuditor:
    """Verify IQualityAuditor abstract contract."""

    def test_cannot_instantiate(self):
        with pytest.raises(TypeError):
            IQualityAuditor()

    def test_requires_check_coverage(self):
        class Incomplete(IQualityAuditor):
            pass

        with pytest.raises(TypeError):
            Incomplete()

    def test_concrete_subclass_ok(self):
        class Concrete(IQualityAuditor):
            async def check_coverage(self, target_dir: str):
                return {"coverage": 100}

        instance = Concrete()
        assert isinstance(instance, IQualityAuditor)


class TestITestGenerator:
    """Verify ITestGenerator abstract contract."""

    def test_cannot_instantiate(self):
        with pytest.raises(TypeError):
            ITestGenerator()

    def test_requires_generate_test(self):
        class Incomplete(ITestGenerator):
            pass

        with pytest.raises(TypeError):
            Incomplete()

    def test_concrete_subclass_ok(self):
        class Concrete(ITestGenerator):
            async def generate_test(self, source_file: str):
                return "# test content"

        instance = Concrete()
        assert isinstance(instance, ITestGenerator)


class TestIFileSystem:
    """Verify IFileSystem abstract contract."""

    def test_cannot_instantiate(self):
        with pytest.raises(TypeError):
            IFileSystem()

    def test_requires_all_methods(self):
        """Partial implementations cannot be instantiated."""

        class PartialRead(IFileSystem):
            def read_file(self, path):
                return ""

        with pytest.raises(TypeError):
            PartialRead()

    def test_concrete_subclass_ok(self):
        """Full implementation can be instantiated."""

        class InMemoryFS(IFileSystem):
            def __init__(self):
                self._files = {}

            def read_file(self, path: str) -> str:
                return self._files.get(path, "")

            def write_file(self, path: str, content: str) -> None:
                self._files[path] = content

            def file_exists(self, path: str) -> bool:
                return path in self._files

            def read_lines(self, path: str) -> list[str]:
                return self._files.get(path, "").splitlines(keepends=True)

            def write_lines(self, path: str, lines: list[str]) -> None:
                self._files[path] = "".join(lines)

            def makedirs(self, path: str, exist_ok: bool = True) -> None:
                pass

        fs = InMemoryFS()
        assert isinstance(fs, IFileSystem)

    def test_interface_has_6_abstract_methods(self):
        """IFileSystem should have exactly 6 abstract methods."""
        import inspect

        abstract_methods = {
            name
            for name, method in inspect.getmembers(IFileSystem)
            if getattr(method, "__isabstractmethod__", False)
        }
        assert abstract_methods == {
            "read_file",
            "write_file",
            "file_exists",
            "read_lines",
            "write_lines",
            "makedirs",
        }
