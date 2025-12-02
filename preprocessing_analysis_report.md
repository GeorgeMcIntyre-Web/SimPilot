# File Preprocessing Analysis Report

Generated: 2025-12-02T05:48:26.024Z
Files Analyzed: 8

---

## STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx

**Path:** `C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\00_Simulation_Status\STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx`
**Size:** 704.58 KB

### Overall Assessment

- **Category Detected:** ✅ Yes
- **Primary Category:** SIMULATION_STATUS
- **Schema Coverage:** 81%

**⚠️ Potential Issues:**
- [OVERVIEW] Low column coverage (0%)
- [APPLICATIONS] Category not detected (score: 0)
- [APPLICATIONS] Low column coverage (17%)
- [Boardroom_Status] Category not detected (score: 0)

**💡 Recommendations:**
- Add patterns for unknown headers to improve detection
- [OVERVIEW] Add patterns for: Job Start, 44, Job End, 52, Complete Job Duration
- [SIMULATION] Add patterns for: SEALING DATA IMPORTED AND CHECKED, SEALER PROPOSAL CREATED AND SENT, SEALER EQUIPMENT PLACED AND CONFIRMED, ALL EQUIPMENT FOUNDATION PLATES INCLUDED IN SIM
- [APPLICATIONS] Add category signature patterns to sheetSniffer.ts
- [APPLICATIONS] Add patterns for: Code, Method, Code, Special Functions, Code
- [Boardroom_Status] Add category signature patterns to sheetSniffer.ts
- [Boardroom_Status] Add patterns for: TECH, Auxilary Equipment, ZONING- MRS (CT)- OLP

### Sheets (7)

#### OVERVIEW

- **Category:** SIMULATION_STATUS (score: 15)
- **Header Row:** Row 3
- **Data Rows:** 4
- **Column Coverage:** 0% (0/6 detected)
- **Detected Roles:** UNKNOWN
- **Unknown Headers:** Job Start, 44, Job End, 52, Complete Job Duration, 8

**Issues:**
- Low column coverage (0%)

**Recommendations:**
- Add patterns for: Job Start, 44, Job End, 52, Complete Job Duration

#### SIMULATION

- **Category:** SIMULATION_STATUS (score: 14)
- **Header Row:** Row 2
- **Data Rows:** 26
- **Column Coverage:** 91% (40/44 detected)
- **Detected Roles:** ENGINEER, AREA, LINE_CODE, STATION, ROBOT_ID, COMMENTS, PAYLOAD, QUANTITY, PROJECT, GUN_NUMBER, GUN_FORCE, UNKNOWN, ROBOT_TYPE, TOOL_ID
- **Unknown Headers:** SEALING DATA IMPORTED AND CHECKED, SEALER PROPOSAL CREATED AND SENT, SEALER EQUIPMENT PLACED AND CONFIRMED, ALL EQUIPMENT FOUNDATION PLATES INCLUDED IN SIM

**Recommendations:**
- Add patterns for: SEALING DATA IMPORTED AND CHECKED, SEALER PROPOSAL CREATED AND SENT, SEALER EQUIPMENT PLACED AND CONFIRMED, ALL EQUIPMENT FOUNDATION PLATES INCLUDED IN SIM

**Sample Values:**
- `PERSONS RESPONSIBLE`: DESIGNATION
- `AREA`: WHR LH, WHR LH, WHR LH...
- `ASSEMBLY LINE`: BN_B05, BN_B05, BN_B05...
- `STATION`: 010, 020, 030...
- `ROBOT`: R01, R01, R01...
- `APPLICATION`: H+W, H+W, W...
- `ROBOT POSITION - STAGE 1`: ROBOT SIMULATION, 100, 100...
- `DCS CONFIGURED`: 0, 0, 0...
- `DRESS PACK & FRYING PAN CONFIGURED - STAGE 1`: 50, 50, 50...
- `ROBOT FLANGE PCD + ADAPTERS CHECKED`: 50, 50, 50...
- `ALL EOAT PAYLOADS CHECKED`: 25, 25, 25...
- `ROBOT TYPE CONFIRMED`: 100, 100, 100...
- `ROBOT RISER CONFIRMED`: 80, 80, 80...
- `TRACK LENGTH + CATRAC CONFIRMED`: NA, NA, NA...
- `ROBOT PROCESS PATHS CREATED`: 50, 50, 50...
- `MACHINE OPERATION CHECKED AND MATCHES SIM`: 80, 80, 0...
- `CYCLETIME CHART SEQUECNE AND COUNTS UPDATED`: 0, 0, 0...
- `COLLISIONS CHECKED`: 80, 80, 80...
- `SPOT WELDS DISTRIBUTED + PROJECTED`: SPOT WELDING, 100, 100...
- `REFERENCE WELD GUN SELECTED`: 100, 100, 100...

#### DOCUMENTATION

- **Category:** SIMULATION_STATUS (score: 6)
- **Header Row:** Row 2
- **Data Rows:** 26
- **Column Coverage:** 100% (10/10 detected)
- **Detected Roles:** ENGINEER, AREA, LINE_CODE, STATION, ROBOT_ID, COMMENTS, UNKNOWN

**Sample Values:**
- `PERSONS RESPONSIBLE`: DESIGNATION
- `AREA`: WHR LH, WHR LH, WHR LH...
- `ASSEMBLY LINE`: BN_B05, BN_B05, BN_B05...
- `STATION`: 010, 020, 030...
- `ROBOT`: R01, R01, R01...
- `APPLICATION`: H+W, H+W, W...
- `SPOT LIST UPDATED`: DOCUMENTATION, 75, 75...
- `DCS DOCUMENTATION CREATED`: 0, 0, 0...
- `ROBOT INSTALLATION DOCUMENTATION CREATED`: 0, 0, 0...
- `WELD JT FILES`: 0, 0, 0...

#### APPLICATIONS

- **Category:** UNKNOWN (score: 0)
- **Header Row:** Row 1
- **Data Rows:** 13
- **Column Coverage:** 17% (1/6 detected)
- **Detected Roles:** COMMENTS, UNKNOWN
- **Unknown Headers:** Code, Method, Code, Special Functions, Code

**Issues:**
- Category not detected (score: 0)
- Low column coverage (17%)

**Recommendations:**
- Add category signature patterns to sheetSniffer.ts
- Add patterns for: Code, Method, Code, Special Functions, Code

**Sample Values:**
- `Application`: Material Handling, Spot Welding, Arc Stud Welding...
- `Code`: v, g
- `Method`: Pedestal, Combination Mount, Tool Change...
- `Special Functions`: Vision, Geo End Effector

#### DATA

- **Category:** SIMULATION_STATUS (score: 21)
- **Header Row:** Row 1
- **Data Rows:** 2
- **Column Coverage:** 100% (9/9 detected)
- **Detected Roles:** UNKNOWN, ROBOT_ID, COMMENTS

**Sample Values:**
- `Column_0`: Completion, Outstanding
- `ROBOT SIMULATION`: 67%, 33%
- `JOINING`: 74%, 26%
- `GRIPPER`: 21%, 79%
- `FIXTURE`: 52%, 48%
- `SAFETY`: 0%, 100%
- `LAYOUT`: 34%, 66%
- `DOCUMENTATION`: 21%, 79%
- `1st STAGE SIM COMPLETION`: 41%, 59%
- `FINAL DELIVERABLES COMPLETION`: 31%, 69%

#### Boardroom_Status

- **Category:** UNKNOWN (score: 0)
- **Header Row:** Row 1
- **Data Rows:** 11
- **Column Coverage:** 73% (8/11 detected)
- **Detected Roles:** ROBOT_ID, UNKNOWN, TOOL_ID, COMMENTS, PROJECT
- **Unknown Headers:** TECH, Auxilary Equipment, ZONING- MRS (CT)- OLP

**Issues:**
- Category not detected (score: 0)

**Recommendations:**
- Add category signature patterns to sheetSniffer.ts
- Add patterns for: TECH, Auxilary Equipment, ZONING- MRS (CT)- OLP

**Sample Values:**
- `TECH`: SW, MH/SW, SW...
- `REACH-  ROBOT POS- PLINTH`: 68
- `TOOL APPROVAL - MOUNT PAYLOAD`: 62

#### Boardroom_Status_Def

- **Category:** SIMULATION_STATUS (score: 11)
- **Header Row:** Row 4
- **Data Rows:** 8
- **Column Coverage:** 100% (9/9 detected)
- **Detected Roles:** ROBOT_ID, COMMENTS, UNKNOWN

**Sample Values:**
- `REACH/  ROBOT POS/ PLINTH`: TOOL APPROVAL / MOUNT PAYLOAD, DOCs UPDATED: ROBOT LIST; MATRIX etc., Auxilary Equipment...
- `Part of Robot Simulation Phase on Status Sheet Namely:`: Part of Robot Simulation & Joining Phases on Status Sheet Namely:, Ensured that all lists & docs pertaining to ordering have been updated ie. The Robot Equipment List , Aux Equipment = Tipdressers, Toolstands, Pedestals, Toolchanges etc - All Approved, Ordered & Working ...
- `ROBOT POSITION - STAGE 1`: ROBOT FLANGE PCD + ADAPTERS CHECKED, WELD GUN EQUIPMENT PLACED AND CONFIRMED, CORE CUBIC-S CONFIGURED
- `DCS CONFIGURED`: ALL EOAT PAYLOADS CHECKED, ROBOT MAIN CABLE LENGTH VERIFIED, LIGHT CURTAIN CALCULATIONS VERIFIED 
- `DRESS PACK & FRYING PAN CONFIGURED - STAGE 1`: SPOT WELDS DISTRIBUTED + PROJECTED, TIPDRESSER SERVO CABLE VERIFIED 
- `ROBOT TYPE CONFIRMED`: REFERENCE WELD GUN SELECTED, RTU CABLE LENGTH VERIFIED
- `ROBOT RISER CONFIRMED`: REFERENCE WELD GUN COLLISION CHECK, PEDESTAL SPOT WELD CABLE VERIFIED 
- `TRACK LENGTH + CATRAC CONFIRMED`: WELD GUN FORCE CHECKED IN WIS7
- `COLLISIONS CHECKED - STAGE 1`: WELD GUN PROPOSAL CREATED
- `Column_9`: FINAL WELD GUN COLLISION CHECK
- `Column_10`: FINAL WELD GUN APPROVED

---

## STLA-S_UNDERBODY_Simulation_Status_DES.xlsx

**Path:** `C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\00_Simulation_Status\STLA-S_UNDERBODY_Simulation_Status_DES.xlsx`
**Size:** 704.44 KB

### Overall Assessment

- **Category Detected:** ✅ Yes
- **Primary Category:** SIMULATION_STATUS
- **Schema Coverage:** 81%

**⚠️ Potential Issues:**
- [OVERVIEW] Low column coverage (0%)
- [APPLICATIONS] Category not detected (score: 0)
- [APPLICATIONS] Low column coverage (17%)
- [Boardroom_Status] Category not detected (score: 0)

**💡 Recommendations:**
- Add patterns for unknown headers to improve detection
- [OVERVIEW] Add patterns for: Job Start, 44, Job End, 52, Complete Job Duration
- [SIMULATION] Add patterns for: SEALING DATA IMPORTED AND CHECKED, SEALER PROPOSAL CREATED AND SENT, SEALER EQUIPMENT PLACED AND CONFIRMED, ALL EQUIPMENT FOUNDATION PLATES INCLUDED IN SIM
- [APPLICATIONS] Add category signature patterns to sheetSniffer.ts
- [APPLICATIONS] Add patterns for: Code, Method, Code, Special Functions, Code
- [Boardroom_Status] Add category signature patterns to sheetSniffer.ts
- [Boardroom_Status] Add patterns for: TECH, Auxilary Equipment, ZONING- MRS (CT)- OLP

### Sheets (7)

#### OVERVIEW

- **Category:** SIMULATION_STATUS (score: 15)
- **Header Row:** Row 3
- **Data Rows:** 4
- **Column Coverage:** 0% (0/6 detected)
- **Detected Roles:** UNKNOWN
- **Unknown Headers:** Job Start, 44, Job End, 52, Complete Job Duration, 8

**Issues:**
- Low column coverage (0%)

**Recommendations:**
- Add patterns for: Job Start, 44, Job End, 52, Complete Job Duration

#### SIMULATION

- **Category:** SIMULATION_STATUS (score: 14)
- **Header Row:** Row 2
- **Data Rows:** 44
- **Column Coverage:** 91% (40/44 detected)
- **Detected Roles:** ENGINEER, AREA, LINE_CODE, STATION, ROBOT_ID, COMMENTS, PAYLOAD, QUANTITY, PROJECT, GUN_NUMBER, GUN_FORCE, UNKNOWN, ROBOT_TYPE, TOOL_ID
- **Unknown Headers:** SEALING DATA IMPORTED AND CHECKED, SEALER PROPOSAL CREATED AND SENT, SEALER EQUIPMENT PLACED AND CONFIRMED, ALL EQUIPMENT FOUNDATION PLATES INCLUDED IN SIM

**Recommendations:**
- Add patterns for: SEALING DATA IMPORTED AND CHECKED, SEALER PROPOSAL CREATED AND SENT, SEALER EQUIPMENT PLACED AND CONFIRMED, ALL EQUIPMENT FOUNDATION PLATES INCLUDED IN SIM

**Sample Values:**
- `PERSONS RESPONSIBLE`: DESIGNATION, Lavesh, Lavesh...
- `AREA`: UBM_Platforme / Styleline, UBM_Platforme / Styleline, UBM_Platforme / Styleline...
- `ASSEMBLY LINE`: BC_B04, BC_B04, BC_B04...
- `STATION`: 007, 008, 009...
- `ROBOT`: R01, R01, R01...
- `APPLICATION`: HD, HW, HD...
- `ROBOT POSITION - STAGE 1`: ROBOT SIMULATION, 60, 60...
- `DCS CONFIGURED`: 40, 40, 40...
- `DRESS PACK & FRYING PAN CONFIGURED - STAGE 1`: 30, 50, 50...
- `ROBOT FLANGE PCD + ADAPTERS CHECKED`: 30, 30, 30...
- `ALL EOAT PAYLOADS CHECKED`: 100, 0, 0...
- `ROBOT TYPE CONFIRMED`: 60, 60, 60...
- `ROBOT RISER CONFIRMED`: 80, 80, 80...
- `ROBOT PROCESS PATHS CREATED`: 10, 10, 10...
- `MACHINE OPERATION CHECKED AND MATCHES SIM`: 0, 0, 0...
- `CYCLETIME CHART SEQUECNE AND COUNTS UPDATED`: 75, 75, 75...
- `COLLISIONS CHECKED`: 0, 0, 0...
- `SPOT WELDS DISTRIBUTED + PROJECTED`: SPOT WELDING, 80, 100
- `REFERENCE WELD GUN SELECTED`: 60, 100

#### DOCUMENTATION

- **Category:** SIMULATION_STATUS (score: 6)
- **Header Row:** Row 2
- **Data Rows:** 43
- **Column Coverage:** 100% (10/10 detected)
- **Detected Roles:** ENGINEER, AREA, LINE_CODE, STATION, ROBOT_ID, COMMENTS, UNKNOWN

**Sample Values:**
- `PERSONS RESPONSIBLE`: DESIGNATION
- `AREA`: UBM_Platforme / Styleline, UBM_Platforme / Styleline, UBM_Platforme / Styleline...
- `ASSEMBLY LINE`: BA_B04, BA_B04, BA_B04...
- `STATION`: 007, 008, 009...
- `ROBOT`: R01, R01, R01...
- `APPLICATION`: HD, HW, HD...
- `SPOT LIST UPDATED`: DOCUMENTATION, 0, 100
- `DCS DOCUMENTATION CREATED`: 0, 0, 0...
- `ROBOT INSTALLATION DOCUMENTATION CREATED`: 0, 0, 0...
- `WELD JT FILES`: 0, 0

#### APPLICATIONS

- **Category:** UNKNOWN (score: 0)
- **Header Row:** Row 1
- **Data Rows:** 13
- **Column Coverage:** 17% (1/6 detected)
- **Detected Roles:** COMMENTS, UNKNOWN
- **Unknown Headers:** Code, Method, Code, Special Functions, Code

**Issues:**
- Category not detected (score: 0)
- Low column coverage (17%)

**Recommendations:**
- Add category signature patterns to sheetSniffer.ts
- Add patterns for: Code, Method, Code, Special Functions, Code

**Sample Values:**
- `Application`: Material Handling, Spot Welding, Arc Stud Welding...
- `Code`: v, g
- `Method`: Pedestal, Combination Mount, Tool Change...
- `Special Functions`: Vision, Geo End Effector

#### DATA

- **Category:** SIMULATION_STATUS (score: 21)
- **Header Row:** Row 1
- **Data Rows:** 2
- **Column Coverage:** 100% (9/9 detected)
- **Detected Roles:** UNKNOWN, ROBOT_ID, COMMENTS

**Sample Values:**
- `Column_0`: Completion, Outstanding
- `ROBOT SIMULATION`: 49%, 51%
- `JOINING`: 42%, 58%
- `GRIPPER`: 19%, 81%
- `FIXTURE`: 37%, 63%
- `SAFETY`: 0%, 100%
- `LAYOUT`: 41%, 59%
- `DOCUMENTATION`: 20%, 80%
- `1st STAGE SIM COMPLETION`: 31%, 69%
- `FINAL DELIVERABLES COMPLETION`: 26%, 74%

#### Boardroom_Status

- **Category:** UNKNOWN (score: 0)
- **Header Row:** Row 1
- **Data Rows:** 11
- **Column Coverage:** 73% (8/11 detected)
- **Detected Roles:** ROBOT_ID, UNKNOWN, TOOL_ID, COMMENTS, PROJECT
- **Unknown Headers:** TECH, Auxilary Equipment, ZONING- MRS (CT)- OLP

**Issues:**
- Category not detected (score: 0)

**Recommendations:**
- Add category signature patterns to sheetSniffer.ts
- Add patterns for: TECH, Auxilary Equipment, ZONING- MRS (CT)- OLP

**Sample Values:**
- `TECH`: SW, MH/SW, SW...
- `REACH-  ROBOT POS- PLINTH`: 45
- `TOOL APPROVAL - MOUNT PAYLOAD`: 65

#### Boardroom_Status_Def

- **Category:** SIMULATION_STATUS (score: 11)
- **Header Row:** Row 4
- **Data Rows:** 8
- **Column Coverage:** 100% (9/9 detected)
- **Detected Roles:** ROBOT_ID, COMMENTS, UNKNOWN

**Sample Values:**
- `REACH/  ROBOT POS/ PLINTH`: TOOL APPROVAL / MOUNT PAYLOAD, DOCs UPDATED: ROBOT LIST; MATRIX etc., Auxilary Equipment...
- `Part of Robot Simulation Phase on Status Sheet Namely:`: Part of Robot Simulation & Joining Phases on Status Sheet Namely:, Ensured that all lists & docs pertaining to ordering have been updated ie. The Robot Equipment List , Aux Equipment = Tipdressers, Toolstands, Pedestals, Toolchanges etc - All Approved, Ordered & Working ...
- `ROBOT POSITION - STAGE 1`: ROBOT FLANGE PCD + ADAPTERS CHECKED, WELD GUN EQUIPMENT PLACED AND CONFIRMED, CORE CUBIC-S CONFIGURED
- `DCS CONFIGURED`: ALL EOAT PAYLOADS CHECKED, ROBOT MAIN CABLE LENGTH VERIFIED, LIGHT CURTAIN CALCULATIONS VERIFIED 
- `DRESS PACK & FRYING PAN CONFIGURED - STAGE 1`: SPOT WELDS DISTRIBUTED + PROJECTED, TIPDRESSER SERVO CABLE VERIFIED 
- `ROBOT TYPE CONFIRMED`: REFERENCE WELD GUN SELECTED, RTU CABLE LENGTH VERIFIED
- `ROBOT RISER CONFIRMED`: REFERENCE WELD GUN COLLISION CHECK, PEDESTAL SPOT WELD CABLE VERIFIED 
- `TRACK LENGTH + CATRAC CONFIRMED`: WELD GUN FORCE CHECKED IN WIS7
- `COLLISIONS CHECKED - STAGE 1`: WELD GUN PROPOSAL CREATED
- `Column_9`: FINAL WELD GUN COLLISION CHECK
- `Column_10`: FINAL WELD GUN APPROVED

---

## GLOBAL_ZA_REUSE_LIST_RISERS.xlsx

**Path:** `C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\GLOBAL_ZA_REUSE_LIST_RISERS.xlsx`
**Size:** 76.56 KB

### Overall Assessment

- **Category Detected:** ✅ Yes
- **Primary Category:** REUSE_RISERS
- **Schema Coverage:** 91%

**💡 Recommendations:**
- Add patterns for unknown headers to improve detection
- [Raisers] Add patterns for: Standard

### Sheets (1)

#### Raisers

- **Category:** REUSE_RISERS (score: 20)
- **Header Row:** Row 4
- **Data Rows:** 449
- **Column Coverage:** 91% (10/11 detected)
- **Detected Roles:** PROJECT, AREA, ZONE, BRAND, HEIGHT, UNKNOWN, ROBOT_TYPE, LINE_CODE, STATION, COMMENTS
- **Unknown Headers:** Standard

**Recommendations:**
- Add patterns for: Standard

**Sample Values:**
- `Proyect`: P1MX, P1MX, P1MX...
- `Area`: Framing, Framing, Framing...
- `Location`: Linie 3_LD_010_R01, Linie 3_LD_020_R01, Linie 3_LD_040_R01...
- `Brand`: Ka000292S, Ka107999S, Ka000292S...
- `Height`: Baseplate, 600mm Height, Baseplate...
- `Standard`: OV, OV, OV...

---

## GLOBAL_ZA_REUSE_LIST_TIP_DRESSER.xlsx

**Path:** `C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\GLOBAL_ZA_REUSE_LIST_TIP_DRESSER.xlsx`
**Size:** 448.77 KB

### Overall Assessment

- **Category Detected:** ✅ Yes
- **Primary Category:** REUSE_WELD_GUNS
- **Schema Coverage:** 73%

**⚠️ Potential Issues:**
- [Data Validation] Category not detected (score: 0)

**💡 Recommendations:**
- Add patterns for unknown headers to improve detection
- [TIP DRESSER] Add patterns for: TIP DRESSER, New Sector
- [Data Validation] Add category signature patterns to sheetSniffer.ts
- [Data Validation] Add patterns for: Standard

### Sheets (2)

#### TIP DRESSER

- **Category:** REUSE_WELD_GUNS (score: 9)
- **Header Row:** Row 1
- **Data Rows:** 603
- **Column Coverage:** 75% (6/8 detected)
- **Detected Roles:** UNKNOWN, ROBOT_ID, GUN_NUMBER, PROJECT, LINE_CODE, STATION
- **Unknown Headers:** TIP DRESSER, New Sector

**Recommendations:**
- Add patterns for: TIP DRESSER, New Sector

**Sample Values:**
- `Column_0`: No, 1, 2...
- `Column_1`: Plant, ZA, ZA...
- `Column_2`: Area, Underbody, Underbody...
- `Column_3`: Zone/Subzone, P1Mx, P1Mx...
- `Column_4`: Station, Underbody Marriage, Underbody Marriage...
- `ROBOT`: Device Name, BA020B2-R01-W01, BA020B2-R02-W01...
- `Column_6`: Application robot, SEL, SEL...
- `Column_7`: Model
- `Column_8`: Cabinet
- `WELDING GUNS`: Supplier, TMS / ARO, TMS / ARO...
- `TIP DRESSER`: Supplier, ETS, ETS...
- `Column_11`: Static (S) / Mobile (M), S, S...
- `Column_12`: Reference, 00.31.00.73_V, 00.31.00.73_V...
- `Column_13`: OK to Rehuse, OK, OK...
- `Column_14`: Manguera Potencia, OK, OK...
- `Column_15`: Soporte/MEC, OK, OK...
- `Column_16`: Motor, OK, OK...
- `Column_17`: Portacuchillas, OK, OK...
- `Column_18`: Valvula Soplador Pinza Embarcada, OK, OK...
- `Column_19`: Cilindro abatible.

#### Data Validation

- **Category:** UNKNOWN (score: 0)
- **Header Row:** Row 1
- **Data Rows:** 5
- **Column Coverage:** 67% (2/3 detected)
- **Detected Roles:** ZONE, UNKNOWN, GUN_NUMBER
- **Unknown Headers:** Standard

**Issues:**
- Category not detected (score: 0)

**Recommendations:**
- Add category signature patterns to sheetSniffer.ts
- Add patterns for: Standard

**Sample Values:**
- `Zone/Subzone`: P1Mx, P21
- `Standard`: Global 1, Global 2, Global 3...
- `Weld Gun Type`: Flex-Gun, GLOBAL C -WELDING GUN, GLOBAL P -WELDING GUN...

---

## GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx

**Path:** `C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx`
**Size:** 490.00 KB

### Overall Assessment

- **Category Detected:** ✅ Yes
- **Primary Category:** REUSE_WELD_GUNS
- **Schema Coverage:** 37%

**⚠️ Potential Issues:**
- Low schema coverage (37%) - many columns unrecognized
- Some sheets have no detectable header row
- [Sintesis] Category not detected (score: 0)
- [Sintesis] Low column coverage (8%)
- [Data Validation] Category not detected (score: 0)
- [Feuil1] Category not detected (score: 0)
- [Feuil1] No header row detected
- [Feuil1] Low column coverage (0%)

**💡 Recommendations:**
- Review unknown columns and add patterns to columnRoleDetector
- Add patterns for unknown headers to improve detection
- [Sintesis] Add category signature patterns to sheetSniffer.ts
- [Sintesis] Add patterns for: AT6, Body Side, Botton Tray, DOORS, Framing II
- [Welding guns] Add patterns for: TIP DRESSER
- [Data Validation] Add category signature patterns to sheetSniffer.ts
- [Data Validation] Add patterns for: Standard, Tipo de pinza
- [Feuil1] Add category signature patterns to sheetSniffer.ts
- [Feuil1] Review sheet structure - headers may be in non-standard location

### Sheets (4)

#### Sintesis

- **Category:** UNKNOWN (score: 0)
- **Header Row:** Row 4
- **Data Rows:** 2
- **Column Coverage:** 8% (1/13 detected)
- **Detected Roles:** UNKNOWN, RESERVE
- **Unknown Headers:** AT6, Body Side, Botton Tray, DOORS, Framing II, Front Unit, Rear Unit, Sidepanel, TAILGATE, Underbody...

**Issues:**
- Category not detected (score: 0)
- Low column coverage (8%)

**Recommendations:**
- Add category signature patterns to sheetSniffer.ts
- Add patterns for: AT6, Body Side, Botton Tray, DOORS, Framing II

**Sample Values:**
- `Column_0`: Cuenta de Sector
- `AT6`: 11
- `Body Side`: 6, NEW
- `Botton Tray`: 10
- `DOORS`: 20
- `Framing II`: 72, CARRY OVER
- `Front Unit`: 60
- `Rear Unit`: 48
- `Sidepanel`: 78, CARRY OVER
- `TAILGATE`: 5
- `Underbody`: 52
- `Total general`: 362

#### Welding guns

- **Category:** REUSE_WELD_GUNS (score: 18)
- **Header Row:** Row 1
- **Data Rows:** 599
- **Column Coverage:** 88% (7/8 detected)
- **Detected Roles:** UNKNOWN, ROBOT_ID, GUN_NUMBER, PROJECT, LINE_CODE, STATION, COMMENTS
- **Unknown Headers:** TIP DRESSER

**Recommendations:**
- Add patterns for: TIP DRESSER

**Sample Values:**
- `Column_0`: 1, 2, 3...
- `Column_1`: Plant, ZA, ZA...
- `Column_2`: Area, Underbody, Underbody...
- `Column_3`: Zone/Subzone, P1Mx, P1Mx...
- `Column_4`: Station, Underbody Marriage, Underbody Marriage...
- `ROBOT`: Device Name, BA020B2-R01-W01, BA020B2-R02-W01...
- `Column_6`: Application robot, SEL, SEL...
- `Column_7`: Model
- `Column_8`: Cabinet
- `WELDING GUNS`: Supplier, TMS / ARO, TMS / ARO...
- `Column_10`: Asset description, LS-X WELDING GUN, LS-X WELDING GUN...
- `Column_11`: Standard, Global 3, Global 3...
- `Column_12`: Serial Number
Complete WG, KAA34832S, KAA34832S...
- `Column_13`: Body Serial Number, KAA34832S, KAA34832S...
- `Column_14`: Saving/Body [€], TMS, TMS...
- `Column_15`: Saving/set arms  [€]
- `Column_16`: Comments
- `TIP DRESSER`: Supplier2, ETS, ETS...
- `Column_18`: Static (S) / Mobile (M), S, S...
- `Column_19`: Reference

#### Data Validation

- **Category:** UNKNOWN (score: 0)
- **Header Row:** Row 1
- **Data Rows:** 5
- **Column Coverage:** 60% (3/5 detected)
- **Detected Roles:** ZONE, UNKNOWN, GUN_NUMBER, TOOL_ID
- **Unknown Headers:** Standard, Tipo de pinza

**Issues:**
- Category not detected (score: 0)

**Recommendations:**
- Add category signature patterns to sheetSniffer.ts
- Add patterns for: Standard, Tipo de pinza

**Sample Values:**
- `Zone/Subzone`: P1Mx, P21
- `Standard`: Global 1, Global 2, Global 3...
- `Weld Gun Type`: Flex-Gun, GLOBAL C -WELDING GUN, GLOBAL P -WELDING GUN...
- `Tipo de pinza`: LS-X WELDING GUN, GLOBAL P -WELDING GUN, GLOBAL W -WELDING GUN...
- `Tool number`: KAA34832S, KAA34795s, KAA34797s...

#### Feuil1

- **Category:** UNKNOWN (score: 0)
- **Header Row:** Not found
- **Data Rows:** 556
- **Column Coverage:** 0% (0/4 detected)

**Issues:**
- Category not detected (score: 0)
- No header row detected
- Low column coverage (0%)

**Recommendations:**
- Add category signature patterns to sheetSniffer.ts
- Review sheet structure - headers may be in non-standard location

---

## P1MX_Reuse Equipment -STLA-S_2025_10_29_REV00.xlsm

**Path:** `C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\P1MX_Reuse Equipment -STLA-S_2025_10_29_REV00.xlsm`
**Size:** 21446.06 KB

### Overall Assessment

- **Category Detected:** ✅ Yes
- **Primary Category:** IN_HOUSE_TOOLING
- **Schema Coverage:** 12%

**⚠️ Potential Issues:**
- Low schema coverage (12%) - many columns unrecognized
- Some sheets have no data rows
- Some sheets have no detectable header row
- [Reuse M1A25115] Category not detected (score: 0)
- [claims] Sheet is empty
- [admin|preselect] Category not detected (score: 0)
- [admin|preselect] Low column coverage (0%)
- [project overview (admin)] Low column coverage (0%)
- [Protokoll] Category not detected (score: 0)
- [Protokoll] Low column coverage (0%)
- [-GROBPLANUNG-] Category not detected (score: 0)
- [-GROBPLANUNG-] Low column coverage (40%)

**💡 Recommendations:**
- Review unknown columns and add patterns to columnRoleDetector
- Add patterns for unknown headers to improve detection
- [Reuse M1A25115] Add category signature patterns to sheetSniffer.ts
- [Reuse M1A25115] Add patterns for: Werk, L / R, Identification, number of pieces, drawing-nr.
(KAA…….)
- [admin|preselect] Add category signature patterns to sheetSniffer.ts
- [admin|preselect] Add patterns for: Sp1, Sp2, Sp3, Sp4, Sp5
- [project overview (admin)] Add patterns for: INDEX, DEUTSCH (de), ENGLISH (en), language3 (l3)
- [Protokoll] Add category signature patterns to sheetSniffer.ts
- [Protokoll] Add patterns for: Register, Zelle, Wert, Datum, Zeit
- [-GROBPLANUNG-] Add category signature patterns to sheetSniffer.ts
- [-GROBPLANUNG-] Add patterns for: Durch-laufzeit, Stück, Zeitplan

### Sheets (6)

#### Reuse M1A25115

- **Category:** UNKNOWN (score: 0)
- **Header Row:** Row 3
- **Data Rows:** 292
- **Column Coverage:** 55% (6/11 detected)
- **Detected Roles:** UNKNOWN, AREA, ZONE, STATION, TOOL_ID, COMMENTS, QUANTITY
- **Unknown Headers:** Werk, L / R, Identification, number of pieces, drawing-nr.
(KAA…….)

**Issues:**
- Category not detected (score: 0)

**Recommendations:**
- Add category signature patterns to sheetSniffer.ts
- Add patterns for: Werk, L / R, Identification, number of pieces, drawing-nr.
(KAA…….)

**Sample Values:**
- `Werk`: ZAR, ZAR, ZAR...
- `Area`: Rear Rail , Rear Rail , Rear Rail ...
- `Zone`: CL, CL, CL...
- `Station`: 010, 010, 010...
- `L / R`: L+R, L+R, L+R...
- `Identification`: Drehtisch (ZSB), Drehtisch / Sockel, Drehtisch Rahmen horizontal  ...
- `number of pieces`: 618,  2   ,  2   ...
- `drawing-nr.
(KAA…….)`: KAA31701, KAA31580, KAA31581...
- `Column_9`: L, S, S...
- `Comment
DESIGN`: Gesamt ZSB BQ010TTB01 / BQ 040TTB01, TD with Found.- Plate & Switches BQ010TTB01 / BQ 040TTB01, BQ010TTB01 / BQ 040TTB01...
- `required quantity`: 22x
- `Column_18`: 1x

#### claims

- **Category:** UNKNOWN (score: 0)
- **Header Row:** Not found
- **Data Rows:** 0
- **Column Coverage:** 0% (0/0 detected)

**Issues:**
- Sheet is empty

#### admin|preselect

- **Category:** UNKNOWN (score: 0)
- **Header Row:** Row 1
- **Data Rows:** 298
- **Column Coverage:** 0% (0/39 detected)
- **Detected Roles:** UNKNOWN
- **Unknown Headers:** Sp1, Sp2, Sp3, Sp4, Sp5, Sp6, Sp7, Sp8, Sp9, Sp10...

**Issues:**
- Category not detected (score: 0)
- Low column coverage (0%)

**Recommendations:**
- Add category signature patterns to sheetSniffer.ts
- Add patterns for: Sp1, Sp2, Sp3, Sp4, Sp5

**Sample Values:**
- `Column_0`: PRESELECTION, A, NEU - Beschaffung...
- `Column_1`: B, Modify, BA1
- `Column_2`: C, REUSE, CA1
- `Column_3`: O, Old, OA1
- `Column_4`: M, Move, MA1
- `Sp1`: Projekt:, A1
- `Sp2`: 0
- `Sp3`: DEUTSCH (de), GEO-Fixture
- `Sp4`: ENGLISH (en), GEO-Fixture
- `Sp5`: language3 (l3), l3_1
- `Sp6`: Status
- `Sp7`: ToDo, x
- `Sp9`: old, old
- `Sp10`: 3D, 0
- `Sp11`: 2D, 0
- `Sp12`: AV/ PU, 0
- `Sp13`: Fert., 0
- `Sp14`: Zsb., 0
- `Sp15`: new, new

#### project overview (admin)

- **Category:** IN_HOUSE_TOOLING (score: 5)
- **Header Row:** Row 4
- **Data Rows:** 212
- **Column Coverage:** 0% (0/4 detected)
- **Detected Roles:** UNKNOWN
- **Unknown Headers:** INDEX, DEUTSCH (de), ENGLISH (en), language3 (l3)

**Issues:**
- Low column coverage (0%)

**Recommendations:**
- Add patterns for: INDEX, DEUTSCH (de), ENGLISH (en), language3 (l3)

**Sample Values:**
- `Column_0`: DROPDOWN STEUERELEMENT (anpassen), Zaragoza
- `Column_2`: DROPDOWN STEUERELEMENT (anpassen), Beistellung, ***...
- `Column_4`: SPRACHE:, DEUTSCH (de), ENGLISH (en)...
- `Column_6`: Fertigung, OFFEN, in Anfrage...
- `INDEX`: Column1, Column2, Column3...
- `DEUTSCH (de)`: Hilfsfeld, Hilfsfeld, Hilfsfeld...
- `ENGLISH (en)`: Helpbox, Helpbox, Helpbox...
- `language3 (l3)`: language3, language3, language3...

#### Protokoll

- **Category:** UNKNOWN (score: 0)
- **Header Row:** Row 2
- **Data Rows:** 998
- **Column Coverage:** 0% (0/7 detected)
- **Detected Roles:** UNKNOWN
- **Unknown Headers:** Register, Zelle, Wert, Datum, Zeit, User, CW

**Issues:**
- Category not detected (score: 0)
- Low column coverage (0%)

**Recommendations:**
- Add category signature patterns to sheetSniffer.ts
- Add patterns for: Register, Zelle, Wert, Datum, Zeit

**Sample Values:**
- `Register`: start, list of componets (LOC), list of componets (LOC)...
- `Zelle`: Q288, Q292, R271...
- `Wert`: 0.1, 0.2, KAA31963...
- `Datum`: 3/12/15, 3/18/15, 3/18/15...
- `Zeit`: 9:49:00 AM, 3:45:06 PM, 3:45:11 PM...
- `User`: ofnerre, scholld, scholld...
- `CW`: 11/2015, 12/2015, 12/2015...

#### -GROBPLANUNG-

- **Category:** UNKNOWN (score: 0)
- **Header Row:** Row 6
- **Data Rows:** 18
- **Column Coverage:** 40% (2/5 detected)
- **Detected Roles:** UNKNOWN, GUN_NUMBER
- **Unknown Headers:** Durch-laufzeit, Stück, Zeitplan

**Issues:**
- Category not detected (score: 0)
- Low column coverage (40%)

**Recommendations:**
- Add category signature patterns to sheetSniffer.ts
- Add patterns for: Durch-laufzeit, Stück, Zeitplan

**Sample Values:**
- `Column_0`: M1A14118, VO.N, FÖ.N
- `Frei zur Fertigung
{ONLY NEW}`: P1MO MERIVA , Vorrichtung , Förderer 
- `Durch-laufzeit`: 9 Wo
- `Column_4`: KW, von, 19...
- `Column_5`: KW, bis, 24...
- `Column_6`: Ø /, Wo
- `Column_7`: P1MO MERIVA , P1MO MERIVA 
- `Column_8`: Jan-15, 1, P1MO MERIVA 
- `Column_9`: 2
- `Column_10`: 3
- `Column_11`: 4
- `Column_12`: Feb-15, 5
- `Column_13`: 6
- `Column_14`: 7
- `Column_15`: 8
- `Column_16`: Mar-15, 9
- `Column_17`: 10
- `Column_18`: 11
- `Column_19`: 12

---

## Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx

**Path:** `C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx`
**Size:** 91.00 KB

### Overall Assessment

- **Category Detected:** ✅ Yes
- **Primary Category:** ROBOT_SPECS
- **Schema Coverage:** 35%

**⚠️ Potential Issues:**
- Low schema coverage (35%) - many columns unrecognized
- [Index] Category not detected (score: 0)
- [Index] Low column coverage (0%)
- [Fanuc order code list] Low column coverage (40%)

**💡 Recommendations:**
- Review unknown columns and add patterns to columnRoleDetector
- Add patterns for unknown headers to improve detection
- [Index] Add category signature patterns to sheetSniffer.ts
- [Index] Add patterns for: Index, Date, by, remark
- [Fanuc order code list] Add patterns for: Code, Code, Function Package w/ DP J3-J6 (order code), Code, Price
- [STLA-S] Add patterns for: Options

### Sheets (3)

#### Index

- **Category:** UNKNOWN (score: 0)
- **Header Row:** Row 3
- **Data Rows:** 26
- **Column Coverage:** 0% (0/4 detected)
- **Detected Roles:** UNKNOWN
- **Unknown Headers:** Index, Date, by, remark

**Issues:**
- Category not detected (score: 0)
- Low column coverage (0%)

**Recommendations:**
- Add category signature patterns to sheetSniffer.ts
- Add patterns for: Index, Date, by, remark

**Sample Values:**
- `Index`: 0, 1, 2...
- `Date`: 10/23/25, 11/19/25, 11/24/25...
- `by`: wsamhab, ws, ws...
- `remark`: initial, DD030_R01 Robot type changed from R2000iB 165F to R2000iB 210F, AA120_R01 Bosch 7000 changed to 6000 - leaky weldspots moved to UB ...

#### Fanuc order code list

- **Category:** ROBOT_SPECS (score: 5)
- **Header Row:** Row 1
- **Data Rows:** 70
- **Column Coverage:** 40% (4/10 detected)
- **Detected Roles:** UNKNOWN, OEM_MODEL, ROBOT_ID
- **Unknown Headers:** Code, Code, Function Package w/ DP J3-J6 (order code), Code, Price, Price

**Issues:**
- Low column coverage (40%)

**Recommendations:**
- Add patterns for: Code, Code, Function Package w/ DP J3-J6 (order code), Code, Price

**Sample Values:**
- `Column_0`: W
- `Code`: 1, 2, 3...
- `FANUC order code`: Carried servo trans gun (A2*-SE2) for adaptive welding, Carried servo trans gun (A2*-SE2) for adaptive welding, Carried servo trans gun (A2*-SE2) for adaptive welding...
- `Function Package w/ DP J3-J6 (order code)`: G3+-WCS1AW3-80-A2SE2CAS, G3+-WCS1AW3-165-A2SE2CAS, G3+-WCS1AW3-185-A2SE2CAS...
- `Options to be ordered only together with the robot`: R-2000iB 20m RCC cables (upgrade from 14m), M900iA 20m RCC cables (upgrade from 14m), R-2000iB 30m RCC cables (upgrade from 14m)...
- `Column_13`: Yes, No
- `Price`: € 306, ¥70.900, 763 €
- `Column_16`: Yes, No

#### STLA-S

- **Category:** ROBOT_SPECS (score: 20)
- **Header Row:** Row 4
- **Data Rows:** 176
- **Column Coverage:** 67% (2/3 detected)
- **Detected Roles:** UNKNOWN, ROBOT_ID
- **Unknown Headers:** Options

**Recommendations:**
- Add patterns for: Options

**Sample Values:**
- `Column_0`: Index, Front Rail LH, Front Rail LH
- `Column_1`: aktualisiert am:, Position, 1...
- `Column_2`: Assembly line, AL_B09, AL_B09
- `Column_3`: Station Number, 010, 020
- `Robots Total`: 166, 25.11.2025sam, Robot caption...
- `Column_5`: Robotnumber
(E-Number), C/E-87822 
R/E-48841, E-78456
- `Column_6`: Tools, HW+W, HWW
- `Column_7`: Code, 82, 51
- `Column_8`: Robot w/ J1-J3 Dress Pack
(order code), G3+ R210F-A2CPSE2H1CAS, G3+ R185L-A1H1PS2
- `Column_9`: Code, 82, 51
- `Column_10`: Robot w/ J3-J6 Dress Pack
(order code), G3+-WCS4AW4-210-A2CPSE2H1CAS, G3+-WCS4AW4-185-A1H1PS2
- `Robots & 7th axis`: 4, V19
- `Column_12`: 21, G3-165F-A
- `Column_13`: 23, G3-185L-A, 1
- `Column_14`: 85, G3-210F-A, 1
- `Column_15`: 29, G3-260L-A
- `Column_16`: 1, G3-400L-A
- `Column_17`: 1, G3-250F-A
- `Column_18`: 0, Payload OK
- `Column_19`: 166, LT-Baustelle, 4...

---

## Zangenpool_TMS_Rev01_Quantity_Force_Info.xls

**Path:** `C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\Zangenpool_TMS_Rev01_Quantity_Force_Info.xls`
**Size:** 340.50 KB

### Overall Assessment

- **Category Detected:** ✅ Yes
- **Primary Category:** GUN_FORCE
- **Schema Coverage:** 100%

### Sheets (2)

#### Zaragoza

- **Category:** GUN_FORCE (score: 15)
- **Header Row:** Row 1
- **Data Rows:** 74
- **Column Coverage:** 100% (5/5 detected)
- **Detected Roles:** QUANTITY, RESERVE, LINE_CODE, GUN_NUMBER, GUN_FORCE

**Sample Values:**
- `Quantity`: 5, 3, 4...
- `Reserve`: 3, 1
- `Old Line`: P1Mx AUT-TECH, P1Mx AUT-TECH, P1Mx AUT-TECH...
- `Gun Number`: KAA32400S, KAA32412S, KAA32422S...
- `Gun Force
[N]`: 3600, 3600, 4400...

#### Zaragoza Allocation

- **Category:** GUN_FORCE (score: 18)
- **Header Row:** Row 1
- **Data Rows:** 161
- **Column Coverage:** 100% (9/9 detected)
- **Detected Roles:** QUANTITY, RESERVE, LINE_CODE, GUN_NUMBER, GUN_FORCE, AREA, ROBOT_ID

**Sample Values:**
- `Quantity`: 5
- `Old Line`: P1Mx AUT-TECH, P1Mx AUT-TECH, P1Mx AUT-TECH...
- `Gun Number`: KAA32400S, KAA32400S, KAA32400S...
- `Gun Force
[N]`: 3600, 3600, 3600...
- `Area`: Front Floor Assy 2
- `Robot Number`: DD110_R01
- `Required Force`: 3400

---

## Summary

- **Files Analyzed:** 8
- **Categories Detected:** 8/8 (100%)
- **Average Schema Coverage:** 64%

