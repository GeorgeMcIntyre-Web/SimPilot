# Excel File Structure Analysis

**File:** `c:\Users\George\source\repos\SimPilot\user_data\d\OneDrive_1_2025-11-29\00_Simulation_Status\STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx`

**Sheet:** SIMULATION

## File Dimensions
- **Total Rows:** 3,224 (0-indexed: 0 to 3223)
- **Total Columns:** 69 (0-indexed: 0 to 68)

## Header Structure

### Multi-Row Headers
The sheet uses a **2-row header structure**:
- **Row 0:** Title row ("REAR UNIT - SIMULATION")
- **Row 1:** Main column headers (the actual field names)
- **Row 2:** Category/grouping headers (sparse, only appears at the start of each section)
- **Row 3:** Empty row
- **Row 4:** First data row

### Data Start Row
**Data begins at Row 4 (0-indexed)**

## Complete Column Mapping

### Identity Columns (0-5)
| Index | Column Name | Description | Sample Values |
|-------|-------------|-------------|---------------|
| 0 | PERSONS RESPONSIBLE | Person assigned | (empty in data rows) |
| 1 | AREA | Work area | "WHR LH", "WHR RH" |
| 2 | ASSEMBLY LINE | Assembly line code | "BN_B05" |
| 3 | STATION | Station number | "010", "020", "030", "040" |
| 4 | ROBOT | Robot identifier | "R01", "R02" |
| 5 | APPLICATION | Application type | "H+W", "W", "HW" |

### Robot Simulation Columns (6-17)
**Category Header (Row 2):** "ROBOT SIMULATION" (starts at column 6)

| Index | Column Name | Type | Sample Values |
|-------|-------------|------|---------------|
| 6 | ROBOT POSITION - STAGE 1 | Percentage | 100, 0-100 |
| 7 | DCS CONFIGURED | Percentage | 0, 50, 100 |
| 8 | DRESS PACK & FRYING PAN CONFIGURED - STAGE 1 | Percentage | 50, 0-100 |
| 9 | ROBOT FLANGE PCD + ADAPTERS CHECKED | Percentage | 50, 0-100 |
| 10 | ALL EOAT PAYLOADS CHECKED | Percentage | 25, 50, 0-100 |
| 11 | ROBOT TYPE CONFIRMED | Percentage | 100, 0-100 |
| 12 | ROBOT RISER CONFIRMED | Percentage | 80, 100, 0-100 |
| 13 | TRACK LENGTH + CATRAC CONFIRMED | Status | "NA" or 0-100 |
| 14 | ROBOT PROCESS PATHS CREATED | Percentage | 50, 0-100 |
| 15 | MACHINE OPERATION CHECKED AND MATCHES SIM | Percentage | 80, 0, 100 |
| 16 | CYCLETIME CHART SEQUECNE AND COUNTS UPDATED | Percentage | 0, 100 |
| 17 | COLLISIONS CHECKED | Percentage | 80, 0, 50 |

### Spot Welding Columns (18-25)
**Category Header (Row 2):** "SPOT WELDING" (starts at column 18)

| Index | Column Name | Type | Sample Values |
|-------|-------------|------|---------------|
| 18 | SPOT WELDS DISTRIBUTED + PROJECTED | Percentage | 100, 0-100 |
| 19 | REFERENCE WELD GUN SELECTED | Percentage | 100, 75 |
| 20 | REFERENCE WELD GUN COLLISION CHECK | Percentage | 100, 75 |
| 21 | WELD GUN FORCE CHECKED IN SPOT LIST | Percentage | 100, 90 |
| 22 | WELD GUN PROPOSAL CREATED | Percentage | 90, 25, 100 |
| 23 | FINAL WELD GUN COLLISION CHECK | Percentage | 0, 0-100 |
| 24 | FINAL WELD GUN APPROVED | Percentage | 0, 0-100 |
| 25 | WELD GUN EQUIPMENT PLACED AND CONFIRMED | Percentage | 80, 100 |

### Sealer Columns (26-29)
**Category Header (Row 2):** "SEALER" (starts at column 26)

| Index | Column Name | Type | Sample Values |
|-------|-------------|------|---------------|
| 26 | SEALING DATA IMPORTED AND CHECKED | Status | "NA" or 0-100 |
| 27 | SEALER PROPOSAL CREATED AND SENT | Status | "NA" or 0-100 |
| 28 | SEALER GUN APPROVED | Status | "NA" or 0-100 |
| 29 | SEALER EQUIPMENT PLACED AND CONFIRMED | Status | "NA" or 0-100 |

### Gripper Columns (30-33)
**Category Header (Row 2):** "GRIPPER" (starts at column 30)

| Index | Column Name | Type | Sample Values |
|-------|-------------|------|---------------|
| 30 | GRIPPER EQUIPMENT PROTOTYPE CREATED | Percentage | 25, 0, 90 |
| 31 | FINAL GRIPPER COLLISION CHECK | Percentage | 25, 0, 50 |
| 32 | GRIPPER DESIGN FINAL APPROVAL | Percentage | 0, 0-100 |
| 33 | TOOL CHANGE STANDS PLACED | Status | "NA" or 0-100 |

### Fixture Columns (34-36)
**Category Header (Row 2):** "FIXTURE" (starts at column 34)

| Index | Column Name | Type | Sample Values |
|-------|-------------|------|---------------|
| 34 | FIXTURE EQUIPMENT PROTOTYPE CREATED | Percentage | 100, 0, 50 |
| 35 | FINAL FIXTURE COLLISION CHECK | Percentage | 80, 75, 0, 50 |
| 36 | FIXTURE DESIGN FINAL APPROVAL | Percentage | 50, 0 |

### Layout Columns (37-43)
**Category Header (Row 2):** "LAYOUT" (starts at column 37)

| Index | Column Name | Type | Sample Values |
|-------|-------------|------|---------------|
| 37 | LATEST LAYOUT IN SIMULATION | Percentage | 50, 95 |
| 38 | 3D CABLE TRAYS CHECKED AND MATCH LAYOUT | Percentage | 0, 0-100 |
| 39 | 3D FENCING CHECKED AND MATCH LAYOUT | Percentage | 80, 100 |
| 40 | 3D DUNNAGES CHECKED AND MATCH LAYOUT | Percentage | 0, 50 |
| 41 | 3D CABINETS CHECKED AND MATCH LAYOUT | Percentage | 0, 50 |
| 42 | FINAL LAYOUT INCLUDED MATCHING LAYOUT + SIM | Percentage | 0, 0-100 |
| 43 | ALL EQUIPMENT FOUNDATION PLATES INCLUDED IN SIM | Percentage | 0, 0-100 |

### Additional Columns (44-68)
Columns 44-68 exist in the sheet range but appear to be empty (no headers or data in sampled rows).

## Sample Data Rows

### Row 4 (First Data Row)
```
AREA: "WHR LH"
ASSEMBLY LINE: "BN_B05"
STATION: "010"
ROBOT: "R01"
APPLICATION: "H+W"
ROBOT POSITION - STAGE 1: "100"
DCS CONFIGURED: "0"
DRESS PACK & FRYING PAN CONFIGURED - STAGE 1: "50"
ROBOT FLANGE PCD + ADAPTERS CHECKED: "50"
ALL EOAT PAYLOADS CHECKED: "25"
ROBOT TYPE CONFIRMED: "100"
ROBOT RISER CONFIRMED: "80"
TRACK LENGTH + CATRAC CONFIRMED: "NA"
ROBOT PROCESS PATHS CREATED: "50"
MACHINE OPERATION CHECKED AND MATCHES SIM: "80"
CYCLETIME CHART SEQUECNE AND COUNTS UPDATED: "0"
COLLISIONS CHECKED: "80"
SPOT WELDS DISTRIBUTED + PROJECTED: "100"
REFERENCE WELD GUN SELECTED: "100"
REFERENCE WELD GUN COLLISION CHECK: "100"
WELD GUN FORCE CHECKED IN SPOT LIST: "100"
WELD GUN PROPOSAL CREATED: "90"
FINAL WELD GUN COLLISION CHECK: "0"
FINAL WELD GUN APPROVED: "0"
WELD GUN EQUIPMENT PLACED AND CONFIRMED: "80"
SEALING DATA IMPORTED AND CHECKED: "NA"
SEALER PROPOSAL CREATED AND SENT: "NA"
SEALER GUN APPROVED: "NA"
SEALER EQUIPMENT PLACED AND CONFIRMED: "NA"
GRIPPER EQUIPMENT PROTOTYPE CREATED: "25"
FINAL GRIPPER COLLISION CHECK: "25"
GRIPPER DESIGN FINAL APPROVAL: "0"
TOOL CHANGE STANDS PLACED: "NA"
FIXTURE EQUIPMENT PROTOTYPE CREATED: "100"
FINAL FIXTURE COLLISION CHECK: "80"
FIXTURE DESIGN FINAL APPROVAL: "50"
LATEST LAYOUT IN SIMULATION: "50"
3D CABLE TRAYS CHECKED AND MATCH LAYOUT: "0"
3D FENCING CHECKED AND MATCH LAYOUT: "80"
3D DUNNAGES CHECKED AND MATCH LAYOUT: "0"
3D CABINETS CHECKED AND MATCH LAYOUT: "0"
FINAL LAYOUT INCLUDED MATCHING LAYOUT + SIM: "0"
ALL EQUIPMENT FOUNDATION PLATES INCLUDED IN SIM: "0"
```

### Row 5
```
AREA: "WHR LH"
ASSEMBLY LINE: "BN_B05"
STATION: "020"
ROBOT: "R01"
APPLICATION: "H+W"
[... similar structure with different percentage values ...]
```

### Row 6
```
AREA: "WHR LH"
ASSEMBLY LINE: "BN_B05"
STATION: "030"
ROBOT: "R01"
APPLICATION: "W"
[... similar structure with different percentage values ...]
```

## Stage/Status Columns Summary

**All columns from index 6-43 are stage/status columns** containing either:
- **Percentage values:** "0", "25", "50", "75", "80", "90", "100" (as strings)
- **NA values:** "NA" (when not applicable)
- **Empty cells:** "" (blank)

### Categories and Their Stage Columns

1. **ROBOT SIMULATION** (11 columns): 6-17
2. **SPOT WELDING** (8 columns): 18-25
3. **SEALER** (4 columns): 26-29
4. **GRIPPER** (4 columns): 30-33
5. **FIXTURE** (3 columns): 34-36
6. **LAYOUT** (7 columns): 37-43

**Total:** 38 stage/status columns (excluding the 6 identity columns)

## Data Patterns and Notes

1. **Header Row Index:** 1 (0-indexed)
2. **Category Row Index:** 2 (0-indexed)
3. **Data Start Row:** 4 (0-indexed)
4. **Percentage Values:** Stored as strings, not numbers ("100" not 100)
5. **NA Values:** String "NA", not null or empty
6. **Empty Cells:** Empty string ""
7. **Station Numbers:** 3-digit strings with leading zeros ("010", not "10")
8. **Application Types:** Single letters or combinations (H, W, H+W, HW)

## Parser Implementation Notes

To parse this file:
1. Skip rows 0-3 (title, headers, categories, empty row)
2. Start reading data from row 4
3. Use row 1 for column headers (main field names)
4. Use row 2 for category groupings (optional)
5. Convert percentage strings to numbers where needed
6. Handle "NA" as a special null/not-applicable value
7. Trim whitespace from column names (note trailing space in "ROBOT TYPE CONFIRMED ")
8. Columns 44-68 can be ignored (empty)
