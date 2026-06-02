#!/usr/bin/env python3
"""Agentic Testing CLI: Autonomous Unit Testing & Self-Healing."""

import asyncio
import click
import json
import re
import sys
from pathlib import Path
from ..agent.dependency_injection_container import get_container


@click.group()
@click.version_option(version='1.1.1', prog_name='agentic-test')
@click.pass_context
def cli(ctx: click.Context) -> None:
    """Agentic Testing CLI: Autonomous Unit Testing with Self-Healing.

    Run tests, analyze code, audit coverage, and generate test data.
    """
    ctx.ensure_object(dict)
    ctx.obj['container'] = get_container()


# =============================================================================
# Core Test Commands
# =============================================================================

@cli.command('run')
@click.argument('test_path', type=click.Path(exists=True))
@click.option('--heal', is_flag=True, help='Enable self-healing')
@click.option('--max-retries', default=3, help='Max healing attempts')
@click.option('--format', type=click.Choice(['text', 'json']), default='text', help='Output format')
@click.pass_context
def run_test(ctx: click.Context, test_path: str, heal: bool, max_retries: int, format: str) -> None:
    """Run tests with optional self-healing.

    Example: agentic-test run tests/test_parser.py --heal --max-retries 3
    """
    container = ctx.obj['container']

    async def _run():
        result = await container.test_use_case.execute(test_path, max_retries if heal else 0)

        if format == 'json':
            click.echo(json.dumps({
                'passed': result.passed,
                'target': result.target,
                'healed': result.healed,
                'healing_attempts': result.healing_attempts,
                'output': result.output_log
            }, indent=2))
        else:
            status = "✅ PASS" if result.passed else "❌ FAIL"
            healing = f" (healed after {result.healing_attempts} attempts)" if result.healed else ""
            click.echo(f"{status}{healing}")
            click.echo(f"Target: {result.target}")
            click.echo("\nOutput Log:")
            click.echo(result.output_log)

    asyncio.run(_run())


@cli.command('analyze')
@click.argument('target_file', type=click.Path(exists=True))
@click.option('--format', type=click.Choice(['text', 'json']), default='text')
@click.pass_context
def analyze_file(ctx: click.Context, target_file: str, format: str) -> None:
    """AST analysis of source file.

    Returns classes, functions, and complexity score.
    """
    container = ctx.obj['container']

    async def _analyze():
        result = await container.analyzer.analyze_file(target_file)

        if format == 'json':
            click.echo(json.dumps(result, indent=2))
        else:
            click.echo(f"File: {result.get('file', target_file)}")
            click.echo(f"Classes: {', '.join(result.get('classes', []))}")
            click.echo(f"Functions: {', '.join(result.get('functions', []))}")
            click.echo(f"Complexity Score: {result.get('complexity_score', 'N/A')}")

    asyncio.run(_analyze())


@cli.command('audit')
@click.argument('target_dir', type=click.Path(exists=True))
@click.option('--threshold', default=80, help='Coverage threshold %')
@click.option('--format', type=click.Choice(['text', 'json']), default='text')
@click.pass_context
def audit_coverage(ctx: click.Context, target_dir: str, threshold: int, format: str) -> None:
    """Coverage audit.

    Fails if coverage < threshold.
    """
    container = ctx.obj['container']

    async def _audit():
        result = await container.auditor.check_coverage(target_dir)

        if format == 'json':
            click.echo(json.dumps(result, indent=2))
        else:
            if 'error' in result:
                click.echo(f"❌ Error: {result['error']}")
            else:
                coverage = result.get('total_pct', 0)
                status = "✅ PASS" if coverage >= threshold else "❌ FAIL"
                click.echo(f"{status} Coverage: {coverage}% (threshold: {threshold}%)")
                click.echo(result.get('summary', ''))

                if coverage < threshold:
                    sys.exit(1)

    asyncio.run(_audit())


@cli.command('generate')
@click.argument('source_file', type=click.Path(exists=True))
@click.option('--output', help='Output file path (default: tests/test_<name>.py)')
@click.pass_context
def generate_test(ctx: click.Context, source_file: str, output: str | None) -> None:
    """Generate boilerplate tests.

    Creates skeleton test file based on AST analysis.
    """
    container = ctx.obj['container']

    async def _generate():
        result = await container.test_generator.generate_test(source_file)
        click.echo(result)

    asyncio.run(_generate())


# =============================================================================
# Governance Commands
# =============================================================================

@cli.command('governance')
@click.argument('target_dir', type=click.Path(exists=True), default='.')
@click.option('--format', type=click.Choice(['text', 'json']), default='text')
@click.pass_context
def audit_governance(ctx: click.Context, target_dir: str, format: str) -> None:
    """Architectural governance scan.
    
    Checks for AES layer rule violations.
    """
    container = ctx.obj['container']

    async def _scan():
        violations = await asyncio.to_thread(container.governance.scan, target_dir)

        if format == 'json':
            click.echo(json.dumps([v.__dict__ for v in violations], indent=2))
        else:
            if not violations:
                click.echo("✅ No architecture violations found.")
            else:
                click.echo(f"❌ Found {len(violations)} architecture violations:")
                for v in violations:
                    click.echo(f"- {v.message} ({v.file_path}:{v.line_no})")
                sys.exit(1)

    asyncio.run(_scan())


# =============================================================================
# Test Data Generation
# =============================================================================

@cli.command('generate-data')
@click.argument('data_type', type=click.Choice(['strings', 'numbers', 'json', 'dates', 'emails', 'all']))
@click.option('--count', default=5, help='Number of items to generate')
@click.option('--format', type=click.Choice(['text', 'json']), default='json')
@click.pass_context
def generate_data(ctx: click.Context, data_type: str, count: int, format: str) -> None:
    """Generate synthetic test data.

    Types: strings, numbers, json, dates, emails, all
    """
    container = ctx.obj['container']

    async def _generate():
        generators = {
            'strings': lambda: container.generator.generate_strings(count),
            'numbers': lambda: container.generator.generate_numbers(count),
            'json': lambda: container.generator.generate_json(count),
            'dates': lambda: container.generator.generate_dates(count),
            'emails': lambda: container.generator.generate_emails(count),
            'all': lambda: container.generator.generate_all(),
        }

        result = generators.get(data_type, lambda: {})()

        if format == 'json':
            click.echo(json.dumps(result, indent=2))
        else:
            click.echo(result)

    asyncio.run(_generate())


# =============================================================================
# Test Migration
# =============================================================================

@cli.command('migrate')
@click.argument('test_path', type=click.Path(exists=True))
@click.option('--backup', is_flag=True, help='Create backup before migration')
@click.pass_context
def migrate_test(ctx: click.Context, test_path: str, backup: bool) -> None:
    """Migrate unittest to pytest.

    Converts:
    - unittest.TestCase → plain class
    - self.assertEqual() → assert
    - self.assertTrue() → assert
    """
    container = ctx.obj['container']

    async def _migrate():
        try:
            content = await container.file_system.read_file(test_path)

            if backup:
                backup_path = test_path + '.bak'
                await container.file_system.write_file(backup_path, content)
                click.echo(f"✅ Backup created: {backup_path}")

            # Migration logic using regex for valid Python output
            new_content = content.replace("unittest.TestCase", "")
            # Fix #1: Use regex to produce valid pytest assertions
            new_content = re.sub(
                r'self\.assertEqual\((.+?),\s*(.+?)\)', r'assert \1 == \2', new_content
            )
            new_content = re.sub(
                r'self\.assertTrue\((.+?)\)', r'assert \1', new_content
            )
            new_content = re.sub(
                r'self\.assertFalse\((.+?)\)', r'assert not \1', new_content
            )
            new_content = re.sub(r'import unittest\n', '', new_content)

            await container.file_system.write_file(test_path, new_content)
            click.echo(f"✅ Migrated {test_path} to pytest-style")

        except Exception as e:
            click.echo(f"❌ Migration failed: {str(e)}", err=True)
            sys.exit(1)

    asyncio.run(_migrate())


# =============================================================================
# Performance Analysis
# =============================================================================

@cli.command('find-slow')
@click.argument('target_dir', type=click.Path(exists=True))
@click.option('--threshold', default=1.0, help='Seconds threshold for slow')
@click.option('--top', default=10, help='Show top N slow tests')
@click.pass_context
def find_slow_tests(ctx: click.Context, target_dir: str, threshold: float, top: int) -> None:
    """Find slow tests.

    Uses pytest --durations to identify bottlenecks.
    """
    import subprocess

    cmd = [
        sys.executable, '-m', 'pytest',
        target_dir,
        '--durations', str(top),
        f'--durations-min={threshold}',
        '-v'
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
        click.echo(result.stdout)
        if result.stderr:
            click.echo(result.stderr, err=True)
    except Exception as e:
        click.echo(f"❌ Error: {str(e)}", err=True)
        sys.exit(1)


# =============================================================================
# Mock Generation
# =============================================================================

@cli.command('mock-generate')
@click.argument('function_signature')
@click.option('--output', help='Output file path')
@click.pass_context
def mock_generate(ctx: click.Context, function_signature: str, output: str | None) -> None:
    """Generate mock from signature.

    Example: agentic-test mock-generate "def get_user(id: int) -> User"
    """
    import re

    match = re.search(r'def\s+(\w+)\((.*)\)', function_signature)
    if not match:
        click.echo("❌ Invalid signature. Example: 'def my_func(a, b)'", err=True)
        sys.exit(1)

    name, args = match.groups()

    mock_code = f"""from unittest.mock import Mock

# Mock for {name}({args})
mock_{name} = Mock()
mock_{name}.return_value = None

# Usage example:
# result = mock_{name}({args.split(',')[0] if args else ''})
# assert result is None
"""

    if output:
        Path(output).parent.mkdir(parents=True, exist_ok=True)
        Path(output).write_text(mock_code)
        click.echo(f"✅ Mock saved to {output}")
    else:
        click.echo(mock_code)


# =============================================================================
# Workflow Commands
# =============================================================================

@cli.command('workflow')
@click.argument('workflow', type=click.Choice(['test-and-fix', 'coverage-gate', 'full-suite']))
@click.argument('target', type=click.Path(exists=True))
@click.option('--threshold', default=80, help='Coverage threshold')
@click.option('--max-retries', default=3, help='Max healing attempts')
@click.pass_context
def run_workflow(ctx: click.Context, workflow: str, target: str, threshold: int, max_retries: int) -> None:
    """Run pre-defined workflows.

    Workflows:
    - test-and-fix: Run tests, auto-heal, verify
    - coverage-gate: Ensure coverage threshold
    - full-suite: Run all tests with healing
    """
    container = ctx.obj['container']

    async def _run_workflow():
        if workflow == 'test-and-fix':
            click.echo("🔄 Running test-and-fix workflow...")

            # Step 1: Run with healing
            result = await container.test_use_case.execute(target, max_retries)
            click.echo(f"Step 1: {'✅ PASS' if result.passed else '❌ FAIL'}")

            # Step 2: If failed, analyze
            if not result.passed:
                click.echo("Step 2: Analyzing failures...")
                # Analysis would go here

            # Step 3: Re-run without healing to verify
            final = await container.test_use_case.execute(target, 0)
            click.echo(f"Step 3: Final status: {'✅ PASS' if final.passed else '❌ FAIL'}")

        elif workflow == 'coverage-gate':
            click.echo("🚪 Running coverage gate...")
            result = await container.auditor.check_coverage(target)
            coverage = result.get('total_pct', 0)

            if coverage >= threshold:
                click.echo(f"✅ PASS: Coverage {coverage}% >= {threshold}%")
            else:
                click.echo(f"❌ FAIL: Coverage {coverage}% < {threshold}%")
                sys.exit(1)

        else:  # workflow == 'full-suite' (validated by Click Choice)
            click.echo("🏃 Running full test suite...")
            # Would iterate over all test files
            click.echo("Full suite workflow - coming soon")

    asyncio.run(_run_workflow())


# =============================================================================
# Utility Commands
# =============================================================================

@cli.command('version')
def show_version() -> None:
    """Show version information."""
    click.echo("Agentic Testing CLI v1.1.1")
    click.echo(f"Python: {sys.version}")


@cli.command('init')
@click.argument('config_path', type=click.Path())
@click.pass_context
def init_config(ctx: click.Context, config_path: str) -> None:
    """Initialize configuration file."""
    config = {
        "test": {
            "default_max_retries": 3,
            "heal_by_default": True,
        },
        "audit": {
            "default_threshold": 80,
        },
        "generate": {
            "test_directory": "tests",
        }
    }

    Path(config_path).parent.mkdir(parents=True, exist_ok=True)
    Path(config_path).write_text(json.dumps(config, indent=2))
    click.echo(f"✅ Configuration initialized at {config_path}")


if __name__ == '__main__':  # pragma: no cover
    cli()
