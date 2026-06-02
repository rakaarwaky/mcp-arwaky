import pytest
from src.capabilities.code_analysis_actions import AstAnalyzer
from src.infrastructure.file_system_provider import LocalFileSystem
import os


@pytest.mark.asyncio
async def test_ast_analyzer_basic():
    fs = LocalFileSystem()
    analyzer = AstAnalyzer(file_system=fs)
    # Create a dummy file for analysis
    dummy_file = "dummy_test.py"
    with open(dummy_file, "w") as f:
        f.write(
            "class TestClass:\n    def method(self):\n        pass\n\ndef function():\n    pass"
        )

    try:
        result = await analyzer.analyze_file(dummy_file)
        assert result["classes"] == ["TestClass"]
        assert "function" in result["functions"]
        assert result["complexity_score"] > 0
    finally:
        if os.path.exists(dummy_file):
            os.remove(dummy_file)


@pytest.mark.asyncio
async def test_ast_analyzer_error():
    fs = LocalFileSystem()
    analyzer = AstAnalyzer(file_system=fs)
    result = await analyzer.analyze_file("non_existent.py")
    assert "error" in result
