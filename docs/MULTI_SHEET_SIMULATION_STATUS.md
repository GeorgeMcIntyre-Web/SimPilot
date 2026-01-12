# Multi-Sheet Simulation Status Support

## Overview

Simulation Status files can contain multiple sheets depending on job requirements:
- **SIMULATION** (always present) - Main simulation status
- **MRS_OLP** (optional) - Multi-Resource Simulation & Offline Programming status
- **DOCUMENTATION** (optional) - Documentation completion tracking
- **SAFETY_LAYOUT** (optional) - Safety and Layout verification status

All sheets share the same structure:
- Core columns: STATION, ROBOT, APPLICATION, PERS. RESPONSIBLE
- Status columns: Various completion metrics (0-100 values)
- Same row structure: One row per robot/station combination

## Current State

- ✅ SIMULATION sheet is detected and parsed
- ❌ MRS_OLP, DOCUMENTATION, SAFETY_LAYOUT are ignored (detected as UNKNOWN)
- ✅ Parser uses "vacuum parsing" to capture all metrics dynamically

## Implementation Plan

### Phase 1: Sheet Detection
1. Add category signatures for MRS_OLP, DOCUMENTATION, SAFETY_LAYOUT
2. Treat them as SIMULATION_STATUS variants (same category)
3. Update sheet sniffer to detect all simulation-related sheets

### Phase 2: Multi-Sheet Parsing
1. Modify `parseSimulationStatus` to accept multiple sheet names
2. Parse each sheet independently
3. Merge metrics from all sheets into a single Cell entity
4. Preserve sheet source information in metrics

### Phase 3: Data Model Enhancement
1. Store sheet name in each metric (e.g., `"ROBOT POSITION - STAGE 1 (SIMULATION)"`)
2. Or use nested structure: `metrics: { SIMULATION: {...}, MRS_OLP: {...}, ... }`
3. Update UI to display metrics grouped by sheet

## Sheet Analysis

### MRS_OLP Sheet
**Headers:**
- FULL ROBOT PATHS CREATED WITH AUX DATA SET
- FINAL ROBOT POSITION
- COLLISION CHECKS DONE WITH RCS MODULE
- MACHINE OPERATION CHECKED AND MATCHES SIM
- CYCLETIME CHART SEQUENCE AND COUNTS UPDATED
- RCS MULTI RESOURCE SIMULATION RUNNING IN CYCLETIME
- RCS MULTI RESOURCE VIDEO RECORDED
- UTILITIES PATHS CREATED
- OLP DONE TO PROGRAMMING GUIDELINE

**Purpose:** Tracks multi-resource simulation and offline programming completion

### DOCUMENTATION Sheet
**Headers:**
- INTERLOCK ZONING DOCUMENTATION CREATED
- WIS7 SPOT LIST UPDATED
- CORE CUBIC S DOCUMENTATION CREATED
- ROBOT INSTALLATION DOCUMENTATION CREATED
- 1A4 SHEET CREATED + COMPLETED

**Purpose:** Tracks documentation completion status

### SAFETY_LAYOUT Sheet
**Headers:**
- CORE CUBIC S CONFIGURED
- LIGHT CURTAIN CALCULATIONS VERIFIED
- ROBOT MAIN CABLE LENGTH VERIFIED
- TIPDRESSER SERVO CABLE VERIFIED
- RTU CABLE LENGTH VERIFIED
- PEDESTAL SPOT WELD CABLE VERIFIED
- LATEST LAYOUT IN CORE CUBIC S
- 3D CABLE TRAYS CHECKED
- 3D FENCING CHECKED
- 3D DUNNAGES CHECKED
- 3D CABINETS CHECKED

**Purpose:** Tracks safety verification and layout completion

## Implementation Details

### Option A: Merge All Metrics (Recommended)
- Parse all sheets
- Combine metrics with sheet prefix: `"MRS_OLP: FULL ROBOT PATHS CREATED"`
- Single Cell entity with comprehensive metrics

### Option B: Separate Entities
- Create separate Cell entities for each sheet type
- Link them via stationId
- More complex but preserves sheet boundaries

**Recommendation:** Option A - simpler and matches current vacuum parsing approach

## Testing Strategy

1. Test with file containing only SIMULATION sheet (existing behavior)
2. Test with SIMULATION + MRS_OLP
3. Test with all four sheets
4. Verify metrics are correctly merged
5. Verify no duplicate cells created
