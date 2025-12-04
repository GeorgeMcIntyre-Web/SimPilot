# Document Relationships & Data Flow

## Question: Can I connect each document and understand it?

### Document Connection Map

```
┌─────────────────────────────────────────────────────────────────┐
│                      TOOL LIST (Master)                          │
│  - 439 tools with IDs, Areas, Stations                          │
│  - Employee assignments (488 people)                             │
│  - Due dates, suppliers, applications                            │
└────┬─────────────────────────────────────┬──────────────────────┘
     │                                      │
     │ Links via:                           │ Links via:
     │ - Station ID                         │ - Tool Number
     │ - Area Name                          │ - Station
     │ - Employee ID                        │
     │                                      │
     ▼                                      ▼
┌─────────────────────────────┐    ┌──────────────────────────────┐
│  SIMULATION STATUS (DES)    │    │  ASSEMBLIES LIST             │
│  - Progress per station     │    │  - Design progress tracking  │
│  - Robot simulations        │    │  - Links design → simulation │
│  - % complete metrics       │    │  - 1st stage → issued        │
└────┬────────────────────────┘    └──────────────────────────────┘
     │
     │ Same structure as ↓
     │
┌─────────────────────────────┐
│  SIMULATION STATUS (CSG)    │
│  - External supplier work   │
│  - Same metrics as DES      │
│  - Parallel tracking        │
└─────────────────────────────┘

┌─────────────────────────────────────────┐
│  ROBOT EQUIPMENT LIST                   │
│  - 166 robots total                     │
│  - Links via Station + Robot Number     │
│  - FANUC order codes                    │
│  - Connects to both DES & CSG status    │
└─────────────────────────────────────────┘
```

### Key Relationships I Can See

#### 1. **Tool List ↔ Simulation Status**
- **Link:** Station ID + Area + Robot ID
- **Example:** Tool List row with "FU 1" station → Simulation Status "Front Unit, FU 1"
- **Purpose:** Track which tools need simulation and who's assigned

#### 2. **Tool List ↔ Assemblies List**
- **Link:** Tool Number (e.g., "BN010 GJR 10")
- **Purpose:** Track design progress for each tool before simulation begins
- **Workflow:** Design must progress before simulation can complete

#### 3. **Robot Equipment List ↔ Simulation Status**
- **Link:** Assembly Line + Station Number + Robot Number
- **Example:** "AL_B09, 010, R01" appears in both
- **Purpose:** Verify robot specifications match simulation requirements

#### 4. **DES Status ↔ CSG Status** (Same Areas)
- **Link:** Area name (FRONT UNIT, REAR UNIT, UNDERBODY)
- **Purpose:** Two organizations working on SAME project in parallel
- **Critical:** Need to reconcile who owns which stations

### Data Flow Workflow

```
1. TOOL LIST CREATED
   ↓ Employee assigned, Station defined, Due dates set

2. ASSEMBLIES LIST TRACKING BEGINS
   ↓ Design: Not Started → 1st Stage → 2nd Stage → Detailing → Checking → Issued

3. ROBOT EQUIPMENT LIST SPECIFIED
   ↓ Robot models ordered (166 robots, FANUC codes)

4. SIMULATION WORK BEGINS (Parallel)
   ├─ DES Internal Team
   └─ CSG External Supplier

5. SIMULATION STATUS TRACKED
   ↓ Robot Sim → Joining → Gripper → Fixture → Safety → Layout → Documentation

6. PROJECT COMPLETE
```

### Gaps in My Understanding (Questions to Clarify)

1. **Station Ownership:**
   - Why do DES and CSG both have status for same areas?
   - Are they split by station, or is one primary and one backup?
   - Example: REAR UNIT has both DES (41% done) and CSG (13% done)

2. **Tool Number Mapping:**
   - Tool List uses codes like "8X-070R-8E1"
   - Assemblies List uses codes like "BN010 GJR 10"
   - Are these different naming schemes for same tools?

3. **Timeline Mismatch:**
   - Assemblies List shows 60-70% "Not Started" for FRONT/BOTTOM TRAY
   - But Simulation Status shows work in progress
   - Does simulation start before design is "Issued"?

4. **Robot Count:**
   - Robot List says 166 robots total
   - But simulation status sheets have 3,200+ rows each
   - Each robot has multiple tasks/applications?

### What I DO Understand

✅ **Master Data Source:** Tool List is the master - defines everything
✅ **Design Phase:** Assemblies List tracks design before simulation
✅ **Simulation Phase:** Status sheets track simulation work (internal + external)
✅ **Equipment Spec:** Robot List defines what hardware to order
✅ **Metrics Structure:** All status sheets use same % complete methodology
✅ **Areas:** Project split into FRONT UNIT, REAR UNIT, UNDERBODY, BOTTOM TRAY

### What I NEED to Understand Better

❓ **Station-to-Tool Mapping:** One station has multiple tools/robots?
❓ **DES vs CSG Responsibility Split:** How is work divided between them?
❓ **Design-Simulation Handoff:** When does design need to be done for simulation to start?
❓ **Status Sheet Row Count:** Why 3,200 rows for ~166 robots? (Multiple tasks per robot?)
❓ **Tool Number Schemes:** How do different ID formats map together?

---

## My Confidence Level

| Aspect | Confidence | Notes |
|--------|-----------|-------|
| Document structure | ✅ 95% | I understand all sheets and columns |
| Data relationships | ⚠️ 70% | I see the links but need clarification on splits |
| Workflow sequence | ✅ 85% | Design → Simulation → Delivery makes sense |
| Metrics meaning | ✅ 90% | % complete methodology is clear |
| Cross-document joins | ⚠️ 65% | Need to verify Station/Area/Robot ID matching |
| Business logic | ⚠️ 60% | Why DES AND CSG both do same areas? |

---

## To Fully Connect the Documents, I Need:

1. **Sample join query:** Show me how to find Tool "BN010 GJR 10" across all 3 systems
2. **Station ownership rules:** Which stations are DES vs CSG?
3. **Robot-to-task mapping:** Why 3,200+ rows for 166 robots?
4. **Design dependency rules:** Can simulation start before design is "Issued"?
