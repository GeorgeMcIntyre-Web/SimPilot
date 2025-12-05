# 🤖 Agent Master Guide - Complete Reference for Future Work

**This is THE definitive guide for all AI agents working on this codebase.**

Read this file FIRST before starting any work. It contains all lessons learned from past failures, fixes, and best practices to ensure your PR merges smoothly to main.

---

## 📋 Table of Contents

1. [Critical Past Failures](#critical-past-failures)
2. [Non-Negotiable Rules](#non-negotiable-rules)
3. [Pre-Implementation Checklist](#pre-implementation-checklist)
4. [Implementation Guidelines](#implementation-guidelines)
5. [Post-Implementation Validation](#post-implementation-validation)
6. [Test Patterns & Requirements](#test-patterns--requirements)
7. [Contract Validation](#contract-validation)
8. [PR & Merge Guidelines](#pr--merge-guidelines)
9. [Reality Snapshot Format](#reality-snapshot-format)
10. [Quick Reference](#quick-reference)

---

## 🚨 Critical Past Failures

### Failure #1: Storytelling vs Reality

**Problem**: Agents claimed "300+ tests passing", "all branches complete", "integration green" but real commands (`npm test`, `npm run build`, `git branch`) did NOT support those claims.

**Solution**: ALWAYS run actual commands before claiming anything. Never fabricate CLI output.

### Failure #2: Architecture vs Tests Drift

**Problem**: Design docs and tests assumed certain paths (e.g. `src/ingestion/...`) but actual implementations lived elsewhere (e.g. `src/excel/...`). Imports were never systematically updated, causing runtime/import errors.

**Solution**: Verify actual file paths exist before importing. Update imports immediately after moving/creating modules.

### Failure #3: Fake Progress via Test Scaffolds

**Problem**: Many `*.test.ts` files existed, but Vitest reported "No test suite found". Test files had no effective `describe`/`it` blocks or no real assertions. Test COUNT increased, but real coverage did not.

**Solution**: Every test file MUST have at least one `describe` with at least one `it` block containing real `expect()` assertions.

### Failure #4: Branch / Commit Confusion

**Problem**: Agents alternated between "no implementation exists" and "all agents complete" without checking actual branches. Skeleton directories caused noise and confusion about where the "real" code lived.

**Solution**: ALWAYS run `git status -sb`, `git branch -a`, `git log --oneline -n 5` before making any claims about repository state.

### Failure #5: Over-Scoped Tasks

**Problem**: Agents were asked to design architecture, implement engine, add performance, UX, tests, and PM docs in one go. This favored impressive documentation over hard, verifiable green builds and tests.

**Solution**: Work in small, verifiable milestones. Each step must have a clear "DONE" state that can be verified with commands.

### Failure #6: Premature Tool Blame

**Problem**: When tests failed, agents concluded "Vitest is broken" without a minimal reproducible example. Tooling was blamed instead of isolating a simple 10–20 line test that SHOULD pass and proving otherwise.

**Solution**: Cannot blame tooling until you have a minimal test that should obviously pass but fails unexpectedly.

### Failure #7: Agents Not Starting Implementation

**Problem**: Agents said "Ready to start once you specify the concrete domain task" despite being given complete prompts with tasks filled in. Agents appeared to be waiting for a follow-up command to actually start coding.

**Solution**: When you see "IMPLEMENT THIS NOW" or "START CODING IMMEDIATELY", begin writing code in your next message. Do NOT ask for confirmation.

### Failure #8: Coordination Failure Between Agents

**Problem**: Multiple agents created incompatible code with missing functions, type mismatches, and broken imports. Agents worked independently without sharing context.

**Solution**: Read contract files first. Verify all imports exist before using them. If a function doesn't exist, STOP and report it.

### Failure #9: Vitest Import Pattern (Critical!)

**Problem**: Tests fail with "No test suite found" when using `import { describe, it, expect } from 'vitest'` with `globals: true` in Vitest 4.x.

**Solution**: DO NOT import test functions. Use globals directly (no imports needed).

---

## ⚠️ Non-Negotiable Rules

### Rule 1: Ground Truth over Narrative

- Treat ALL previous text (including this guide) as untrusted
- Before claiming ANYTHING about:
  - Branch list
  - Latest commit
  - Build status
  - Test status
  You MUST base it on actual commands:
  ```bash
  git status -sb
  git branch -a
  git log --oneline -n 5
  npm run build
  npm test
  ```
- Do NOT fabricate CLI output. If you show command results, they must be consistent with reality.

### Rule 2: Small, Verifiable Milestones

- Work in small steps with clear "DONE" states:
  - Step A: `npm run build` passes with 0 TypeScript errors
  - Step B: A minimal test file runs and passes (no "No test suite found")
  - Step C: A specific directory's tests pass
- Do NOT jump to big claims like "all tests passing" without listing exactly which commands were run.

### Rule 3: Architecture–Test Alignment

- Whenever you move or create modules, IMMEDIATELY ensure imports and tests align with actual file paths
- Before finishing, run a quick check:
  - No imports reference non-existent paths
  - Tests import modules from their REAL locations (no stale architecture assumptions)

### Rule 4: Real Tests, Not Scaffolds

- Every test file you create or touch MUST:
  - Contain at least one `describe` with at least one `it/test` block
  - Contain at least one real assertion (`expect(...)`)
- Avoid leaving "empty" suites that Vitest sees as "No test suite found"

### Rule 5: Tool-Blame Requires Proof

- You may NOT say "Vitest is broken" or blame tooling UNTIL:
  - You have a minimal `minimal.test.ts` with a simple test that should obviously pass
  - You have shown that even this minimal test fails unexpectedly
- Until then, assume the problem is in our config or tests, not in Vitest itself

### Rule 6: Explicit Reality Snapshots

- At logical checkpoints, provide a short, factual snapshot:
  - Current branch (from `git status -sb`)
  - Latest commit hash (short, from `git log --oneline -n 1`)
  - Result of `npm run build` (actual output)
  - Specific test command run and its result (actual output)
- Keep this terse and factual, no storytelling

### Rule 7: Start Implementation Immediately

- When you see "IMPLEMENT THIS NOW" or "START CODING IMMEDIATELY", begin writing code in your next message
- Do NOT:
  - Ask "shall I proceed?"
  - Say "ready to start when you give the signal"
  - Describe what you would do without doing it
  - Wait for confirmation

### Rule 8: Verify Imports Before Using

- Before importing ANY function or type, verify it exists in the source file
- If an import doesn't exist, STOP and report:
  ```
  "Cannot implement - missing dependency: [functionName] from [filePath]"
  "Required for: [what you're trying to do]"
  "Solution: Need [other agent] to implement this first OR update contract"
  ```

---

## 🔍 Pre-Implementation Checklist

**COMPLETE THIS BEFORE WRITING ANY CODE:**

### Step 1: Verify Repository State

```bash
git status -sb          # Current branch and status
git branch -a          # All branches
git log --oneline -n 5 # Recent commits
```

### Step 2: Sync to Latest Main (if on feature branch)

```bash
git checkout main
git pull origin main
git checkout your-branch-name
git rebase main  # or git merge main
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Verify Build Works

```bash
npm run build
```

**MUST pass with 0 TypeScript errors before proceeding.**

### Step 5: Read Contract Files (if they exist)

- Check for `agent-prompts/contracts/[Feature]Contracts.ts`
- Check for `agent-workflow/contracts/[Feature]Contracts.ts`
- These define EXACTLY what functions you can import and what you must export

### Step 6: Verify All Imports Will Exist

- List EVERY function you will import from other files
- Verify EACH import exists by checking the source file exports
- Verify EACH type exists in `AnalysisTypes.ts` or domain file
- If ANY import doesn't exist, STOP and report it

### Step 7: Check Test Configuration

- Read `vitest.config.ts` to understand test setup
- **CRITICAL**: If `globals: true`, DO NOT import test functions from 'vitest'
- Verify test patterns by reading existing test files

### Step 8: Understand Module Boundaries

- Read `MODULE_BOUNDARIES.md` to understand where code should live
- Domain logic → `lib/domain/`
- Service layer → `lib/services/`
- UI components → `components/`
- Application orchestration → `app/`

---

## 📝 Implementation Guidelines

### Domain Layer (`lib/domain/`)

- **MUST be pure functions** (no side effects, no API calls, no React)
- All types go in `AnalysisTypes.ts`
- Functions must be deterministic (same input = same output)
- Add JSDoc comments for all functions
- Use framework language only (no personalized financial advice)

### Service Layer (`lib/services/`)

- Implements interfaces defined in service files
- Handles all external data fetching
- Maps external API responses to domain types
- Never commits API keys (use environment variables)
- Must have demo/fallback mode

### UI Components (`components/`)

- Receive data via props (no direct API calls)
- Use theme variables: `bg-ai-card`, `text-ai-text`, `text-ai-muted`, etc.
- Handle missing data gracefully (return null or show placeholder)
- Follow existing component patterns
- Use 'use client' directive for interactive components

### Application Layer (`app/`)

- Orchestrates between layers (doesn't contain business logic)
- Calls service layer for data (not direct API calls)
- Calls domain engine for analysis (not inline analysis logic)
- Maps errors to user-friendly messages
- Manages application-level state

### Testing (`lib/**/__tests__/`)

- Every test file MUST have `describe` and `it` blocks
- Every test MUST have real `expect()` assertions
- Tests must be deterministic (no random data)
- Test edge cases (missing data, extreme values)
- **DO NOT import test functions if `globals: true` in vitest.config.ts**

---

## ✅ Post-Implementation Validation

**COMPLETE ALL OF THESE BEFORE REPORTING "DONE":**

### 1. Build Check

```bash
npm run build
```

- **MUST pass with 0 TypeScript errors**
- If it fails, FIX THE ERRORS before proceeding
- Show actual build output in your report

### 2. Test Check

```bash
npm test
```

- **MUST show "X tests passing", NOT "No test suite found"**
- If tests fail, FIX THEM before proceeding
- Show actual test count and results

### 3. Import Validation

- List every `import { X } from 'Y'` statement in your files
- Verify X is exported from Y
- If any import is missing, FIX IT

### 4. Type Validation

- List every type you're using
- Verify it's defined in `AnalysisTypes.ts` or your domain file
- If any type is missing, DEFINE IT

### 5. Function Call Validation

- List every function you call from other files
- Verify each function exists
- If any function is missing, STOP and report it

### 6. Module Boundary Check

- Verify domain logic is in `lib/domain/` (pure functions)
- Verify service calls are in `lib/services/`
- Verify UI is in `components/`
- Verify orchestration is in `app/`

### 7. Contract Compliance (if contracts exist)

- Verify you only call functions listed in contract files
- Verify you export all functions required by contract
- If contract doesn't match reality, UPDATE THE CONTRACT

**DO NOT report "implementation complete" until ALL checks pass.**

---

## 🧪 Test Patterns & Requirements

### Critical: Vitest 4.x Configuration

**This project uses `vitest.config.ts` with `globals: true`.**

**❌ DO NOT import test functions:**

```typescript
// WRONG - This breaks test collection in Vitest 4.x!
import { describe, expect, it } from 'vitest';
```

**✅ Use globals directly (no imports needed):**

```typescript
// CORRECT - No imports, use globals provided by vitest.config.ts
import { calculatePortfolioMetrics } from '../portfolioEngine';

describe('calculatePortfolioMetrics', () => {
  it('calculates correctly', () => {
    const result = calculatePortfolioMetrics(portfolio, prices);
    expect(result.totalValue).toBe(expectedValue);
  });
});
```

### Test File Requirements

Every test file MUST have:

1. At least one `describe` block
2. At least one `it` or `test` block inside the describe
3. At least one real `expect()` assertion
4. Deterministic test data (no random values)

### Test Pattern Example

```typescript
// lib/domain/__tests__/example.test.ts
import { functionToTest } from '../example';

describe('functionToTest', () => {
  it('handles normal case', () => {
    const input = { /* known test data */ };
    const result = functionToTest(input);
    expect(result).toBe(expectedValue);
  });

  it('handles edge case', () => {
    const input = { /* edge case data */ };
    const result = functionToTest(input);
    expect(result).toBeDefined();
  });
});
```

### Verification

After creating tests, run:

```bash
npm test
```

**Expected output:** `✓ X tests passing`

**NOT acceptable:** `No test suite found`

---

## 📋 Contract Validation

### What Are Contracts?

Contract files define the interface between layers. They specify:

- What functions you MUST export (your deliverables)
- What functions you CAN import (from other layers)

### Contract File Locations

- `agent-prompts/contracts/[Feature]Contracts.ts`
- `agent-workflow/contracts/[Feature]Contracts.ts`

### Before Using Other Agents' Work

1. **Read the contract file FIRST**
2. **ONLY call functions listed in the contract**
3. **If you need a function that's not in the contract:**
   - STOP implementation
   - Report: "Cannot implement - missing function: [name] from [file]"
   - Wait for contract to be updated or function to be added

### When Creating New Features

1. **Create or update contract file** documenting your exports
2. **Document all functions you export** with signatures
3. **List all functions you import** and their sources
4. **Keep contract in sync with implementation**

### Example Contract

```typescript
// agent-prompts/contracts/PortfolioContracts.ts

/**
 * CONTRACT: Functions that portfolioEngine.ts MUST export
 */
export interface PortfolioEngineContract {
  calculateAllocation(portfolio: Portfolio, prices?: Map<string, number>): PortfolioAllocation[];
  calculatePortfolioMetrics(portfolio: Portfolio, prices?: Map<string, number>): PortfolioMetrics;
  detectConcentrationRisk(allocations: PortfolioAllocation[]): ConcentrationRisk;
}

/**
 * CONTRACT: Methods that portfolioService MUST implement
 */
export interface PortfolioServiceContract {
  getOrCreateDefaultPortfolio(): Portfolio;
  getCurrentPrices(tickers: string[]): Promise<Map<string, number>>;
  addHolding(portfolioId: string, holding: PortfolioHolding): void;
}
```

---

## 🔀 PR & Merge Guidelines

### Before Creating PR

1. **Complete all Post-Implementation Validation steps**
2. **Ensure branch is up to date with main:**
   ```bash
   git checkout main
   git pull origin main
   git checkout your-branch
   git rebase main  # or merge main
   ```
3. **Resolve any conflicts**
4. **Run final validation:**
   ```bash
   npm install
   npm run build
   npm test
   ```

### PR Title Format

```
feat(scope): description
fix(scope): description
docs(scope): description
```

Examples:
- `feat(portfolio): add portfolio tracking and metrics`
- `fix(ui): handle missing technical data gracefully`
- `docs(agent): update agent guide with new patterns`

### PR Description Template

```markdown
## Summary
- [Brief description of what was added/changed]

## Changes
- [List of files created/modified]
- [Key functions/components added]

## Testing
- ✅ npm run build passes
- ✅ npm test shows X tests passing
- [Any manual testing done]

## Reality Snapshot
- Branch: [actual branch name]
- Commit: [short hash]
- Build: [PASSING/FAILING with output]
- Tests: [X tests passing/failing]

## Checklist
- [ ] All imports verified to exist
- [ ] All types defined
- [ ] Build passes with 0 errors
- [ ] Tests pass (not "No test suite found")
- [ ] Module boundaries respected
- [ ] Contract compliance verified (if applicable)
```

### Merge Readiness Checklist

Before merging, verify:

- [ ] PR builds successfully
- [ ] All tests pass
- [ ] No broken imports
- [ ] No TypeScript errors
- [ ] Code follows module boundaries
- [ ] Documentation updated (if needed)

---

## 📊 Reality Snapshot Format

**Use this EXACT format when reporting progress:**

```markdown
## Reality Snapshot

Branch: [actual branch from `git status -sb`]
Commit: [short hash from `git log --oneline -n 1`]
Build: [npm run build → SUCCESS/FAILURE with actual output]
Tests: [npm test → X tests, Y passed/failed - actual count]
[Optional: List of files created/modified]
```

**Example:**

```markdown
## Reality Snapshot

Branch: ## feature/portfolio-tracking
Commit: a1b2c3d feat: add portfolio tracking system
Build: npm run build → ✅ SUCCESS (0 errors)
Tests: npm test → ✅ 15 tests passing

Files Created:
- lib/domain/portfolioEngine.ts
- lib/services/portfolioService.ts
- lib/domain/__tests__/portfolioEngine.test.ts
```

**DO NOT fabricate these values. Run the actual commands and report actual results.**

---

## 🚀 Quick Reference

### Essential Commands

```bash
# Repository state
git status -sb
git branch -a
git log --oneline -n 5

# Sync with main
git checkout main
git pull origin main
git checkout your-branch
git rebase main

# Build & test
npm install
npm run build
npm test

# Create feature branch
git checkout main
git pull origin main
git checkout -b feature/[descriptive-name]
```

### File Locations

- **Domain logic**: `lib/domain/`
- **Service layer**: `lib/services/`
- **UI components**: `components/`
- **Application**: `app/`
- **Types**: `lib/domain/AnalysisTypes.ts`
- **Tests**: `lib/**/__tests__/`
- **Contracts**: `agent-prompts/contracts/` or `agent-workflow/contracts/`

### Critical Files to Read

1. **This file** (AGENT_MASTER_GUIDE.md) - Read first!
2. `ARCHITECTURE.md` - System design
3. `MODULE_BOUNDARIES.md` - Where code should live
4. `CONTRIBUTING.md` - Code patterns
5. `vitest.config.ts` - Test configuration (check globals setting!)

### Common Mistakes to Avoid

1. ❌ Importing test functions when `globals: true`
2. ❌ Claiming tests pass without running `npm test`
3. ❌ Using functions that don't exist
4. ❌ Creating test files without assertions
5. ❌ Waiting for confirmation instead of starting implementation
6. ❌ Fabricating command output
7. ❌ Breaking module boundaries
8. ❌ Committing API keys

---

## 🎯 Your Goal

**Your goal is NOT to create the most impressive narrative, but to leave the repo in a state where:**

- `npm run build` passes with 0 errors
- `npm test` shows real tests passing (not "No test suite found")
- All imports reference actual file paths
- All functions called actually exist
- Module boundaries are respected
- PR merges cleanly to main

---

## 📚 Additional Resources

- `AGENT_ISSUES_REPORT.md` - Detailed analysis of past failures
- `agent-prompts/HOW_TO_FIX_AGENTS.md` - Specific fixes for common issues
- `AGENT_PROMPT_TEMPLATE.md` - Template with all constraints
- `CURSOR_MEGA_PROMPTS.md` - Complete prompts for all agent types

---

**Last Updated**: 2025-01-05

**Status**: Active - All agents must read this before starting work

**Purpose**: Prevent past mistakes, ensure smooth PR merges

---

## ⚡ START IMPLEMENTATION NOW

When you see this in a prompt, or when you've completed the Pre-Implementation Checklist:

**START WRITING CODE IMMEDIATELY**

Do NOT:
- Ask "shall I proceed?"
- Say "ready to start when you give the signal"
- Describe what you would do without doing it
- Wait for confirmation

DO:
- Create files immediately
- Write code immediately
- Run build and tests
- Report results with reality snapshot

**Your next message should contain actual code changes, not planning.**

