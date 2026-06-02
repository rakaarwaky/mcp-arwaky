# Local AI Prompt: End-to-End Agentic-Testing CLI Testing

**Instructions:** You are an AI capable of running terminal commands. Perform an end-to-end test of **every** CLI command listed below sequentially within the `agentic-testing` project root directory. For each command, record:

- The command executed
- **Exit code** – must be 0 unless specified otherwise
- **Success indicator** (specific string that must appear in the output, or a file successfully created)
- If a command fails, stop the testing and report the cause.

### Initial Setup
```bash
# Ensure you are in the agentic-testing project root
cd /home/raka/mcp-servers/agentic-testing

# Create and activate a virtual environment (if not already done)
python3.12 -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Install the project in development mode
pip install -e ".[dev]"

# Verify CLI availability
agentic-test version
```
**Success Indicator:** Output displays version `1.1.3` (or the latest version). Exit code 0.

### Prepare Test Project
```bash
mkdir -p test_app/src test_app/tests
cat > test_app/src/logic.py << 'EOF'
class Calculator:
    def add(self, a, b):
        return a + b
    
    def divide(self, a, b):
        if b == 0:
            raise ValueError("Cannot divide by zero")
        return a / b
EOF

cat > test_app/tests/test_logic.py << 'EOF'
import pytest
from test_app.src.logic import Calculator

def test_add():
    calc = Calculator()
    assert calc.add(2, 3) == 5

def test_divide():
    calc = Calculator()
    assert calc.divide(10, 2) == 5
EOF

cat > test_app/tests/test_slow.py << 'EOF'
import time
import pytest

def test_slow_one():
    time.sleep(1.1)
    assert True

def test_slow_two():
    time.sleep(0.5)
    assert True
EOF

cat > test_app/tests/test_legacy.py << 'EOF'
import unittest

class TestLegacy(unittest.TestCase):
    def test_legacy_math(self):
        self.assertEqual(1 + 1, 2)
EOF
```

---

## CLI Command Testing (Core)

### 1. `agentic-test version`
**Success Indicator:** Exit code 0. Output shows `v1.1.3`.

### 2. `agentic-test --help`
**Success Indicator:** Exit code 0. Lists available commands: `run`, `analyze`, `audit`, `generate`, `generate-data`, `migrate`, `find-slow`, `mock-generate`, `workflow`, `version`, `init`, `governance`.

### 3. `agentic-test init`
**Success Indicator:** Exit code 0. Output contains `Initialized configuration` or similar success message.

### 4. `agentic-test run test_app/tests/test_logic.py`
**Success Indicator:** Exit code 0. Output shows `2 passed` or equivalent.

---

## Analysis & Auditing Testing

### 5. `agentic-test analyze test_app/src/logic.py`
**Success Indicator:** Exit code 0. Output contains class `Calculator` and functions `add`, `divide`. Complexity score is displayed.

### 6. `agentic-test audit test_app/src --threshold 50`
**Success Indicator:** Exit code 0. Output shows coverage percentage (e.g., `PASS` if > 50%).

### 7. `agentic-test governance test_app/src --format text`
**Success Indicator:** Exit code 0. Output contains `No architecture violations found` (default for clean setup).

---

## Generation & Data Testing

### 8. `agentic-test generate test_app/src/logic.py --output test_app/tests/test_logic_generated.py`
**Success Indicator:** Exit code 0. File `test_app/tests/test_logic_generated.py` is created with boilerplate tests.

### 9. `agentic-test generate-data strings --count 5 --format json`
**Success Indicator:** Exit code 0. Output is valid JSON array with 5 random strings.

### 10. `agentic-test generate-data int --count 3`
**Success Indicator:** Exit code 0. Output contains 3 integers.

### 11. `agentic-test mock-generate "def process_data(data: dict) -> bool" --output test_app/tests/mock_data.py`
**Success Indicator:** Exit code 0. File `test_app/tests/mock_data.py` is created with a mock implementation of `process_data`.

---

## Optimization & Migration Testing

### 12. `agentic-test find-slow test_app/tests --threshold 0.5 --top 2`
**Success Indicator:** Exit code 0. Output lists `test_slow_one` and `test_slow_two` as slow tests.

### 13. `agentic-test migrate test_app/tests/test_legacy.py`
**Success Indicator:** Exit code 0. Output contains `Migrated unittest to pytest` or similar. File is updated or a new one created (depending on implementation).

---

## Workflow Testing

### 14. `agentic-test workflow coverage-gate test_app/src --threshold 80`
**Success Indicator:** Exit code 1 (since coverage might be lower than 80). Output indicates failure of the gate.

### 15. `agentic-test workflow self-heal test_app/tests/test_logic.py`
**Success Indicator:** Exit code 0. Output shows "Running self-healing workflow...".

---

## Maintenance & Utilities

### 16. `agentic-test --version`
**Success Indicator:** Same as `version`.

### 17. `agentic-test config show` (if available)
**Success Indicator:** Exit code 0. Displays current config.

---

## Final Cleanup

### 18. `rm -rf test_app`
**Success Indicator:** Directory removal command succeeds.

---

**End of Testing.**  
Create a final report summarizing:
- Total commands executed
- Number of successful vs. failed commands
- If any failures occurred, specify the command and the cause.
