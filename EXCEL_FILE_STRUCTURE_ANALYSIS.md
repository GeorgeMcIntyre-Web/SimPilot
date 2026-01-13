# Excel File Structure Analysis
## Understanding File Types and User Workflows

**Date:** 2026-01-12
**Purpose:** Document how each Excel file type is structured and how users add/update information

---

## Overview

SimPilot ingests 4 main types of Excel files across different automotive manufacturing projects:

1. **Robot Lists** - Specifications and equipment for robots
2. **Tool Lists** - In-house tooling and equipment tracking
3. **Simulation Status** - Project milestone completion tracking
4. **Assemblies Lists** - Design progress tracking for assemblies/tools

---

## Project Structure

### Projects in TestData:
- **BMW (J10735)** - Side Frame manufacturing
  - Organized by file type folders (Robot List, Tool List, Sim Status, Assemblies List)

- **Ford V801** - Body shop automation
  - All files in single V801_Docs folder (Robot Equipment, Simulation Status)

- **STLA-S (J11006_TMS)** - Stellantis platform
  - Flat structure with multiple file types mixed

---

## File Type 1: Robot Lists

### Purpose
Track robot specifications, models, and equipment assignments

### BMW Example
**File:** `20240423_BMW_Produktionsliste_NCAR_MEX_Integration_BMW_an_Projekt_without_prices.xlsm`

**Key Characteristics:**
- Multi-sheet workbook (by platform/area)
- German language headers (BMW specific)
- Contains robot specifications: model, payload, reach, dress pack

**Expected Columns:**
- Robotnumber
- Robot caption
- Station Number
- Assembly line
- Robot Type / Model
- Payload / Reach
- Dress Pack
- Fanuc order code (for Fanuc robots)

### Ford V801 Example
**File:** `Ford_OHAP_V801N_Robot_Equipment_List.xlsx`

**Key Characteristics:**
- Multiple sheets for different line segments
- Tracks robot delivery status and equipment
- Multiple versions (WK3, 26.9 JPH variants)

**Expected Columns:**
- Area
- PLC Name
- Safety Zone
- Station No.
- Bundle
- Robo No. New / Robo No. Old
- Serial #
- Robot Key
- Person Responsible
- Robot Type
- Robot Order Submitted

**How Users Update:**
- Add new robots as stations are planned
- Update serial numbers when robots delivered
- Track robot substitutions
- Update person responsible assignments

---

## File Type 2: Tool Lists (In-House Tooling)

### Purpose
Track tools, equipment, and design progress for custom fixtures/tooling

### BMW Example
**File:** `J10735_BMW_NCAR_Robot_Equipment_List_Side_Frame.xlsx`
**File:** `J10735_BMW_NCAR_SLP_Tool list.xlsx`

**Key Characteristics:**
- Tracks internal tools/fixtures designed by simulation team
- Links tools to stations and robots
- Progress tracking columns

**Expected Columns:**
- TOOL ID / Equipment ID
- Station / Station Number
- Description / Tool Name
- Area / Sub Area Name
- Designer / Sim. Employee
- Status / Progress stages
- Due Date / Sim. Due Date
- Team Leader / Sim. Leader

### STLA-S Example
**File:** `STLA_S_ZAR Tool List.xlsx`

**How Users Update:**
- Create new tool entries when fixtures are designed
- Update progress through design stages
- Assign designers and track due dates
- Link tools to specific stations/robots

---

## File Type 3: Simulation Status Files

### Purpose
Track completion percentage of robot programming milestones across project phases

### BMW Example
**File:** `Side_Frame_Status_BMW_J10735_NCAR_CD_PILLAR.xlsx`

**Key Characteristics:**
- One sheet per area (CD_PILLAR, SFI, SFM, SFO, TLC)
- Status tracking for multiple programming stages
- Percentage completion columns

**Expected Columns:**
- AREA (optional - can be derived)
- ASSEMBLY LINE (optional)
- STATION
- ROBOT
- APPLICATION (optional)
- PERSONS RESPONSIBLE (optional)
- Multiple stage columns with percentages:
  - Concept / Layout
  - Rough Programming
  - Fine Programming
  - Validation
  - Documentation
  - etc. (varies by customer)

### Ford V801 Example
**File:** `FORD_V801_BODYSIDES_LH_7K-090L-to-7K-130L_26.9JPH_Simulation_Status.xlsx`

**Key Characteristics:**
- Multiple sheets: SIMULATION, MRS_OLP, DOCUMENTATION, SAFETY_LAYOUT
- MRS_OLP = Multi-Resource Offline Programming (detailed status)
- Vacuum-style parsing captures all metric columns dynamically

**How Users Update:**
- Engineers update percentage completion as work progresses
- Each robot/station has row with milestone percentages
- Updated weekly or at project milestones
- Percentages represent % complete for each stage

---

## File Type 4: Assemblies Lists

### Purpose
Track design progress for assemblies, fixtures, and tools through design stages

### BMW Example
**File:** `J10735_BMW_NCAR_C-D-Pillar_Assemblies_List.xlsm`

**Key Characteristics:**
- Design progress tracking (status document between design and simulation)
- Multiple stage columns showing progress percentages
- Typically has metadata rows at top (Job Number, Customer, etc.)

**Expected Columns:**
- Station / Station Number
- Tool Number / Assembly ID
- Description / Part Name
- Progress stages (percentage columns):
  - 1st Stage
  - 2nd Stage
  - Detailing
  - Checking
  - Issued
  - Not Started
- Date columns
- Customer / Job Number
- Area information

**File Structure:**
- **First ~8 rows**: Metadata (Job Number, Customer, Project name, etc.)
- **Row ~9-10**: Header row
- **Remaining rows**: Data rows with tool/assembly information

**How Users Update:**
- Design engineers update progress percentages
- Move tools through design stages (1st → 2nd → Detailing → Checking → Issued)
- Track completion status for each assembly/fixture
- Used to coordinate between design team and simulation team

---

## Common Patterns Across All File Types

### Sheet Naming Conventions
- **Priority sheets** are parsed first: SIMULATION, MRS_OLP, DOCUMENTATION, SAFETY_LAYOUT
- **Definition sheets** are avoided: "*_Def", "Definition", "Legend"
- **Template sheets** are avoided: "DATA", "OVERVIEW", "SUMMARY", "Boardroom"

### Header Row Detection
- Headers typically in first 10 rows
- May be split across multiple rows (row 1 + row 2)
- Case-insensitive keyword matching
- Flexible column ordering (columns can appear in any order)

### Data Quality
- Empty rows are skipped
- "Total" rows trigger end of data parsing
- Area codes can be derived from station IDs: `"7K-100L-1N"` → `"7K"`
- Percentage values: supports `95`, `95%`, `0.95` formats

### Multi-Sheet Workbooks
- BMW: One sheet per area/platform
- Ford V801: Multiple sheet types (SIMULATION, MRS_OLP, etc.)
- STLA-S: Mix of approaches

---

## User Workflow Examples

### Simulation Engineer Adding Robot Status
1. Open Simulation Status file
2. Find robot row by station/robot ID
3. Update percentage columns for completed milestones
4. Save file
5. Import to SimPilot for dashboard viewing

### Design Engineer Updating Assemblies Progress
1. Open Assemblies List file
2. Locate tool/assembly by Tool Number or Station
3. Update stage percentage (e.g., 1st Stage: 75% → 100%)
4. Move to next stage column
5. Save and import to SimPilot

### Project Manager Adding New Equipment
1. Open Robot Equipment List
2. Add new row with station and robot details
3. Assign person responsible
4. Track serial number when delivered
5. Update robot order status
6. Import to SimPilot for tracking

---

## Parsing Strategy by File Type

### Robot Lists → ROBOT_SPECS Category
- Route to: `robotEquipmentListParser.ts` (BMW) or custom V801 handler
- Key keywords: "Robotnumber", "Robot caption", "Robo No", "Robot Key"

### Tool Lists → IN_HOUSE_TOOLING Category
- Route to: `toolListParser.ts`
- Key keywords: "Tool ID", "Equipment ID", "Sim. Leader", "Sim. Employee"

### Simulation Status → SIMULATION_STATUS Category
- Route to: `simulationStatusParser.ts`
- Key keywords: "STATION", "ROBOT", percentage columns
- Vacuum parsing captures all metrics dynamically

### Assemblies Lists → ASSEMBLIES_LIST Category
- Route to: `assembliesListParser.ts`
- Key keywords: "1st Stage", "2nd Stage", "Detailing", "Checking", "Issued"
- Skip first 8 rows (metadata)

---

## Key Insights for Dashboard Development

### What Users Care About
1. **Completion percentages** - Quick view of project progress
2. **Person responsible** - Who's working on what
3. **Station/Robot mapping** - Which equipment needs attention
4. **Timeline tracking** - Due dates and milestone completion

### Data Relationships
- **Robots** link to **Stations** (1-to-many)
- **Tools** link to **Stations** and **Robots** (many-to-many)
- **Simulation Status** tracks **Robots** over time
- **Assemblies** track **Tools** through design lifecycle

### Version Tracking Needs
- Files updated frequently (weekly/milestone-based)
- Need to see changes over time (IndexedDB version tracking)
- Compare versions to identify progress/regressions
- Audit trail for who changed what when

---

## Next Steps for Analysis

### To Investigate Further:
1. **Exact column mappings** per customer (BMW vs Ford vs STLA-S)
2. **Stage names** - What are the standard milestone names?
3. **Validation rules** - What makes a row "valid" vs "invalid"?
4. **Update frequency** - How often do users import files?
5. **Pain points** - Where do users struggle with current workflow?

### Questions to Answer:
- Are there standard templates users must follow?
- Who creates these Excel files initially?
- How do multiple engineers coordinate updates?
- Are files stored in shared drives (version conflicts)?
- What happens when station/robot IDs change?

---

**Document Status:** Initial Draft
**Last Updated:** 2026-01-12
**Next Review:** After user feedback on file structures
