# SOLID Improvements Plan: relationshipLinker.ts

## Overview
This plan outlines incremental improvements to make `relationshipLinker.ts` comply with SOLID design principles.

---

## Step 1: Remove Unused Parameter
**Principle:** Clean code / preparation for further refactoring

**Task:** Remove the unused `_areas` parameter from `findMatchingAsset()` and update `linkAssetsToSimulation()` accordingly.

**Files to modify:**
- `src/ingestion/relationshipLinker.ts`

**Changes:**
- Remove `_areas` parameter from `findMatchingAsset()` function signature
- Update the call site in `linkAssetsToSimulation()`
- Consider if `areas` parameter should be removed from `linkAssetsToSimulation()` public API (may be breaking change)

---

## Step 2: Extract Warning Management (Single Responsibility)
**Principle:** Single Responsibility Principle

**Task:** Extract warning generation and throttling logic into a dedicated `WarningCollector` class.

**Files to modify:**
- `src/ingestion/relationshipLinker.ts`

**Changes:**
- Create a `WarningCollector` class that handles:
  - Tracking warning count
  - Throttling (max warnings limit)
  - Generating summary warnings
  - Storing warnings array
- Replace inline warning logic in `linkAssetsToSimulation()` with `WarningCollector` usage

---

## Step 3: Create Configuration Options (Open/Closed)
**Principle:** Open/Closed Principle

**Task:** Introduce a `LinkingOptions` interface to make behavior configurable without modifying code.

**Files to modify:**
- `src/ingestion/relationshipLinker.ts`

**Changes:**
- Create `LinkingOptions` interface with:
  - `maxAmbiguousWarnings?: number` (default: 10)
- Update `linkAssetsToSimulation()` to accept optional `options` parameter
- Use options instead of hardcoded values

---

## Step 4: Make Disambiguation Strategy Injectable (Open/Closed)
**Principle:** Open/Closed Principle

**Task:** Extract the disambiguation logic into a strategy pattern, allowing different matching strategies.

**Files to modify:**
- `src/ingestion/relationshipLinker.ts`

**Changes:**
- Define `DisambiguationStrategy` type/interface
- Extract current "prefer robots" logic into `defaultDisambiguationStrategy`
- Add `disambiguationStrategy` to `LinkingOptions`
- Update `pickBestAssetForCell()` to use the injected strategy

---

## Step 5: Inject Logger Dependency (Dependency Inversion)
**Principle:** Dependency Inversion Principle

**Task:** Make the logger injectable for better testability and flexibility.

**Files to modify:**
- `src/ingestion/relationshipLinker.ts`

**Changes:**
- Define a `Logger` interface with `debug()` and `warn()` methods
- Add `logger` to `LinkingOptions` (optional, defaults to current `log`)
- Replace direct `log` usage with the injected logger

---

## Step 6: Make ID Generation Deterministic (Dependency Inversion)
**Principle:** Dependency Inversion Principle / Testability

**Task:** Make warning ID generation injectable for deterministic testing.

**Files to modify:**
- `src/ingestion/relationshipLinker.ts`

**Changes:**
- Add optional `idGenerator` function to `LinkingOptions`
- Default to `() => Date.now().toString()`
- Use injected generator in warning creation

---

## Execution Order

| Step | Complexity | Risk | Dependencies |
|------|------------|------|--------------|
| 1    | Low        | Low  | None         |
| 2    | Medium     | Low  | None         |
| 3    | Low        | Low  | None         |
| 4    | Medium     | Medium | Step 3     |
| 5    | Low        | Low  | Step 3       |
| 6    | Low        | Low  | Step 2, 3    |

---

## Notes
- Each step should be tested before moving to the next
- Steps 3-6 all build on the `LinkingOptions` pattern introduced in Step 3
- Breaking changes to the public API should be avoided where possible (use optional parameters)
