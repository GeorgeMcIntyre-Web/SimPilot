---
description: How to search the codebase efficiently using repo_slice.py
---

# Smart Code Search Workflow

Use this workflow when you need to find code usage, definitions, or patterns with context. It is much faster and more token-efficient than standard `grep_search`.

## When to use
- Finding where a component or function is used
- Searching for specific strings or patterns
- Understanding code context around a match

## How to run

1. **Check if python is available** (it should be).
2. **Run the search command**:

```powershell
python repo_slice.py . "YOUR_SEARCH_PATTERN" [max_hits] [radius]
```

- `max_hits`: Number of results to return (default 8). Start small (3-5).
- `radius`: Lines of context to show (default 60). Use 20-30 for quick scans.

## Example

To find all usages of `SimulationCell`:

```powershell
python repo_slice.py . "SimulationCell" 5 30
```

## Tips for the AI
- **Always** use this instead of `grep_search` for initial exploration.
- **Pipe to file** if you expect many results: `python repo_slice.py . "pattern" > results.txt` then read the file.
- **Regex supported**: You can use regex in the pattern, e.g., `interface.*Cell`.
