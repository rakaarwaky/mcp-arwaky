"""Shared test fixtures for agentic-testing."""
import pytest
from unittest.mock import MagicMock


@pytest.fixture
def mock_file_system():
    """Mock file system for testing."""
    fs = MagicMock()
    fs.read_file.return_value = "import pytest\nimport sys\n"
    fs.write_file.return_value = None
    fs.file_exists.return_value = True
    fs.read_lines.return_value = ["import pytest", "import sys", ""]
    fs.write_lines.return_value = None
    fs.makedirs.return_value = None
    return fs


@pytest.fixture
def mock_healer(mock_file_system):
    """Mock healer for testing."""
    from src.capabilities.test_healing_actions import (
        ImportErrorStrategy,
        AttributeErrorStrategy,
        TypeErrorStrategy,
        NameErrorStrategy,
        AssertionErrorStrategy,
    )
    return {
        "import": ImportErrorStrategy(mock_file_system),
        "attribute": AttributeErrorStrategy(mock_file_system),
        "type": TypeErrorStrategy(mock_file_system),
        "name": NameErrorStrategy(mock_file_system),
        "assertion": AssertionErrorStrategy(mock_file_system),
    }
