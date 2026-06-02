#!/usr/bin/env python3
"""
AES Architecture Linter for cloud-mail-flare-aes
Enforces type-driven development and naming conventions.

Rules:
  1. File naming: {vertical}_{unique}_{horizontal}.ts — exactly 2 underscores, 3 parts; domain implicit from folder, no domain prefix.
  2. Taxonomy non-VO: ZERO primitive types (string/number/boolean in fields)
  3. Contract: ZERO primitive types in field declarations
  4. Naming suffixes: taxonomy only (_vo, _entity, _error, _event); contract only (_io, _protocol, _port); for agent/capabilities/infrastructure/surfaces any meaningful suffix allowed (e.g., agent: _container, _manager, _router; capabilities: _actions, _adapter; infrastructure: _adapter, _provider, _client, _util; surfaces: _entry, _command, _check, _management, _registry).
  5. Taxonomy barrel exports all files
  6. Entity/event/error must import from _vo files
  7. File length: 10-300 lines (with exceptions)
"""

import os
import re
import sys
from pathlib import Path
from dataclasses import dataclass, field

# ─── Configuration ─────────────────────────────────────────────

AES_ROOT = Path(__file__).parent.parent / "src"
TAXONOMY_DIR = AES_ROOT / "taxonomy"
CONTRACT_DIR = AES_ROOT / "contract"

VALID_TAXONOMY_SUFFIXES = {"vo", "entity", "error", "event"}
VALID_CONTRACT_SUFFIXES = {"port", "protocol", "io"}
VALID_CAPABILITY_SUFFIXES = {"actions", "analyzer", "adapter", "formatters", "generator"}
VALID_INFRA_SUFFIXES = {"adapter", "provider", "client", "scanner", "tracker", "detector", "patterns", "util", "system"}
VALID_SURFACE_SUFFIXES = {"entry", "registry", "commands", "catalog", "command", "check", "management"}
VALID_AGENT_SUFFIXES = {"container", "manager", "orchestrator", "registry"}

DOMAIN_SUFFIXES = {
    "taxonomy": VALID_TAXONOMY_SUFFIXES,
    "contract": VALID_CONTRACT_SUFFIXES,
    "capabilities": VALID_CAPABILITY_SUFFIXES,
    "surfaces": VALID_SURFACE_SUFFIXES,
}

PRIMITIVE_PATTERN = re.compile(r":\s*(string|number|boolean)\b")
BRANDED_PATTERN = re.compile(r"__brand")
IMPORT_PATTERN = re.compile(r"from '\.\/([^']+)'")
FIELD_DECL_PATTERN = re.compile(r"^\s+(readonly\s+)?\w+:\s*")


@dataclass
class LintIssue:
    file: str
    line: int
    rule: str
    message: str
    severity: str = "error"  # error | warning


@dataclass
class LintResult:
    issues: list[LintIssue] = field(default_factory=list)

    def add(self, file: str, line: int, rule: str, message: str, severity: str = "error"):
        self.issues.append(LintIssue(file, line, rule, message, severity))

    @property
    def errors(self) -> int:
        return sum(1 for i in self.issues if i.severity == "error")

    @property
    def warnings(self) -> int:
        return sum(1 for i in self.issues if i.severity == "warning")

    def print_report(self):
        if not self.issues:
            print("✅ AES Linter: ALL CHECKS PASSED")
            return

        by_rule: dict[str, list[LintIssue]] = {}
        for issue in self.issues:
            by_rule.setdefault(issue.rule, []).append(issue)

        for rule, issues in sorted(by_rule.items()):
            print(f"\n{'='*60}")
            print(f"RULE: {rule} ({len(issues)} issues)")
            print(f"{'='*60}")
            for i in issues:
                icon = "❌" if i.severity == "error" else "⚠️ "
                print(f"  {icon} {i.file}:{i.line} — {i.message}")

        print(f"\n{'='*60}")
        print(f"Total: {self.errors} errors, {self.warnings} warnings")
        print(f"{'='*60}")


# ─── Rule 1: File Naming ──────────────────────────────────────

SVELITEKIT_CONVENTION_FILES = {"app.d.ts", "hooks.server.ts", "hooks.client.ts"}
# SvelteKit route files use special + prefix names — exempt from naming check
SVELITEKIT_ROUTE_FILES = {"+server.ts", "+page.server.ts", "+layout.server.ts", "+page.ts", "+layout.ts", "+error.ts"}
# Config files (vite, react-router, etc.) and framework conventions — exempt
CONFIG_FILES = {"routes.ts", "vite.config.ts", "react-router.config.ts"}

def check_file_naming(result: LintResult):
    """All .ts files must be {word1}_{word2}_{word3}.ts (2 underscores, 3 words)."""
    ALLOWED_DIRS = {"agent", "capabilities", "contract", "infrastructure", "surfaces", "taxonomy", "."}

    for root, _, files in os.walk(AES_ROOT):
        if "node_modules" in root:
            continue
        # Skip generated/hidden directories (dot-prefixed)
        rel_root = os.path.relpath(root, AES_ROOT)
        if rel_root.startswith(".") or "/." in rel_root:
            continue
        # Skip routes directory — SvelteKit convention files
        if rel_root.startswith("routes") or "/routes" in rel_root:
            continue
            
        # Only run rules on allowed directories
        if not any(rel_root == d or rel_root.startswith(f"{d}/") for d in ALLOWED_DIRS):
            continue

        for f in files:
            if not f.endswith(".ts"):
                continue
            if f == "index.ts" or f == "agent_main_entry.ts" or f == "app.html":
                continue
            if f in SVELITEKIT_CONVENTION_FILES:
                continue
            if f in SVELITEKIT_ROUTE_FILES:
                continue
            if f in CONFIG_FILES:
                continue
            if f.endswith(".test.ts"):
                # Test files can have 4 words: {word1}_{word2}_{word3}.test.ts
                stem = f.replace(".test.ts", "")
            else:
                stem = f.replace(".ts", "")

            underscore_count = stem.count("_")
            if underscore_count != 2:
                rel = os.path.relpath(os.path.join(root, f), AES_ROOT)
                result.add(rel, 0, "file-naming",
                    f"Expected 2 underscores (3 words), got {underscore_count}: {stem}")
            
            if stem.startswith("agent_") or stem.startswith("infrastructure_"):
                rel = os.path.relpath(os.path.join(root, f), AES_ROOT)
                result.add(rel, 0, "file-naming",
                    f"Prefix '{stem.split('_')[0]}_' is prohibited: {stem}")


# ─── Rule 2: Taxonomy Non-VO Primitive Check ──────────────────

def check_taxonomy_primitives(result: LintResult):
    """Non-VO taxonomy files must NOT have raw primitive field declarations."""
    if not TAXONOMY_DIR.exists():
        return

    for f in os.listdir(TAXONOMY_DIR):
        if not f.endswith(".ts") or f == "index.ts":
            continue
        if "_vo.ts" in f:
            continue  # VOs can use primitives

        path = TAXONOMY_DIR / f
        lines = path.read_text().split("\n")

        for i, line in enumerate(lines, 1):
            s = line.strip()
            # Skip imports, comments, functions, constructors
            if s.startswith("import") or s.startswith("//") or s.startswith("/*"):
                continue
            if "function " in s or "constructor(" in s or "super(" in s:
                continue
            if "extends Error" in s:
                continue
            if "toJSON()" in s:
                continue

            if PRIMITIVE_PATTERN.search(s) and not BRANDED_PATTERN.search(s):
                # Check if it's a field declaration (not function param)
                if FIELD_DECL_PATTERN.match(s) or "public readonly" in s:
                    rel = os.path.relpath(path, AES_ROOT)
                    result.add(rel, i, "taxonomy-no-primitive",
                        f"Raw primitive in non-VO file: {s}")


# ─── Rule 3: Contract Primitive Check ─────────────────────────

def check_contract_primitives(result: LintResult):
    """Contract field declarations should use taxonomy types, not raw primitives."""
    if not CONTRACT_DIR.exists():
        return

    for f in os.listdir(CONTRACT_DIR):
        if not f.endswith(".ts") or f == "index.ts":
            continue

        path = CONTRACT_DIR / f
        lines = path.read_text().split("\n")

        for i, line in enumerate(lines, 1):
            s = line.strip()
            if s.startswith("import") or s.startswith("//"):
                continue

            if PRIMITIVE_PATTERN.search(s) and not BRANDED_PATTERN.search(s):
                # Only flag field declarations, not function params
                if FIELD_DECL_PATTERN.match(s):
                    rel = os.path.relpath(path, AES_ROOT)
                    result.add(rel, i, "contract-no-primitive",
                        f"Raw primitive field: {s}", "warning")


# ─── Rule 4: Naming Suffix Validation ─────────────────────────

def check_naming_suffixes(result: LintResult):
    """Files must have correct suffix for their domain."""
    for domain, valid_suffixes in DOMAIN_SUFFIXES.items():
        domain_dir = AES_ROOT / domain
        if not domain_dir.exists():
            continue

        for f in os.listdir(domain_dir):
            if not f.endswith(".ts") or f == "index.ts":
                continue

            stem = f.replace(".ts", "")
            parts = stem.rsplit("_", 1)
            if len(parts) != 2:
                continue

            suffix = parts[1]
            if suffix not in valid_suffixes:
                rel = os.path.relpath(domain_dir / f, AES_ROOT)
                result.add(rel, 0, "suffix-validation",
                    f"Invalid suffix '{suffix}' for {domain} domain. Valid: {', '.join(sorted(valid_suffixes))}")


# ─── Rule 5: Taxonomy Barrel Completeness ─────────────────────

def check_taxonomy_barrel(result: LintResult):
    """Taxonomy index.ts must export all _vo, _entity, _error, _event files."""
    if not TAXONOMY_DIR.exists():
        return

    barrel_path = TAXONOMY_DIR / "index.ts"
    if not barrel_path.exists():
        result.add("taxonomy/index.ts", 0, "barrel-completeness", "index.ts missing")
        return

    barrel_content = barrel_path.read_text()

    for f in sorted(os.listdir(TAXONOMY_DIR)):
        if not f.endswith(".ts") or f == "index.ts":
            continue
        name = f.replace(".ts", "")
        if name not in barrel_content:
            result.add("taxonomy/index.ts", 0, "barrel-completeness",
                f"Missing export: {name}", "warning")


# ─── Rule 6: Entity/Event/Error Import Check ──────────────────

def check_nonvo_imports_vo(result: LintResult):
    """Entity, event, error files must import from at least one _vo file."""
    if not TAXONOMY_DIR.exists():
        return

    vo_files = {f.replace(".ts", "") for f in os.listdir(TAXONOMY_DIR) if "_vo.ts" in f}

    for f in os.listdir(TAXONOMY_DIR):
        if not f.endswith(".ts") or f == "index.ts":
            continue
        if "_vo.ts" in f:
            continue

        path = TAXONOMY_DIR / f
        content = path.read_text()
        imports = IMPORT_PATTERN.findall(content)

        has_vo_import = any(imp in vo_files for imp in imports)
        if not has_vo_import:
            rel = os.path.relpath(path, AES_ROOT)
            result.add(rel, 0, "nonvo-imports-vo",
                f"Entity/event/error must import from _vo files")


# ─── Rule 7: File Length (10-300 lines) ───────────────────────

def check_file_length(result: LintResult):
    """Files should be between 10 and 300 lines (with some exceptions)."""
    EXEMPT_FILES = {"index.ts", "worker_entry.ts", "app.html", "design_system_css.ts", "base_reset_css.ts"}
    
    for root, _, files in os.walk(AES_ROOT):
        if "node_modules" in root or "build" in root or ".react-router" in root:
            continue
        rel_root = os.path.relpath(root, AES_ROOT)
        
        for f in files:
            if not f.endswith(".ts") or f in EXEMPT_FILES:
                continue
            
            path = Path(root) / f
            try:
                line_count = len(path.read_text().splitlines())
                rel = os.path.relpath(path, AES_ROOT)
                
                if line_count > 300:
                    result.add(rel, 0, "file-length", f"File too large: {line_count} lines (max 300)")
                elif line_count < 10:
                    # Only warn for small files to encourage consolidation
                    result.add(rel, 0, "file-length", f"File too small: {line_count} lines (min 10)", "warning")
            except Exception as e:
                print(f"Error reading {path}: {e}")

# ─── Main ──────────────────────────────────────────────────────

def main():
    result = LintResult()

    print("AES Architecture Linter")
    print(f"Scanning: {AES_ROOT}\n")

    check_file_naming(result)
    check_taxonomy_primitives(result)
    check_contract_primitives(result)
    check_naming_suffixes(result)
    check_taxonomy_barrel(result)
    check_nonvo_imports_vo(result)
    check_file_length(result)

    result.print_report()

    sys.exit(1 if result.errors > 0 else 0)


if __name__ == "__main__":
    main()
