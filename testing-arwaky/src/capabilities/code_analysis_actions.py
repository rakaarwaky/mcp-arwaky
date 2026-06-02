import ast
from src.contract import ICodeAnalyzer, IFileSystem


class AstAnalyzer(ICodeAnalyzer):
    """Static analysis using Python AST (Capability)."""

    def __init__(self, file_system: IFileSystem):
        self.file_system = file_system

    async def analyze_file(self, file_path: str) -> dict:
        try:
            content = await self.file_system.read_file(file_path)
            tree = ast.parse(content)

            classes = [
                node.name for node in ast.walk(tree) if isinstance(node, ast.ClassDef)
            ]
            functions = [
                node.name
                for node in ast.walk(tree)
                if isinstance(node, ast.FunctionDef)
            ]

            # Simple complexity: count nodes
            complexity = len(list(ast.walk(tree))) / 10.0

            return {
                "file": file_path,
                "classes": classes,
                "functions": functions,
                "complexity_score": round(float(complexity), 2),
            }
        except Exception as e:
            return {"error": str(e)}
