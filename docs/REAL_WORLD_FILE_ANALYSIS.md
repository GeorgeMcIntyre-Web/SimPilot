# Real-World Excel File Analysis

## Summary
Analyzed real-world Excel files from `C:\Users\georgem\source\repos\SimPilot_Data\TestData` to understand the structure needed for proper sheet detection.

## Key Findings

### Simulation Status Files Structure

Real-world STLA and V801 Simulation Status files follow this pattern:

1. **Row 1**: Title row (e.g., "UNDERBODY - SIMULATION", "DASH - SIMULATION")
2. **Row 2**: Headers row containing:
   - Standard headers: "PERSONS RESPONSIBLE", "AREA", "ASSEMBLY LINE", "STATION", "ROBOT", "APPLICATION"
   - **Strong keywords are in the header row itself**: "ROBOT POSITION - STAGE 1", "1st STAGE SIM COMPLETION"
3. **Row 3**: "DESIGNATION" row (often contains "DESIGNATION" in first column, "ROBOT SIMULATION" in later columns)
4. **Row 4+**: Data rows

### Example from STLA-S_UNDERBODY_Simulation_Status_DES.xlsx

**Sheet: "SIMULATION"**
- Row 1: `["UNDERBODY - SIMULATION","","","","","","","","",""]`
- Row 2: `["PERSONS RESPONSIBLE","AREA","ASSEMBLY LINE","STATION","ROBOT","APPLICATION","ROBOT POSITION - STAGE 1","DCS CONFIGURED",...]`
- Row 3: `["DESIGNATION","","","","","","ROBOT SIMULATION","","",""]`
- Row 4+: Data rows

### Sheet Detection Requirements

The sheet sniffer requires:
- **Minimum score of 5** (1 strong keyword OR 5 weak keywords)
- **Row count guard**: Sheets with < 25 rows need strong matches
- **Strong keywords** (found in real files):
  - "ROBOT POSITION - STAGE 1" (in header row)
  - "1st STAGE SIM COMPLETION" (in header row)
  - "FINAL DELIVERABLES"
- **Weak keywords** (found in real files):
  - "PERSONS RESPONSIBLE", "AREA", "ASSEMBLY LINE", "STATION", "ROBOT", "APPLICATION", "STAGE 1"

### Multi-Sheet Files

Real-world files often contain multiple sheets:
- **SIMULATION**: Main simulation status data
- **MRS_OLP**: Multi-resource simulation and offline programming
- **DOCUMENTATION**: Documentation-related metrics
- **SAFETY_LAYOUT**: Safety and layout verification
- **OVERVIEW**: Summary/overview (often empty or minimal)
- **DATA**: Data summary (often skipped)
- **APPLICATIONS**: Application reference data

### BMW Files Structure

BMW files have a different structure:
- Headers: `["AREA","STATION","ROBOT","APPLICATION",...]`
- Row 2: `["DESIGNATION","","","","ROBOT CONFIGURATION","","",""]`
- **No strong keywords** in the headers - only weak keywords
- These files may not be detected as SIMULATION_STATUS by the current sniffer

## Recommendations for Test Files

When creating mock Simulation Status files for tests:

1. **Use the 3-row header structure**:
   - Row 1: Title (e.g., "TEST - SIMULATION")
   - Row 2: Headers with strong keywords included
   - Row 3: "DESIGNATION" row

2. **Include strong keywords in Row 2 headers**:
   - "ROBOT POSITION - STAGE 1"
   - "1st STAGE SIM COMPLETION" (optional, but helps)

3. **Include weak keywords in Row 2 headers**:
   - "PERSONS RESPONSIBLE", "AREA", "ASSEMBLY LINE", "STATION", "ROBOT", "APPLICATION"

4. **Ensure minimum 25 rows** (including header rows) to pass row count guard

5. **Use sheet name "SIMULATION"** for maximum name bonus (+20 points)

## Files Analyzed

- STLA-S_UNDERBODY_Simulation_Status_DES.xlsx
- STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx
- FORD_V801_DASH_9B-100-to-9B-170_Simulation_Status.xlsx
- Multiple BMW Simulation Status files
- Tool List files (STLA_S_ZAR Tool List.xlsx, etc.)
