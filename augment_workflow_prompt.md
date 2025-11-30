# SimPilot Phase 3: Workflow Augmentation Mega Prompt

**Role:** Senior Integration Architect & Product Engineer.
**Goal:** Augment the current Simulation Department workflow (Dale's workflow) by bridging the gap between existing Excel/PowerPoint artifacts and the new SimPilot Web App.
**Philosophy:** **Augment, don't Replace.** The transition must be smooth. Users should be able to load their existing "Truth" (Excel docs) into SimPilot to visualize and manage it, without being forced to abandon their current tools immediately.

---

## 1. Project Status (Current State)

You are inheriting **SimPilot MVP**, a React + TypeScript + Vite application.
- **Repo Path:** `C:\Users\George\source\repos\SimPilot`
- **Tech:** React 18, Tailwind CSS, In-Memory Stores (Domain Pattern).
- **Features Live:**
  - Dashboard (Health, Risks, Workload).
  - Project/Cell Browser.
  - Checklists & Change Logs.
  - Equipment Library (UI scaffolding).
- **Data:** Currently uses `src/domain/mockData.ts`.

## 2. The Mission: "Smart Ingestion"

Your primary task is to build the **Data Ingestion Layer** that populates SimPilot from the real-world files located in:
`C:\Users\George\source\repos\SimPilot\user_data\d\OneDrive_1_2025-11-29`

You must create a system where users can "Drop" these files (or the app reads them if local) and the UI reflects this reality.

### Key Data Sources to Ingest:

#### A. Simulation Status (The "Big Part")
**Source:** `00_Simulation_Status/*.xlsx`
- **Files:** `STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx`, `STLA-S_UNDERBODY_Simulation_Status_DES.xlsx`
- **Action:**
  - Parse these sheets to populate **Projects**, **Areas**, and **Cells**.
  - Extract status columns (e.g., "% Complete", "Issues") to drive the **Dashboard**.
  - **Goal:** When Dale updates the Excel, SimPilot Dashboard updates automatically (or via "Refresh").

#### B. Equipment Lists
**Source:** `01_Equipment_List/*.xlsx` & `*.pptx`
- **Files:**
  - `Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx` -> Populates **Robots** store.
  - `GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx` -> Populates **Weld Guns** store.
  - `P1MX_Reuse Equipment...xlsm` -> Complex asset tracking.
- **Action:**
  - Map these rows to `Robot`, `WeldGun`, and `Stand` domain types.
  - Link them to Cells based on "Station" or "Area" columns found in the sheets.

#### C. Joining & Specs (Future Context)
- **Source:** `02_Joining`, `11_Weldguns`
- **Action:** Prepare the system to link specific Spot Welds (from Joining docs) to the Guns imported above.

---

## 3. Implementation Plan for You

### Step 1: File Reader Utility (The "Bridge")
Create a utility in `src/tools/` or `src/utils/` that can parse Excel files in the browser (using `xlsx` library).
- **Constraint:** Since this is a web app, you might need a "Drag & Drop" zone for the user to upload these specific files, OR a Node script if running locally to pre-seed `mockData`.
- **Recommendation:** Build a **"Data Loader" Page** in the app where Dale can drag in his `Simulation_Status.xlsx` and see the Dashboard light up with real data.

### Step 2: Domain Mapping
Map the Excel columns to our Types (`src/domain/types.ts`).
- *Example:* Excel "Station_ID" -> SimPilot `Cell.name`.
- *Example:* Excel "Robot_Type" -> SimPilot `Robot.oemModel`.

### Step 3: "Shadow Mode" UI
Update the UI to show **Source Lineage**.
- When displaying a Cell status, add a tooltip: *"Source: STLA-S_REAR_UNIT...xlsx Row 45"*.
- This builds trust. Dale knows the data comes from his trusted sheet.

---

## 4. Execution Rules

1.  **Do NOT break the existing MVP.** Add to it.
2.  **Read-Only First.** Treat Excel as the "Master" for now. SimPilot is the "Viewer/Controller". Editing in SimPilot comes later.
3.  **Handle Dirty Data.** Real Excel files have typos, merged cells, and missing IDs. Your parser must be robust (try/catch, fuzzy matching).
4.  **Tech Stack:** Use `xlsx` (SheetJS) for parsing. Keep logic in `src/utils/excelParsers.ts`.

## 5. Your First Task
**Create the "Data Loader" page.**
1.  `npm install xlsx`
2.  Create `src/routes/DataLoaderPage.tsx`.
3.  Implement a parser for `00_Simulation_Status` files.
4.  Update `projectsStore` to accept data from this parser instead of just `mockData`.

**Go.**
