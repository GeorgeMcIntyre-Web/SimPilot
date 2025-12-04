# SimPilot Document Analysis Summary

**Generated:** December 4, 2025

## Overview

This document provides a comprehensive analysis of all Excel documents used in the SimPilot application for the STLA-S project at Stellantis TMS Zaragoza plant.

---

## 1. Tool List (Manufactured In-House)

**File:** `STLA_S_ZAR Tool List.xlsx`

### Purpose
Master list of all manufacturing tools and equipment being designed and manufactured in-house by the Design Engineering Services (DES) group.

### Key Sheets

#### ToolList (Main Data)
- **Size:** 439 rows × 83 columns
- **Content:** Complete tool inventory with simulation assignments
- **Key Columns:**
  - ID, SUB Area Name, Station
  - Sim. Leader, Sim. Employee
  - Sim. Due Date, MRS OLP Due Date
  - Tool numbers and classifications
  - Design status and progress tracking

#### EmployeeList
- **Size:** 488 employees
- Contains ID and employee names for assignment tracking

#### SupplierList
- **Size:** 876 suppliers
- Supplier database for external procurement

#### Reference Sheets
- **AreaList:** Project area definitions
- **StationList:** Station configurations
- **BranchList:** 26 DES branch locations worldwide
- **SimulationApplicationList:** 51 simulation application types (MH, SW, AS, PB, etc.)
- **SimulationMethodList:** Robot mounting methods (Pedestal, Track, etc.)
- **SimulationSpecialFunctionList:** Special functions (Vision, Geo End Effector)

---

## 2. Simulation Status Documents (DES Internal)

### 2a. REAR UNIT - DES Status

**File:** `STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx`

#### SIMULATION Sheet
- **Size:** 3,224 rows × 69 columns
- Detailed robot simulation progress tracking
- **Key Metrics:**
  - Robot Position - Stage 1: Completion tracking
  - DCS Configuration
  - Dress Pack & Frying Pan Configuration
  - Robot Flange PCD + Adapters
  - Spot weld distribution and gun selection

#### DOCUMENTATION Sheet
- **Size:** 1,535 rows × 99 columns
- Documentation deliverables tracking
- Spot lists, DCS documentation, installation docs, weld files

#### DATA Sheet (Summary Metrics)
- **Robot Simulation:** 67% complete, 33% outstanding
- **Joining:** 74% complete
- **Gripper:** 21% complete
- **Fixture:** 52% complete
- **Safety:** 0% complete
- **Layout:** 34% complete
- **Documentation:** 21% complete
- **1st Stage Completion:** 41.3%
- **Final Deliverables:** 31.2%

### 2b. UNDERBODY - DES Status

**File:** `STLA-S_UNDERBODY_Simulation_Status_DES.xlsx`

#### SIMULATION Sheet
- **Size:** 3,242 rows × 69 columns
- Same structure as REAR UNIT

#### DATA Sheet (Summary Metrics)
- **Robot Simulation:** 49% complete, 51% outstanding
- **Joining:** 42% complete
- **Gripper:** 19% complete
- **Fixture:** 37% complete
- **Safety:** 0% complete
- **Layout:** 41% complete
- **Documentation:** 20% complete
- **1st Stage Completion:** 31.3%
- **Final Deliverables:** 25.7%

**Status:** Behind REAR UNIT in overall progress

---

## 3. Robot Equipment List

**File:** `Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx`

### Purpose
Complete specification of all robots to be ordered for the STLA-S project.

### Key Sheets

#### STLA-S (Main Sheet)
- **Size:** 205 rows × 90 columns
- **Total Robots:** 166 units (noted in row 5)
- **Plant:** Zaragoza
- **Last Updated:** November 25, 2025

#### Key Columns
- Index, Position, Assembly line
- Station Number, Robot caption
- Robot number (E-Number for electrical, R-Number for robot)
- Tools (application codes: HW, W, H+W, etc.)
- FANUC order codes (e.g., G3+ R210F-A2CPSE2H1C)

#### Fanuc Order Code List
- **Size:** 74 rows
- Complete FANUC robot model specifications
- Order codes for different robot types (R80, R165F, R185L, R210F, R250F, M260L, M350)
- Pricing and configuration options

#### Index Sheet
- **Size:** 37 change records
- Change tracking with dates, author, and remarks

---

## 4. Assemblies List Documents (Design Progress Tracking)

Status document between design department and simulation department for tool design progress.

### 4a. BOTTOM TRAY

**File:** `J11006_TMS_STLA_S_BOTTOM_TRAY_Assemblies_List.xlsm`

#### A_List (Main Sheet)
- **Size:** 203 rows × 38 columns
- **Job Number:** J11006
- **Customer:** STELLANTIS - TMS
- **Area:** BOTTOM TRAY

#### Progress_Report
- **Overall Progress:** 70% Not Started, 0% in other stages
- Tracks: 1st Stage, 2nd Stage, Detailing, Checking, Issued

#### ApprovedBoughtOuts
- **Size:** 292 approved components
- ItemCode, SecondaryCode, ItemDescription, Manufacturer

### 4b. FRONT UNIT

**File:** `J11006_TMS_STLA_S_FRONT_UNIT_Assemblies_List.xlsm`

#### A_List
- **Size:** 807 rows × 38 columns (largest assemblies list)
- **Overall Progress:** 60% Not Started

### 4c. REAR UNIT

**File:** `J11006_TMS_STLA_S_REAR_UNIT_Assemblies_List.xlsm`

#### A_List
- **Size:** 1,016 rows × 38 columns (most complex area)
- **Overall Progress:** 43% Not Started, 15% 1st Stage, 16% Detailing, 8% Checking, 18% Issued
- **Most advanced** among all areas

### 4d. UNDERBODY

**File:** `J11006_TMS_STLA_S_UNDERBODY_Assemblies_List.xlsm`

#### A_List
- **Size:** 768 rows × 38 columns

#### Common Sheets (All Assemblies Lists)
- **Q_List:** Quote list template
- **Legend:** Progress status definitions
- **MACRO:** Email recipients, external links, approved subcontractors
- **CheckingLog:** Quality checking records

---

## 5. CSG External Simulation Status Documents

CSG is an external supplier handling simulation work for portions of the project.

### 5a. FRONT UNIT - CSG Status

**File:** `STLA-S_FRONT_UNIT_Simulation_Status_CSG.xlsx`

#### SIMULATION Sheet
- **Size:** 3,258 rows × 69 columns

#### DATA Sheet (Summary Metrics)
- **Robot Simulation:** 48% complete, 52% outstanding
- **Joining:** 43% complete
- **Gripper:** 11% complete
- **Fixture:** 23% complete
- **Safety:** 0% complete
- **Layout:** 25% complete
- **Documentation:** 18% complete
- **1st Stage Completion:** 25.0%
- **Final Deliverables:** 21.5%

**Status:** Lower completion than DES internal work

### 5b. REAR UNIT - CSG Status

**File:** `STLA-S_REAR_UNIT_Simulation_Status_CSG.xlsx`

#### DATA Sheet (Summary Metrics)
- **Robot Simulation:** 21% complete, 79% outstanding
- **Joining:** 39% complete
- **Gripper:** 0% complete
- **Fixture:** 11% complete
- **Safety:** 0% complete
- **Layout:** 7% complete
- **Documentation:** 12% complete
- **1st Stage Completion:** 13.0%
- **Final Deliverables:** 12.5%

**Status:** Significantly behind schedule

### 5c. UNDERBODY - CSG Status

**File:** `STLA-S_UNDERBODY_Simulation_Status_CSG.xlsx`

#### DATA Sheet (Summary Metrics)
- **Robot Simulation:** 33% complete, 67% outstanding
- **Joining:** 59% complete
- **Gripper:** 21% complete
- **Fixture:** 20% complete
- **Safety:** 0% complete
- **Layout:** 11% complete
- **Documentation:** 19% complete
- **1st Stage Completion:** 24.0%
- **Final Deliverables:** 21.5%

---

## Document Relationships

```
STLA-S Project
├── Tool List (Master Equipment Database)
│   ├── Links to: EmployeeList, SupplierList
│   └── Defines: Tools to be simulated
│
├── Robot Equipment List
│   └── Specifies: Robot models and configurations
│
├── Simulation Status (DES Internal)
│   ├── REAR UNIT (41% complete)
│   └── UNDERBODY (31% complete)
│
├── Simulation Status (CSG External)
│   ├── FRONT UNIT (25% complete)
│   ├── REAR UNIT (13% complete)
│   └── UNDERBODY (24% complete)
│
└── Assemblies List (Design Progress)
    ├── BOTTOM TRAY (70% not started)
    ├── FRONT UNIT (60% not started)
    ├── REAR UNIT (43% not started, 18% issued) ⭐ Most advanced
    └── UNDERBODY (768 tools)
```

---

## Key Insights

### Overall Project Status
1. **DES Internal simulation** is further ahead than CSG external simulation
2. **REAR UNIT** shows the most progress across all metrics
3. **Safety and Layout** work is 0% complete across all areas (critical gap)
4. **Design work** (Assemblies List) is behind simulation needs

### Critical Areas Requiring Attention
1. **Safety:** 0% completion across all areas
2. **Gripper design:** Very low completion (11-21%)
3. **CSG REAR UNIT:** Only 13% complete (major concern)
4. **Design deliverables:** 60-70% not started in FRONT/BOTTOM TRAY

### Data Quality Observations
- All documents follow consistent naming conventions
- Station numbering: Format like "010", "020", "030"
- Assembly line codes: BA, BC, BR, AL, CM, etc.
- Robot numbering: R01, R02, etc.
- Application codes: H (Handling), W (Welding), HW (Handling+Welding)

---

## Data Cleaning Complete

A browser-based data cleaning utility has been created at:
- `public/clear_all_data.html`

This tool clears:
- IndexedDB (SimPilotDB database)
- localStorage (all user preferences)
- sessionStorage (all session data)

**Usage:** Open the HTML file in a browser, click "Clear All Data", then reload the SimPilot application.

---

## Next Steps for SimPilot Application

1. **Ingest all documents** into the application
2. **Cross-reference** robot lists with simulation status
3. **Track completion metrics** over time
4. **Flag critical gaps** (Safety, Layout at 0%)
5. **Compare DES vs CSG progress** for the same areas
6. **Alert on design-simulation misalignment**
