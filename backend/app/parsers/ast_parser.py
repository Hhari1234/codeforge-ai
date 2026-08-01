"""Extract structural signatures from Python source using the built-in `ast` module.

This pre-processing runs BEFORE the LLM call for Python files. It produces a
compact, line-referenced inventory of functions and classes (with their
signatures, arguments, decorators, docstrings, and nesting context) which is
included alongside the raw source in the prompt. This materially improves the
accuracy of per-function/per-class explanations vs. sending raw text alone.

For non-Python files this module is never called — the caller falls back to
sending raw source with a language hint derived from the file extension.
"""

from __future__ import annotations

import ast
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class AstFunction:
    name: str
    kind: str  # "function" | "async function"
    args: list[str] = field(default_factory=list)
    returns: str | None = None
    lineno: int | None = None
    docstring: str | None = None
    decorators: list[str] = field(default_factory=list)
    class_parent: str | None = None


@dataclass
class AstClass:
    name: str
    bases: list[str] = field(default_factory=list)
    lineno: int | None = None
    docstring: str | None = None
    methods: list[AstFunction] = field(default_factory=list)


@dataclass
class AstModule:
    """Everything we extract from a single Python file."""
    imports: list[str] = field(default_factory=list)
    functions: list[AstFunction] = field(default_factory=list)
    classes: list[AstClass] = field(default_factory=list)
    top_level_assignments: list[str] = field(default_factory=list)
    has_main_guard: bool = False


def _safe_name(node: ast.AST) -> str:
    """Best-effort name for arbitrary AST nodes (decorators, bases, etc.)."""
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return f"{_safe_name(node.value)}.{node.attr}"
    if isinstance(node, ast.Subscript):
        return f"{_safe_name(node.value)}[{_safe_name(node.slice)}]"
    if isinstance(node, ast.Call):
        return _safe_name(node.func)
    if isinstance(node, ast.Constant):
        return repr(node.value)
    return type(node).__name__


def _arg_names(node: ast.FunctionDef | ast.AsyncFunctionDef) -> list[str]:
    """Flatten posonly/args/kwonly/vararg/kwarg into a readable signature list."""
    args: list[str] = []

    for a in node.args.posonlyargs:
        args.append(a.arg)
    for a in node.args.args:
        args.append(a.arg)
    if node.args.vararg is not None:
        args.append(f"*{node.args.vararg.arg}")
    for a in node.args.kwonlyargs:
        args.append(a.arg)
    if node.args.kwarg is not None:
        args.append(f"**{node.args.kwarg.arg}")

    return args


def _returns(node: ast.FunctionDef | ast.AsyncFunctionDef) -> str | None:
    if node.returns is None:
        return None
    return _safe_name(node.returns)


def _decorators(node: ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef) -> list[str]:
    return [_safe_name(d) for d in node.decorator_list]


def _docstring(node: ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef | ast.Module) -> str | None:
    body = getattr(node, "body", None)
    if not body:
        return None
    first = body[0]
    if isinstance(first, ast.Expr) and isinstance(first.value, ast.Constant) and isinstance(first.value.value, str):
        return first.value.value.strip()
    return None


def _method_list(cls_node: ast.ClassDef) -> list[AstFunction]:
    methods: list[AstFunction] = []
    for child in cls_node.body:
        if isinstance(child, ast.FunctionDef):
            methods.append(
                AstFunction(
                    name=child.name,
                    kind="function",
                    args=_arg_names(child),
                    returns=_returns(child),
                    lineno=child.lineno,
                    docstring=_docstring(child),
                    decorators=_decorators(child),
                    class_parent=cls_node.name,
                )
            )
        elif isinstance(child, ast.AsyncFunctionDef):
            methods.append(
                AstFunction(
                    name=child.name,
                    kind="async function",
                    args=_arg_names(child),
                    returns=_returns(child),
                    lineno=child.lineno,
                    docstring=_docstring(child),
                    decorators=_decorators(child),
                    class_parent=cls_node.name,
                )
            )
    return methods


def parse_python_source(source: str) -> AstModule:
    """Parse Python source into a structured AstModule summary.

    Never raises for ordinary invalid syntax — callers treat a parse failure as
    "no AST context available" and fall back to raw source only.
    """
    module = AstModule()
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return module

    module.docstring = _docstring(tree)  # type: ignore[attr-defined]

    for child in tree.body:
        if isinstance(child, (ast.Import, ast.ImportFrom)):
            if isinstance(child, ast.Import):
                module.imports.append(", ".join(a.name for a in child.names))
            else:
                module.imports.append(
                    f"from {child.module} import {', '.join(a.name for a in child.names)}"
                )
        elif isinstance(child, ast.FunctionDef):
            module.functions.append(
                AstFunction(
                    name=child.name,
                    kind="function",
                    args=_arg_names(child),
                    returns=_returns(child),
                    lineno=child.lineno,
                    docstring=_docstring(child),
                    decorators=_decorators(child),
                )
            )
        elif isinstance(child, ast.AsyncFunctionDef):
            module.functions.append(
                AstFunction(
                    name=child.name,
                    kind="async function",
                    args=_arg_names(child),
                    returns=_returns(child),
                    lineno=child.lineno,
                    docstring=_docstring(child),
                    decorators=_decorators(child),
                )
            )
        elif isinstance(child, ast.ClassDef):
            module.classes.append(
                AstClass(
                    name=child.name,
                    bases=[_safe_name(b) for b in child.bases],
                    lineno=child.lineno,
                    docstring=_docstring(child),
                    methods=_method_list(child),
                )
            )
        elif isinstance(child, ast.Assign) and len(child.targets) == 1 and isinstance(child.targets[0], ast.Name):
            module.top_level_assignments.append(f"{child.targets[0].id} = ...")
        elif isinstance(child, ast.AnnAssign) and isinstance(child.target, ast.Name):
            module.top_level_assignments.append(f"{child.target.id}: ... = ...")
        elif isinstance(child, ast.If) and _is_main_guard(child):
            module.has_main_guard = True

    return module


def _is_main_guard(node: ast.If) -> bool:
    test = node.test
    return isinstance(test, ast.Compare) and (
        _safe_name(test) == "__name__ == '__main__'" or _safe_name(test) == "__name__ == \"__main__\""
    )


def format_ast_context(module: AstModule) -> str:
    """Render the extracted AST inventory as a compact text block for the prompt."""
    parts: list[str] = []

    if module.docstring:
        parts.append(f"Module docstring: {module.docstring}")

    if module.imports:
        parts.append("Imports:\n" + "\n".join(f"  - {i}" for i in module.imports))

    if module.top_level_assignments:
        parts.append("Top-level assignments:\n" + "\n".join(f"  - {a}" for a in module.top_level_assignments))

    if module.has_main_guard:
        parts.append("Has an `if __name__ == '__main__':` entry-point guard.")

    if module.functions:
        lines = ["Functions:"]
        for fn in module.functions:
            sig = f"{fn.name}({', '.join(fn.args)})"
            if fn.returns:
                sig += f" -> {fn.returns}"
            lines.append(f"  - line {fn.lineno}: [{fn.kind}] {sig}")
            if fn.decorators:
                lines.append(f"      decorators: {', '.join(fn.decorators)}")
            if fn.docstring:
                lines.append(f"      docstring: {fn.docstring[:200]}")
        parts.append("\n".join(lines))

    if module.classes:
        lines = ["Classes:"]
        for cls in module.classes:
            header = f"  - line {cls.lineno}: class {cls.name}"
            if cls.bases:
                header += f"({', '.join(cls.bases)})"
            lines.append(header)
            if cls.docstring:
                lines.append(f"      docstring: {cls.docstring[:200]}")
            for m in cls.methods:
                sig = f"{m.name}({', '.join(m.args)})"
                if m.returns:
                    sig += f" -> {m.returns}"
                lines.append(f"      method line {m.lineno}: [{m.kind}] {sig}")
                if m.docstring:
                    lines.append(f"        docstring: {m.docstring[:150]}")
        parts.append("\n".join(lines))

    if not parts:
        return "(No structural AST summary could be extracted.)"

    return "\n\n".join(parts)

