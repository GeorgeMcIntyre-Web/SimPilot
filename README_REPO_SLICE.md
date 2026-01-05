# 🔍 repo_slice.py - Code Search Tool

A fast code search utility that combines **ripgrep** with contextual code windows. Perfect for quickly exploring the SimPilot codebase.

## What It Does

- **Searches** your repository using ripgrep (super fast!)
- **Shows context** around each match (configurable radius)
- **Auto-excludes** build artifacts (node_modules, dist, .git, etc.)
- **Formats nicely** with file paths and line numbers

## Prerequisites

### 1. Install Python
Make sure Python is installed (you probably already have it).

### 2. Install Ripgrep

Ripgrep is already installed on the system, but if you need to install it on a new machine:

```powershell
winget install BurntSushi.ripgrep.MSVC
```

After installation, **restart your terminal** or refresh the PATH:

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

## Usage

### Basic Syntax

```bash
python repo_slice.py <repo_path> <pattern> [max_hits] [radius]
```

### Parameters

- **repo_path**: Path to search (use `.` for current directory)
- **pattern**: Search pattern (supports regex)
- **max_hits**: Maximum number of results (default: 8)
- **radius**: Lines of context around each match (default: 60)

### Examples

#### Find all uses of "SimulationCell" with 30 lines of context
```bash
python repo_slice.py . "SimulationCell" 5 30
```

#### Find interface definitions
```bash
python repo_slice.py . "interface.*Cell" 10 20
```

#### Find all TODO comments
```bash
python repo_slice.py . "TODO" 20 15
```

#### Find specific function calls
```bash
python repo_slice.py . "relationshipLinker" 5 40
```

#### Search for type definitions
```bash
python repo_slice.py . "type.*Asset" 8 25
```

## Quick Reference

| Command | What It Does |
|---------|-------------|
| `python repo_slice.py . "pattern" 5 30` | Find 5 matches with 30 lines context |
| `python repo_slice.py . "TODO"` | Find TODOs (default: 8 hits, 60 lines) |
| `python repo_slice.py . "interface"` | Find all interfaces |

## Output Format

```
===== HIT 1/5 =====
C:\path\to\file.ts:42 (lines 20-65)
[code context shown here]

===== HIT 2/5 =====
...
```

## What Gets Excluded

The script automatically skips:
- `.git/`
- `node_modules/`
- `dist/` and `build/`
- `.next/` and `out/`
- `coverage/`
- `.turbo/` and `.cache/`
- `.venv/` and `venv/`
- `__pycache__/`

## Tips

1. **Start with fewer hits**: Use `3-5` max_hits first to avoid overwhelming output
2. **Adjust radius**: Use smaller radius (15-20) for quick scans, larger (40-60) for deep context
3. **Use regex**: Patterns support regex, e.g., `"interface.*Cell"` finds interface definitions
4. **Pipe to file**: For large results, save to file:
   ```bash
   python repo_slice.py . "pattern" 20 40 > results.txt
   ```

## Troubleshooting

### "rg: command not found"
Ripgrep isn't in your PATH. Restart your terminal or run:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### "No matches"
- Check your pattern spelling
- Try a simpler pattern
- Make sure you're in the right directory

## Why Use This?

Instead of:
1. Running `grep` or searching manually
2. Opening each file
3. Finding the relevant context
4. Repeating for each match

You get **everything in one command** with full context! 🚀

---

**Created for SimPilot team** | Questions? Ask George or check the script: `repo_slice.py`
