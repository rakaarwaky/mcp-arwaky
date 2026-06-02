"""Tests for CLI main entry."""
from click.testing import CliRunner
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from src.surfaces.cli_main_entry import cli


@pytest.fixture
def runner():
    return CliRunner()


@pytest.fixture
def mock_container():
    with patch("src.surfaces.cli_main_entry.get_container") as mock:
        container = MagicMock()
        container.test_use_case.execute = AsyncMock(return_value=MagicMock(
            passed=True, target="test.py", healed=False, healing_attempts=0, output_log="OK"
        ))
        container.analyzer.analyze_file = AsyncMock(return_value={
            "file": "test.py", "classes": [], "functions": ["foo"], "complexity_score": 5.0
        })
        container.auditor.check_coverage = AsyncMock(return_value={
            "total_pct": 85.0, "summary": "OK"
        })
        container.test_generator.generate_test = AsyncMock(return_value="Generated test")
        container.generator.generate_strings = MagicMock(return_value=["a", "b"])
        container.generator.generate_numbers = MagicMock(return_value=[1, 2])
        container.generator.generate_json = MagicMock(return_value=[{}])
        container.generator.generate_dates = MagicMock(return_value=["2024-01-01"])
        container.generator.generate_emails = MagicMock(return_value=["a@b.com"])
        container.generator.generate_all = MagicMock(return_value={"strings": []})
        container.file_system.read_file = AsyncMock(return_value="")
        container.file_system.write_file = AsyncMock(return_value=None)
        mock.return_value = container
        yield container


class TestCliRun:
    def test_run_test_text(self, runner, mock_container, tmp_path):
        f = tmp_path / "test_sample.py"
        f.write_text("def test_ok(): pass\n")
        result = runner.invoke(cli, ["run", str(f)])
        assert result.exit_code == 0
        assert "PASS" in result.output

    def test_run_test_json(self, runner, mock_container, tmp_path):
        f = tmp_path / "test_sample.py"
        f.write_text("def test_ok(): pass\n")
        result = runner.invoke(cli, ["run", str(f), "--format", "json"])
        assert result.exit_code == 0
        import json
        data = json.loads(result.output)
        assert "passed" in data

    def test_run_with_heal(self, runner, mock_container, tmp_path):
        f = tmp_path / "test_sample.py"
        f.write_text("def test_ok(): pass\n")
        result = runner.invoke(cli, ["run", str(f), "--heal", "--max-retries", "5"])
        assert result.exit_code == 0


class TestCliAnalyze:
    def test_analyze_text(self, runner, mock_container, tmp_path):
        f = tmp_path / "sample.py"
        f.write_text("def foo(): pass\n")
        result = runner.invoke(cli, ["analyze", str(f)])
        assert result.exit_code == 0
        assert "foo" in result.output

    def test_analyze_json(self, runner, mock_container, tmp_path):
        f = tmp_path / "sample.py"
        f.write_text("def foo(): pass\n")
        result = runner.invoke(cli, ["analyze", str(f), "--format", "json"])
        assert result.exit_code == 0
        import json
        data = json.loads(result.output)
        assert "functions" in data


class TestCliAudit:
    def test_audit_pass(self, runner, mock_container):
        result = runner.invoke(cli, ["audit", ".", "--threshold", "80"])
        assert result.exit_code == 0
        assert "PASS" in result.output

    def test_audit_fail(self, runner, mock_container):
        mock_container.auditor.check_coverage = AsyncMock(return_value={
            "total_pct": 50.0, "summary": "Low"
        })
        result = runner.invoke(cli, ["audit", ".", "--threshold", "80"])
        assert result.exit_code == 1
        assert "FAIL" in result.output

    def test_audit_json(self, runner, mock_container):
        result = runner.invoke(cli, ["audit", ".", "--format", "json"])
        assert result.exit_code == 0
        import json
        data = json.loads(result.output)
        assert "total_pct" in data

    def test_audit_error(self, runner, mock_container):
        mock_container.auditor.check_coverage = AsyncMock(return_value={
            "error": "coverage failed"
        })
        result = runner.invoke(cli, ["audit", "."])
        assert result.exit_code == 0
        assert "Error" in result.output


class TestCliGenerate:
    def test_generate(self, runner, mock_container, tmp_path):
        f = tmp_path / "sample.py"
        f.write_text("def foo(): pass\n")
        result = runner.invoke(cli, ["generate", str(f)])
        assert result.exit_code == 0


class TestCliGenerateData:
    def test_generate_strings(self, runner, mock_container):
        result = runner.invoke(cli, ["generate-data", "strings"])
        assert result.exit_code == 0

    def test_generate_numbers(self, runner, mock_container):
        result = runner.invoke(cli, ["generate-data", "numbers"])
        assert result.exit_code == 0

    def test_generate_json(self, runner, mock_container):
        result = runner.invoke(cli, ["generate-data", "json"])
        assert result.exit_code == 0

    def test_generate_dates(self, runner, mock_container):
        result = runner.invoke(cli, ["generate-data", "dates"])
        assert result.exit_code == 0

    def test_generate_emails(self, runner, mock_container):
        result = runner.invoke(cli, ["generate-data", "emails"])
        assert result.exit_code == 0

    def test_generate_all(self, runner, mock_container):
        result = runner.invoke(cli, ["generate-data", "all"])
        assert result.exit_code == 0

    def test_generate_data_json_format(self, runner, mock_container):
        result = runner.invoke(cli, ["generate-data", "strings", "--format", "text"])
        assert result.exit_code == 0


class TestCliVersion:
    def test_version(self, runner):
        result = runner.invoke(cli, ["version"])
        assert result.exit_code == 0
        assert "1.1.3" in result.output


class TestCliInit:
    def test_init(self, runner, tmp_path):
        config = tmp_path / "config.json"
        result = runner.invoke(cli, ["init", str(config)])
        assert result.exit_code == 0
        assert "initialized" in result.output.lower()
        assert config.exists()


class TestCliMigrate:
    def test_migrate_basic(self, runner, mock_container, tmp_path):
        f = tmp_path / "test_old.py"
        content = "import unittest\nclass TestFoo(unittest.TestCase):\n    def test_eq(self):\n        self.assertEqual(1, 1)\n"
        f.write_text(content)
        mock_container.file_system.read_file.return_value = content
        result = runner.invoke(cli, ["migrate", str(f)])
        assert result.exit_code == 0
        assert "Migrated" in result.output

    def test_migrate_with_backup(self, runner, mock_container, tmp_path):
        f = tmp_path / "test_old.py"
        content = "import unittest\nclass TestFoo(unittest.TestCase):\n    def test_true(self):\n        self.assertTrue(True)\n"
        f.write_text(content)
        mock_container.file_system.read_file.return_value = content
        result = runner.invoke(cli, ["migrate", str(f), "--backup"])
        assert result.exit_code == 0
        assert "Backup created" in result.output

    def test_migrate_error(self, runner, mock_container, tmp_path):
        f = tmp_path / "test_err.py"
        f.write_text("import unittest\n")
        mock_container.file_system.read_file.side_effect = Exception("read error")
        result = runner.invoke(cli, ["migrate", str(f)])
        assert result.exit_code == 1
        assert "Migration failed" in result.output


class TestCliFindSlow:
    def test_find_slow(self, runner):
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(
                stdout="slow test output\n", stderr="", returncode=0
            )
            result = runner.invoke(cli, ["find-slow", "."])
            assert result.exit_code == 0
            assert "slow test output" in result.output

    def test_find_slow_error(self, runner):
        with patch("subprocess.run", side_effect=Exception("subprocess error")):
            result = runner.invoke(cli, ["find-slow", "."])
            assert result.exit_code == 1
            assert "Error" in result.output

    def test_find_slow_stderr(self, runner):
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(
                stdout="out\n", stderr="warning\n", returncode=0
            )
            result = runner.invoke(cli, ["find-slow", "."])
            assert result.exit_code == 0


class TestCliMockGenerate:
    def test_mock_generate_to_file(self, runner, tmp_path):
        out = tmp_path / "mock_test.py"
        result = runner.invoke(cli, ["mock-generate", "def get_user(id: int) -> User", "--output", str(out)])
        assert result.exit_code == 0
        assert "Mock saved" in result.output
        assert out.exists()

    def test_mock_generate_stdout(self, runner):
        result = runner.invoke(cli, ["mock-generate", "def my_func(a, b)"])
        assert result.exit_code == 0
        assert "mock_my_func" in result.output

    def test_mock_generate_invalid(self, runner):
        result = runner.invoke(cli, ["mock-generate", "not a function"])
        assert result.exit_code == 1
        assert "Invalid signature" in result.output


class TestCliWorkflow:
    def test_workflow_coverage_gate_pass(self, runner, mock_container):
        result = runner.invoke(cli, ["workflow", "coverage-gate", ".", "--threshold", "80"])
        assert result.exit_code == 0
        assert "PASS" in result.output

    def test_workflow_coverage_gate_fail(self, runner, mock_container):
        mock_container.auditor.check_coverage = AsyncMock(return_value={
            "total_pct": 50.0, "summary": "Low"
        })
        result = runner.invoke(cli, ["workflow", "coverage-gate", ".", "--threshold", "80"])
        assert result.exit_code == 1
        assert "FAIL" in result.output

    def test_workflow_test_and_fix(self, runner, mock_container):
        mock_container.test_use_case.execute = AsyncMock(return_value=MagicMock(
            passed=True, target="test.py", healed=False, healing_attempts=0, output_log="OK"
        ))
        result = runner.invoke(cli, ["workflow", "test-and-fix", "."])
        assert result.exit_code == 0

    def test_workflow_test_and_fix_failed(self, runner, mock_container):
        mock_container.test_use_case.execute = AsyncMock(return_value=MagicMock(
            passed=False, target="test.py", healed=False, healing_attempts=0, output_log="FAIL"
        ))
        result = runner.invoke(cli, ["workflow", "test-and-fix", "."])
        assert result.exit_code == 0
        assert "Analyzing failures" in result.output

    def test_workflow_full_suite(self, runner, mock_container):
        result = runner.invoke(cli, ["workflow", "full-suite", "."])
        assert result.exit_code == 0
        assert "coming soon" in result.output.lower() or "full suite" in result.output.lower()
