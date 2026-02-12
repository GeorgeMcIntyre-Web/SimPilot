# Security Notes

## Temporary Vulnerability Exceptions

### `xlsx` (SheetJS) — High severity

- **Status**: Known high vulnerability, no upstream fix available.
- **Advisory**: Prototype pollution via crafted spreadsheet input.
- **Mitigation**: The library is used for **client-side parsing only**.
  No server-side or untrusted-network parsing occurs. All spreadsheet
  data originates from user-uploaded files processed in the browser.
- **Owner**: Agent 3 (xlsx removal track). The library will be replaced
  with a safe alternative, at which point this exception is removed.
- **Tracking**: This exception is reviewed each sprint.

---

_Last reviewed: 2026-02-12_
