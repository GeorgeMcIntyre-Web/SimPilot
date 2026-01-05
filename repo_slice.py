from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import json
import subprocess
import sys

@dataclass(frozen=True)
class Hit:
    file: Path
    line: int
    window: str


DEFAULT_EXCLUDE_GLOBS: tuple[str, ...] = (
    "!**/.git/**",
    "!**/node_modules/**",
    "!**/dist/**",
    "!**/build/**",
    "!**/.next/**",
    "!**/out/**",
    "!**/coverage/**",
    "!**/.turbo/**",
    "!**/.cache/**",
    "!**/.venv/**",
    "!**/venv/**",
    "!**/__pycache__/**",
)


def run_rg(repo_root: Path, pattern: str, max_hits: int, exclude_globs: tuple[str, ...]) -> list[tuple[Path, int]]:
    if repo_root.exists() is not True:
        raise FileNotFoundError(f"Repo root not found: {repo_root}")

    if pattern.strip() == "":
        return []

    cmd: list[str] = ["rg", "--json", "--smart-case", "--text"]

    for g in exclude_globs:
        cmd.extend(["--glob", g])

    cmd.extend([pattern, str(repo_root)])

    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    stdout = proc.stdout or ""
    if stdout.strip() == "":
        stderr = (proc.stderr or "").strip()
        if stderr != "":
            print(stderr)
        return []

    hits: list[tuple[Path, int]] = []
    for ln in stdout.splitlines():
        if ln.strip() == "":
            continue

        obj = json.loads(ln)
        if obj.get("type") != "match":
            continue

        data = obj.get("data") or {}
        path_obj = data.get("path") or {}
        file_text = path_obj.get("text")
        if file_text is None:
            continue

        line_no = data.get("line_number")
        if isinstance(line_no, int) is not True:
            continue

        hits.append((Path(file_text), line_no))
        if len(hits) >= max_hits:
            return hits

    return hits


def slice_window(file_path: Path, center_line: int, radius: int) -> str:
    if file_path.exists() is not True:
        return ""

    if center_line <= 0:
        return ""

    text = file_path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()
    if len(lines) == 0:
        return ""

    idx = max(center_line - 1, 0)
    start = max(idx - radius, 0)
    end = min(idx + radius + 1, len(lines))

    header = f"{file_path}:{center_line} (lines {start + 1}-{end})"
    body = "\n".join(lines[start:end])
    return f"{header}\n{body}"


def search_and_slice(repo_root: Path, pattern: str, max_hits: int, radius: int) -> list[Hit]:
    matches = run_rg(repo_root, pattern, max_hits=max_hits, exclude_globs=DEFAULT_EXCLUDE_GLOBS)
    if len(matches) == 0:
        return []

    results: list[Hit] = []
    for file_path, line_no in matches:
        window = slice_window(file_path, line_no, radius=radius)
        if window.strip() == "":
            continue
        results.append(Hit(file=file_path, line=line_no, window=window))

    return results


def main() -> int:
    if len(sys.argv) < 3:
        print("Usage: python repo_slice.py <repo_path> <pattern> [max_hits] [radius]")
        print('Example: python repo_slice.py . "SimPilot" 5 40')
        return 2

    repo_root = Path(sys.argv[1]).resolve()
    pattern = sys.argv[2]
    max_hits = int(sys.argv[3]) if len(sys.argv) >= 4 else 8
    radius = int(sys.argv[4]) if len(sys.argv) >= 5 else 60

    hits = search_and_slice(repo_root, pattern, max_hits=max_hits, radius=radius)
    if len(hits) == 0:
        print("No matches.")
        return 0

    for i, hit in enumerate(hits, start=1):
        print(f"\n===== HIT {i}/{len(hits)} =====")
        print(hit.window)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
