# V801 Entity Generation Fix - 784 Count Achievement

## 🎯 Problem
V801 tool list was producing **2074 entities** instead of the expected **784**.

## 🔍 Root Cause
The original V801 parser created **separate entities for RH and LH tooling numbers**:
- Row with both RH and LH → 2 entities
- Row with only RH → 1 entity
- Row with only LH → 1 entity

This resulted in ~2072 total entities (sum of all RH + LH tooling identifiers).

## 💡 Solution
Changed V801 to produce **1 entity per row that has an Equipment No**:
- Each row represents a single mechanical piece (Equipment No = FIDES identifier)
- Use electrical identifiers (Tooling RH/LH) as the canonical key
- Both RH and LH tooling numbers are included in aliases for search/linking

## 📊 Key Insights from Domain Expert

### Equipment Identifiers
- **Equipment No** = Mechanical identifier (FIDES / Ford number)
- **Tooling Number RH** = Electrical identifier for right-hand side (primary)
- **Tooling Number LH** = Electrical identifier for left-hand side

### Body Side Design Pattern
- **Body side areas** (e.g., 7F, 7M): RH side is designed first, LH is "sym op" (symmetrical opposite)
  - RH and LH are the **same physical position**, mirrored
  - Should count as **1 unit**, not 2
- **Underbody/Floor areas**: No symmetrical opposite concept

### Count Target Meaning
- **784** = Number of Excel rows with Equipment No (mechanical pieces)
- Includes redacted rows with underscores (e.g., `016ZF-________-100-`)
- Each row represents 1 mechanical unit with associated electrical identifiers

## 🔧 Implementation Changes

### Before
```typescript
// Created separate entities for RH and LH
if (hasRH) {
  entities.push({ canonicalKey: `FORD|${toolingRH}`, ... })
}
if (hasLH) {
  entities.push({ canonicalKey: `FORD|${toolingLH}`, ... })
}
// Result: 2074 entities
```

### After
```typescript
// Only create entities for rows with Equipment No (gives 784 count)
if (!hasEquipNo) {
  return entities
}

// Use tooling number as canonical key (electrical identifier preferred)
if (hasRH) {
  canonicalKey = `FORD|${toolingRH}`
} else if (hasLH) {
  canonicalKey = `FORD|${toolingLH}`
} else {
  canonicalKey = `FORD|FIDES|${equipNo}`
}

// Include both RH and LH in aliases for search
aliases.push(toolingRH, toolingLH, equipNo, ...)

entities.push({ canonicalKey, aliases, ... })
// Result: 784 entities
```

## ✅ Validation Results

```
Total Tool Entities Produced:   784 (target: 784) ✅
Entities Skipped (Deleted):     0
Duplicate Canonical Keys:       9
Missing Tooling Numbers:        2
POSSIBLE_SHAPE_REDACTION:       154
```

### Breakdown by Area
- 7F (area): 152 entities
- 7M (area): 145 entities
- 7L (area): 132 entities
- 7K (area): 116 entities
- 7X (area): 107 entities
- 9X (area): 71 entities
- 8X (area): 46 entities
- 9B (area): 15 entities

### Expected Anomalies
- **9 duplicate canonical keys**: Same tooling number serves multiple Equipment Numbers (expected)
- **2 missing tooling numbers**: Rows with only Equipment No (FIDES-only entries)
- **154 shape redactions**: Equipment Numbers with underscores (included in 784 count)

## 🚀 Impact
- Entity count now matches business expectation (784)
- Canonical keys use electrical identifiers (Tooling RH/LH) which are used by other documents
- Mechanical identifiers (Equipment No) are preserved in aliases for search/linking
- Symmetrical opposite (sym op) handling is now correct - 1 entity per position

## 📝 Files Modified
- `src/ingestion/toolListSchemas/v801ToolListSchema.ts` - Updated `v801RowToToolEntities()` function
- `DELETION_DETECTION_HANDOFF.md` - Updated with solution explanation

---

**Fix implemented: 2026-01-09**
**Status: ✅ Production ready**
