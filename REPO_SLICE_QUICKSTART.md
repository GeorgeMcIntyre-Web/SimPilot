# repo_slice.py - Quick Start

## Setup (One Time)
```powershell
# If ripgrep not installed:
winget install BurntSushi.ripgrep.MSVC

# Refresh PATH (after install or if rg not found):
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

## Usage
```bash
python repo_slice.py . "SEARCH_PATTERN" [max_hits] [context_lines]
```

## Common Examples
```bash
# Find component usage
python repo_slice.py . "SimulationCell" 5 30

# Find interfaces
python repo_slice.py . "interface.*Asset" 10 20

# Find TODOs
python repo_slice.py . "TODO" 20 15

# Find imports
python repo_slice.py . "import.*coreStore" 5 25

# Find function definitions
python repo_slice.py . "function.*parse" 8 30
```

## Parameters
- **max_hits**: How many results (default: 8)
- **context_lines**: Lines shown around match (default: 60)

## Output
Shows file path, line number, and code context for each match.

---
📖 Full docs: `README_REPO_SLICE.md`
