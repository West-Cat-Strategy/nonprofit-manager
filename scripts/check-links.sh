#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

python3 - "$ROOT_DIR" <<'PY'
import re
import sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()

TARGETS = [
    root / "README.md",
    root / "CONTRIBUTING.md",
    root / "agents.md",
    root / "backend/README.md",
    root / "frontend/README.md",
    root / "frontend/SETUP.md",
    root / "e2e/README.md",
    root / "database/README.md",
    root / "docs/README.md",
    root / "docs/INDEX.md",
    root / "docs/DOCUMENTATION_STYLE_GUIDE.md",
    root / "docs/development",
    root / "docs/testing",
    root / "docs/api",
    root / "docs/features",
    root / "docs/deployment",
    root / "docs/product",
    root / "docs/security",
    root / "docs/validation",
    root / "docs/quick-reference",
    root / "docs/THEME_SYSTEM.md",
    root / "docs/help-center/staff",
]

SKIP_DIR_NAMES = {
    ".git",
    ".next",
    "coverage",
    "dist",
    "dist.bak",
    "node_modules",
    "output",
    "tmp",
}

MARKDOWN_EXTENSIONS = {".md", ".markdown"}
HTML_EXTENSIONS = {".html", ".htm"}

markdown_link = re.compile(r'!?\[[^\]]*\]\(([^)]+)\)')
html_link = re.compile(r'''(?:href|src)=["']([^"']+)["']''')
placeholder = "github.com/example/nonprofit-manager"


def iter_files(path: Path):
    if not path.exists():
        return
    if path.is_file():
        if path.suffix.lower() in MARKDOWN_EXTENSIONS | HTML_EXTENSIONS:
            yield path
        return
    for child in sorted(path.iterdir()):
        if child.is_dir() and child.name in SKIP_DIR_NAMES:
            continue
        yield from iter_files(child)


def parse_markdown_links(text: str):
    in_fence = False
    for line in text.splitlines():
        fence = re.match(r'^\s*(```|~~~)', line)
        if fence:
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        for match in markdown_link.finditer(line):
            yield match.group(1).strip()


def parse_html_links(text: str):
    for match in html_link.finditer(text):
        yield match.group(1).strip()


def normalize_target(target: str):
    target = target.strip()
    if target.startswith("<") and target.endswith(">"):
        target = target[1:-1].strip()
    target = target.split("#", 1)[0]
    target = target.split("?", 1)[0]
    return target


def is_external(target: str):
    lowered = target.lower()
    return lowered.startswith(("http://", "https://", "mailto:", "tel:", "javascript:"))


issues = []
checked_files = 0
checked_links = 0

for target_root in TARGETS:
    for file_path in iter_files(target_root):
        text = file_path.read_text(encoding="utf-8")
        checked_files += 1

        if placeholder in text:
            issues.append(f"{file_path.relative_to(root)}: placeholder GitHub example link found")

        if file_path.suffix.lower() in HTML_EXTENSIONS:
            candidates = list(parse_html_links(text))
        else:
            candidates = list(parse_markdown_links(text))

        for raw_target in candidates:
            target = normalize_target(raw_target)
            if not target or target.startswith("#") or is_external(target):
                continue

            resolved = (file_path.parent / target).resolve()
            checked_links += 1

            try:
                resolved.relative_to(root)
            except ValueError:
                issues.append(f"{file_path.relative_to(root)} -> {raw_target}: resolves outside the repository")
                continue

            if not resolved.exists():
                issues.append(f"{file_path.relative_to(root)} -> {raw_target}: target does not exist")

if issues:
    print("Link check failed:\n")
    for issue in issues:
        print(f"- {issue}")
    print(f"\nChecked {checked_files} files and {checked_links} local links.")
    sys.exit(1)

print(f"Checked {checked_files} files and {checked_links} local links. No broken active-doc links found.")
PY
