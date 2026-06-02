"""governance_adapter — Architectural layer rule enforcer (Capability).

AES Layer Rules (strict dependency direction):
  surfaces      --> capabilities     (ALLOWED)
  surfaces      --> infrastructure   (ALLOWED - CLI/MCP need both)
  capabilities  --> infrastructure   (ALLOWED - uses interfaces)
  capabilities  --> surfaces         (FORBIDDEN)
  infrastructure --> taxonomy        (ALLOWED)
  infrastructure --> surfaces        (FORBIDDEN)
  agent         --> *                (ALLOWED - wiring layer)
"""

import ast
import os
from typing import List, Tuple, Optional
from dataclasses import dataclass


@dataclass
class GovernanceViolation:
    """Single architecture violation."""
    file_path: str
    line_no: int
    source_layer: str
    target_layer: str
    module_path: str
    description: str

    @property
    def code(self) -> str:
        return "AT001"

    @property
    def message(self) -> str:
        return (
            f"[AES Layer Violation] {self.description}. "
            f"File in '{self.source_layer}' imports from '{self.target_layer}' "
            f"via '{self.module_path}'."
        )

    @property
    def severity(self) -> str:
        return "CRITICAL"


# ─── Default Layer Rules ────────────────────────────────────────────────────
# Empty by default - rules must be configured
LAYER_RULES: List[Tuple[str, str, str]] = []

LAYER_MAP = {
    "infrastructure": "infrastructure",
    "capabilities": "capabilities",
    "surfaces": "surfaces",
    "agent": "agent",
    "taxonomy": "taxonomy",
}


# ─── AST Import Extractor ────────────────────────────────────────────────────

def _extract_imports(file_path: str) -> List[Tuple[int, str]]:
    """Parse a Python file and return (line_number, module_path) for all imports."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            source = f.read()
        tree = ast.parse(source)
    except (SyntaxError, OSError):
        return []

    imports: List[Tuple[int, str]] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append((node.lineno, str(alias.name)))
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imports.append((node.lineno, str(node.module)))
    return imports


class GovernanceAdapter:
    """Enforces AES architectural layer rules across Python files."""

    def __init__(
        self,
        rules: Optional[List[Tuple[str, str, str]]] = None,
        layer_map: Optional[dict] = None,
    ):
        self._rules = rules or LAYER_RULES
        self._layer_map = layer_map or LAYER_MAP

    def _detect_layer(self, module_path: str) -> Optional[str]:
        """Detect layer from dotted module path."""
        parts = module_path.split(".")
        for part in parts:
            if part in self._layer_map:
                return self._layer_map[part]
        return None

    def _detect_file_layer(self, file_path: str, root_dir: str) -> Optional[str]:
        """Detect layer from file path relative to source root."""
        rel = os.path.relpath(file_path, root_dir)
        parts = rel.replace("\\", "/").split("/")
        for part in parts:
            if part in self._layer_map:
                return self._layer_map[part]
        return None

    def scan(self, path: str) -> List[GovernanceViolation]:
        """Scan path (file or directory) for architecture violations."""
        root_dir = _resolve_root(path)
        python_files = _collect_python_files(path)
        results: List[GovernanceViolation] = []

        for file_path in python_files:
            file_layer = self._detect_file_layer(file_path, root_dir)

            # agent is allowed to import everything
            if file_layer == "agent" or file_layer is None:
                continue

            imports = _extract_imports(file_path)
            for line_no, module_path in imports:
                target_layer = self._detect_layer(module_path)
                if target_layer is None:
                    continue

                for source_rule, forbidden_target, description in self._rules:
                    if file_layer == source_rule and target_layer == forbidden_target:
                        results.append(GovernanceViolation(
                            file_path=file_path,
                            line_no=line_no,
                            source_layer=file_layer,
                            target_layer=target_layer,
                            module_path=module_path,
                            description=description,
                        ))
                        break

        return results


# ─── Private Helpers ─────────────────────────────────────────────────────────

def _resolve_root(path: str) -> str:
    """Find the project root (dir containing 'src') from the given path."""
    current = os.path.abspath(path if os.path.isdir(path) else os.path.dirname(path))
    while current and current != os.path.dirname(current):
        src_dir = os.path.join(str(current), "src")
        if os.path.isdir(src_dir):
            return str(current)
        current = os.path.dirname(current)
    return str(os.path.dirname(current) if not os.path.isdir(path) else path)


def _collect_python_files(path: str) -> List[str]:
    """Collect all .py files under a path."""
    if os.path.isfile(path) and path.endswith(".py"):
        return [path]
    if not os.path.isdir(path):
        return []

    py_files: List[str] = []
    for dirpath, _, filenames in os.walk(path):
        if "__pycache__" in dirpath or ".venv" in dirpath:
            continue
        for filename in filenames:
            if filename.endswith(".py"):
                py_files.append(os.path.join(dirpath, filename))
    return py_files
