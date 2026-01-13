# Real-World Data Workflows
## How Data is Created, Updated, and Used in Practice

**Date:** 2026-01-12
**Purpose:** Document actual user workflows based on field observations

---

## Critical Understanding: Data Origin and Purpose

### The Three Core Document Types (Ford V801 Example)

---

## 1. Tool List (V801 Tool List.xlsx)

### Real-World Purpose
**"This is the list of tools we need for the project."**

### Who Creates It
- **Created by:** Simulation team (manually)
- **Based on:** Simulation requirements and design needs
- **Updated by:** Project management and simulation leads

### Data Flow
```
Simulation Team identifies tools needed
         ↓
Tools added to V801 Tool List.xlsx (manually entered)
         ↓
Decision Point: Make internally OR send to external supplier?
         ├─→ Internal: Design team creates tool
         │   └─→ Progress tracked in Assemblies List
         │
         └─→ External: Send specs to supplier
             └─→ Track delivery status in Tool List
```

### Key Decision Points
- **Make vs Buy:** Some tools designed in-house, others outsourced
- **Supplier Selection:** Based on tool complexity, timeline, budget
- **Status Tracking:** Whether internal or external, track progress here

### Manual Process Indicators
- ✅ Data entered manually by simulators
- ⚠️  No automatic generation from CAD/simulation software
- ⚠️  Prone to human error (typos, duplicates, missing entries)
- ✅ Centralized list for entire project

---

## 2. Robot Equipment List (Ford_OHAP_V801N_Robot_Equipment_List.xlsx)

### Real-World Purpose
**"This is the robot order document that will get sent out to Ford (or robot supplier) to order robots."**

### Who Creates It
- **Created by:** Simulator assigned to each area
- **Based on:** Simulation results showing robot requirements
- **Sent to:**
  - Customer (Ford) if they order robots
  - Robot manufacturer (Kawasaki, ABB, Fanuc) if we order directly

### Data Flow
```
Simulator completes simulation for area (e.g., "7K")
         ↓
Determines robot requirements:
  - Payload needed for tools/parts
  - Reach required for cell layout
  - Application (spot weld, material handling, etc.)
         ↓
Fills out Robot Equipment List manually:
  - Station assignments
  - Robot model selection
  - Quantity per station
         ↓
Decision Point: New robots OR reuse existing?
         ├─→ New: Order from manufacturer
         │   - Fill out order document (this file)
         │   - Send to Ford or robot supplier
         │   - Track serial numbers when delivered
         │
         └─→ Reuse: Check existing inventory
             - Match payload/reach requirements
             - Assign existing serial numbers
             - Update assignment in list
         ↓
List sent out as purchase order / robot request
         ↓
Track delivery status and serial numbers as robots arrive
```

### Format Variations by Customer
- **Ford format:** Uses Ford's template (V801 example)
- **Robot manufacturer format:** Kawasaki/ABB/Fanuc have own templates
- **Key point:** Same data, different Excel layouts per recipient

### Critical Information Tracked
- **Station assignments:** Where each robot will be installed
- **Model requirements:** Payload, reach, application type
- **Serial numbers:** Tracked when robots delivered
- **Person responsible:** Simulator who specifies the robot
- **Order status:** Submitted, delivered, installed
- **Reuse tracking:** Which robots from previous projects being reused

### Reuse vs New Robot Decision Factors
```
Gun/Gripper Requirements:
  ├─→ Payload: Can existing robot handle tool weight?
  ├─→ Reach: Does robot reach all points in cell?
  └─→ Application: Compatible with spot weld/MH/sealer?
       ↓
  If YES to all → Reuse existing robot
  If NO to any → Order new robot with correct specs
```

---

## 3. Simulation Status Files (*_Simulation_Status.xlsx)

### Real-World Purpose
**"Document filled out by simulator to ensure all things are done and added to status list for all to see."**

### Who Creates and Updates It
- **Created by:** Simulator at project start
- **Updated by:** Simulator throughout project lifecycle
- **Reviewed by:** Project management, customer, team leads

### Data Flow
```
Project kickoff: Simulator creates status file
         ↓
Lists all robots/stations assigned to them
         ↓
Tracks progress through programming milestones:
  - Concept/Layout: Initial design (%)
  - Rough Programming: Basic robot paths (%)
  - Fine Programming: Optimized paths (%)
  - Validation: Testing and verification (%)
  - Documentation: Program documentation (%)
         ↓
Updated weekly (typical) or at milestones
         ↓
Used in meetings to show progress
         ↓
Visible to entire team for transparency
```

### Purpose: Transparency and Accountability
- **Visibility:** "For all to see" - team-wide progress tracking
- **Completeness:** "Ensure all things are done" - checklist function
- **Status tracking:** Weekly updates show progress over time
- **Management tool:** PM can see who's on track, who needs help

### Update Frequency
- **Typical:** Weekly updates by each simulator
- **Milestones:** Updated before phase gate reviews
- **On demand:** When PM requests status update
- **Final:** 100% completion when project delivered

---

## Workflow Summary: Project Lifecycle

### Phase 1: Project Setup
```
1. Simulation team assigned to areas
2. Initial simulation work begins
3. Robot requirements identified → Robot Equipment List created
4. Tool requirements identified → Tool List created
5. Status tracking file created → Simulation Status initialized
```

### Phase 2: Active Development
```
Weekly Cycle:
  Monday:
    - Simulators work on programming
    - Update Simulation Status with progress %

  Tuesday-Thursday:
    - Continue programming work
    - Identify additional tool needs → Update Tool List
    - Robot reuse decisions made → Update Robot Equipment List

  Friday:
    - Final status update for week
    - Import all files to SimPilot
    - Weekly team meeting reviews dashboard
```

### Phase 3: Procurement
```
Robot Equipment List finalized:
  - Sent to Ford (or robot supplier)
  - Order placed
  - Delivery tracking begins
  - Serial numbers added as robots arrive

Tool List finalized:
  - Internal tools → Design team starts work (Assemblies List tracking)
  - External tools → Purchase orders sent to suppliers
  - Delivery dates tracked
```

### Phase 4: Completion
```
All Simulation Status files reach 100%:
  - Final documentation complete
  - Programs validated and tested
  - Handoff to production team
  - Final snapshot saved in SimPilot
```

---

## Key Insights: Manual Processes

### What is NOT Automated
❌ **Robot requirements** - Simulator manually determines from simulation
❌ **Tool specifications** - Manually identified and entered
❌ **Status updates** - Manual percentage entry each week
❌ **Make/Buy decisions** - Human judgment call
❌ **Reuse decisions** - Manual check against inventory

### What COULD Be Automated (Future)
✅ **Station lists** - Extract from simulation software exports
✅ **Robot counts** - Auto-count robots per area from CAD
✅ **Status reminders** - Alert when status not updated in X days
✅ **Validation** - Check for missing robots, duplicate IDs
✅ **Version tracking** - Automatic snapshot on each import (✓ Already implemented!)

---

## Data Quality Implications

### Manual Entry Risks
1. **Typos in Station IDs**
   - "7K-100L-1N" vs "7K-100L-N1"
   - Solution: Data validation rules in Excel templates

2. **Duplicate Robots**
   - Same robot listed multiple times
   - Solution: Duplicate detection in SimPilot

3. **Orphaned References**
   - Tool List references robot that doesn't exist in Robot Equipment List
   - Solution: Cross-reference validation in import

4. **Inconsistent Updates**
   - Status file not updated for weeks
   - Solution: Last-updated-date tracking and alerts

5. **Version Conflicts**
   - Multiple people editing same file
   - Solution: Centralized import through SimPilot with version history

---

## Decision-Making Process

### Robot Specification Decision Tree
```
For each station needing robot:

  1. Application Type?
     ├─→ Spot Welding
     ├─→ Material Handling
     ├─→ Sealing
     └─→ Multi-application

  2. Payload Required?
     - Calculate tool weight + part weight + safety margin
     - Match to robot models: BXP210L, MXP410X, etc.

  3. Reach Required?
     - Measure from simulation cell layout
     - Add safety margin for cable routing

  4. Check Reuse Inventory:
     - Any robots available with matching specs?
     - YES → Assign existing robot (update serial #)
     - NO → Proceed to order new robot

  5. Add to Robot Equipment List:
     - Station assignment
     - Robot model selected
     - New order or reuse flag
     - Person responsible: [Simulator name]
```

### Tool Make/Buy Decision Tree
```
For each tool needed:

  1. Complexity Assessment:
     ├─→ Simple fixture → Internal design team
     ├─→ Complex gripper → External specialist
     └─→ Standard component → External supplier

  2. Timeline Constraint:
     ├─→ Urgent (<6 weeks) → External if complex
     └─→ Normal (>6 weeks) → Internal preferred

  3. Budget Consideration:
     ├─→ High budget → External acceptable
     └─→ Limited budget → Internal priority

  4. Expertise Required:
     ├─→ Standard weld gun → Internal
     └─→ Custom servo gripper → External

  5. Add to Tool List:
     - Tool specification
     - Make/Buy decision
     - If External: Supplier assignment
     - If Internal: Designer assignment
     - Due date based on project timeline
```

---

## Integration with SimPilot Dashboard

### User Pain Points (Pre-SimPilot)
- ❌ Excel files scattered across shared drives
- ❌ No version control - hard to see what changed
- ❌ Manual consolidation for management reports
- ❌ No cross-project visibility
- ❌ Difficult to spot issues (missing robots, lagging stations)

### SimPilot Solutions
- ✅ Centralized import and version tracking
- ✅ Visual dashboards (Readiness Board, Project view)
- ✅ Automatic progress calculations
- ✅ Issue detection (orphaned tools, incomplete status)
- ✅ Historical comparison (what changed since last week?)
- ✅ Cross-project analytics (which areas need help?)

### Dashboard Views Most Valuable
1. **Readiness Board** - Shows completion % for all stations
2. **Project Timeline** - Overall project health
3. **Engineer View** - See all work assigned to each simulator
4. **Tool Bottlenecks** - Which tools are holding up progress
5. **Version History** - Compare current vs previous imports

---

## Recommended Improvements to User Workflow

### Short Term (No Code Changes)
1. **Excel Templates**
   - Provide standardized templates with data validation
   - Include dropdown lists for robot models
   - Auto-format station IDs to standard pattern

2. **Import Guidelines**
   - Document how often to import (weekly minimum)
   - Best practices for updating status percentages
   - What to do when file structure changes

3. **User Training**
   - How to properly fill out each file type
   - Understanding the data relationships
   - Using SimPilot dashboard effectively

### Medium Term (Minor Enhancements)
1. **Import Validation**
   - Warn about duplicate robot IDs
   - Flag orphaned tool references
   - Highlight inconsistent station naming

2. **Auto-Alerts**
   - Email when status not updated in 7 days
   - Notify when new robots delivered (serial # added)
   - Alert PM when area falls behind schedule

3. **Export Functionality**
   - Export current status back to Excel
   - Generate reports from dashboard data
   - Create purchase order templates from Robot Equipment List

### Long Term (Significant Development)
1. **Simulation Software Integration**
   - Auto-extract station lists from Process Simulate
   - Import robot requirements from simulation exports
   - Reduce manual data entry

2. **Supplier Portal**
   - External suppliers update tool delivery status
   - Robot manufacturers confirm orders
   - Real-time status updates

3. **AI-Assisted Validation**
   - Suggest robot reuse candidates based on specs
   - Predict realistic completion dates
   - Auto-categorize tools (make vs buy)

---

## Document Status
**Status:** Draft - Validated with User
**Last Updated:** 2026-01-12
**Based on:** User feedback about Ford V801 workflow

**Key Takeaway:** All data is manually created by simulators based on their simulation work. No automatic generation from software tools. This explains the need for careful validation and version tracking in SimPilot.
