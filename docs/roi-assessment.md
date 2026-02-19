# SimPilot ROI Assessment

**Application:** SimPilot – Simulation Control Tower
**Domain:** Automotive Body-in-White (BIW) Manufacturing Simulation
**Current State:** Excel-based workflows across shared workbooks (Robot Lists, Tool Lists, Simulation Status, Assemblies)
**Future State:** SimPilot as single source of truth, with API-fed data ingestion

---

## Executive Summary

SimPilot replaces a fragmented, Excel-heavy workflow with a real-time simulation management platform. Across three user roles — Simulation Engineer, Engineering Manager, and Project Manager — the manual process consumes an estimated **35–45 hours per week** in aggregate across a typical team. SimPilot reduces this to approximately **7–10 hours per week**, delivering an estimated **75–80% reduction in administrative simulation overhead**.

---

## Role 1: Simulation Engineer (Simulator)

### Who they are
Engineers running robot programming and process simulation in Tecnomatix Process Simulate. They are responsible for progressing stations through the simulation lifecycle: Concept → Rough Programming → Fine Programming → Validation → Documentation.

---

### Manual Workflow (Excel)

| Task | Manual Process | Time / Week (est.) |
|---|---|---|
| **Status updates** | Open shared workbook, find their rows by scanning columns, update percentage complete, save, pray nobody else has it open | 30–45 min |
| **Checklist tracking** | PRE_SIM / FULL_SIM / OLP_MRS items tracked in separate sheet or on paper, manually ticked off | 30–45 min |
| **Finding assignments** | Search across multiple tabs (by area, zone, station number) to identify what is assigned to them | 20–30 min |
| **Responding to status requests** | Manager/PM asks "what is the status of station 030 in Front Floor ASS 1?" — engineer must open Excel, search, reply via email/Teams | 2–3 hours |
| **Identifying blocked stations** | Manually scroll the sheet and cross-reference tooling lists to understand whether a design dependency is unmet | 1–1.5 hours |
| **Change documentation** | Write changes in a comment, an email, or a separate change log sheet. No audit trail. | 30 min |
| **Coordination with other engineers** | Phone / Teams to check who is working on adjacent stations, avoid duplication | 30 min |
| **TOTAL** | | **5.5–7.5 hours/week/engineer** |

### SimPilot Workflow

| Task | With SimPilot | Time / Week (est.) |
|---|---|---|
| **Status updates** | Navigate to Cell Detail page, update checklist items and completion percentage in-app | 10–15 min |
| **Checklist tracking** | PRE_SIM / FULL_SIM / OLP_MRS checklists built into Cell Detail, with progress indicators | Included above |
| **Finding assignments** | Engineer Page shows their workload and assigned stations at a glance | 2–3 min |
| **Responding to status requests** | Manager/PM sees the dashboard themselves — requests eliminated or answered by sharing a link | Near zero |
| **Identifying blocked stations** | Tooling Bottlenecks page flags design → simulation → manufacturing blockers automatically | 5 min |
| **Change documentation** | Change Log built into Cell Detail with timestamps and engineer attribution | 5 min |
| **Coordination** | Dashboard shows which engineer owns adjacent stations | 2 min |
| **TOTAL** | | **~25–30 min/week/engineer** |

### Time Saved per Engineer
**~5–7 hours/week** — at 5 engineers, that is **25–35 hours/week** returned to billable simulation work.

---

## Role 2: Engineering Manager (Charles & Dino)

### Who they are
Senior engineers who own the simulation department's delivery commitments across all projects (BMW, Ford, STLA-S). They track progress, manage engineer workloads, own risk escalation, and report status to project leadership.

---

### Manual Workflow (Excel)

| Task | Manual Process | Time / Week (est.) |
|---|---|---|
| **Consolidating status** | Open each engineer's version of the workbook (or a shared one with merge conflicts), scan rows, summarise into a separate reporting doc | 3–4 hours |
| **Identifying at-risk stations** | Manually scan percentage complete columns, apply mental thresholds (e.g., <80%), cross-reference deadlines — no automated flagging | 1.5–2 hours |
| **Engineer workload review** | Count assigned stations per engineer from the sheet, check recent changes — entirely manual | 1 hour |
| **Version management** | "Who has the latest file?" — emailing, file naming (v1, v2, _FINAL, _FINAL2), reconciling conflicting saves | 1–2 hours |
| **Leadership status report** | Extract data from workbook, paste into PowerPoint or Word, format manually | 2–3 hours |
| **Ad-hoc data requests** | "How many stations are in validation?" "What is the completion rate for FRONT UNIT?" — answered by querying the sheet manually | 1–2 hours |
| **Tooling/equipment gap identification** | Cross-reference robot list against tool list against simulation status — across 3 separate files | 1.5–2 hours |
| **TOTAL** | | **11–16 hours/week/manager × 2 = 22–32 hours** |

### SimPilot Workflow

| Task | With SimPilot | Time / Week (est.) |
|---|---|---|
| **Consolidating status** | Dashboard aggregates all projects, areas, and cells in real time — no consolidation needed | 0 |
| **Identifying at-risk stations** | Dashboard flags Critical / At-Risk / Healthy automatically. SimulationTodayPanel shows stations needing attention today | 10–15 min |
| **Engineer workload review** | Engineers Page shows assignments and at-risk counts per engineer | 5 min |
| **Version management** | Import History tracks every import run with diffs (added/modified/removed). Snapshot comparison available | 5–10 min |
| **Leadership status report** | Dashboard data available on-demand; future: exportable reports | 20–30 min |
| **Ad-hoc data requests** | Self-service — managers/PMs can query the dashboard themselves | Near zero |
| **Tooling/equipment gap identification** | Tooling Bottlenecks page + Data Health page surfaces gaps automatically | 10 min |
| **TOTAL** | | **~50–70 min/week/manager × 2 = ~2–2.5 hours** |

### Time Saved per Manager
**~10–15 hours/week each** — at 2 managers, **20–30 hours/week** returned to engineering leadership.

---

## Role 3: Project Manager

### Who they are
Responsible for delivery schedule, equipment sourcing decisions (NEW_BUY / REUSE / MAKE), tooling design milestones, and reporting to the OEM customer (BMW, Ford, etc.). They coordinate across simulation, design, and manufacturing.

---

### Manual Workflow (Excel)

| Task | Manual Process | Time / Week (est.) |
|---|---|---|
| **Equipment sourcing tracking** | Cross-reference robot list and tool list to determine sourcing status (NEW_BUY / REUSE / MAKE) — cells scattered across tabs | 2–3 hours |
| **Tooling design bottleneck review** | Manually check which tools are not yet designed against simulation milestones — cross-file lookup | 2–3 hours |
| **Milestone / schedule tracking** | No milestone column in Excel by default; PM maintains separate Gantt or uses generic project tool disconnected from simulation data | 2–3 hours |
| **Readiness assessments** | Ask the manager to compile a readiness summary — creates a request cycle (PM → manager → engineer → back) | 2–3 hours |
| **Supplier / vendor tracking** | Tracked in separate spreadsheet or email threads — not linked to asset data | 1–2 hours |
| **Cross-project visibility** | If managing BMW and Ford concurrently, must open separate files and mentally consolidate | 1–2 hours |
| **TOTAL** | | **10–16 hours/week** |

### SimPilot Workflow

| Task | With SimPilot | Time / Week (est.) |
|---|---|---|
| **Equipment sourcing tracking** | Assets page shows all equipment with sourcing status (NEW_BUY / REUSE / MAKE / UNKNOWN), filterable | 10 min |
| **Tooling design bottleneck review** | Tooling Bottlenecks page automates cross-stage analysis | 10 min |
| **Milestone / schedule tracking** | Timeline view (Gantt-style) per project; Robot Simulation page shows stage completion percentages | 15–20 min |
| **Readiness assessments** | Readiness Board page — no request cycle needed | 5–10 min |
| **Supplier / vendor tracking** | Asset metadata captures supplier info linked to equipment records | 5–10 min |
| **Cross-project visibility** | Projects page shows all active projects; areas and completion metrics visible simultaneously | 5 min |
| **TOTAL** | | **~50–60 min/week** |

### Time Saved per Project Manager
**~9–15 hours/week** returned to schedule and customer management.

---

## Aggregate Time Savings (Current Value)

| Role | Count | Manual hrs/wk | SimPilot hrs/wk | Saved hrs/wk |
|---|---|---|---|---|
| Simulation Engineer | 5 | 37.5 | 2.5 | **35** |
| Engineering Manager | 2 | 27 | 2.25 | **24.75** |
| Project Manager | 1 | 13 | 0.9 | **12.1** |
| **Total** | **8** | **77.5** | **5.65** | **~72 hrs/wk** |

> **Assumptions:** Midpoint estimates used. Engineer count estimated at 5; adjust for your team size.

### Annualised Value

| Metric | Value |
|---|---|
| Hours saved per week | ~72 |
| Hours saved per year (48 working weeks) | ~3,456 |
| Estimated hourly cost (fully loaded, £75/hr avg) | **£259,200 / year** |
| At £100/hr avg | **£345,600 / year** |

> Fill in your actual fully-loaded hourly rates per role to get a precise figure.

---

## Error & Rework Costs (Hidden Value)

Excel-based workflows introduce systematic errors that SimPilot eliminates:

| Risk | Manual Impact | SimPilot Mitigation |
|---|---|---|
| **Stale data decisions** | Manager acts on last week's Excel snapshot, misses a newly blocked station | Real-time data; import diff highlights changes |
| **File version conflicts** | Two engineers update the same file; one save overwrites the other | Single import run with audit history |
| **Missed equipment reuse** | REUSE candidate overlooked because lists are not cross-referenced | Registry + reuse allocation tracking with ambiguity resolution |
| **Incorrect sourcing decisions** | NEW_BUY ordered when a REUSE asset existed — cost: £5k–£100k+ per item | Sourcing status visible per asset; reuse match flagged |
| **Station milestone errors** | Wrong percentage entered in wrong row; undetected until review meeting | Cell-level edit with change log and audit trail |
| **Bottleneck-driven programme slippage** | Design delay not flagged until simulation milestone missed | Tooling Bottlenecks page flags design → simulation dependency gaps proactively |

A **single avoided incorrect sourcing decision** (e.g., ordering a NEW_BUY weld gun at £20k–£80k when a REUSE exists) likely exceeds the implementation cost of SimPilot.

---

## Future Value (Growth & API Integration)

### Near-Term Opportunities

| Opportunity | Description | Value |
|---|---|---|
| **API data ingestion** | Replace Excel upload with live API feeds from CAD (Teamcenter), ERP (SAP), or MES systems | Eliminates import cycle entirely; always-current data |
| **Automated notifications** | Alert engineers when their stations transition to at-risk; alert PM when tooling bottleneck detected | Proactive vs reactive management |
| **Customer-facing reporting** | OEM dashboards (BMW, Ford, STLA-S) pulled directly from SimPilot | Reduces report preparation from hours to minutes |
| **Multi-project scaling** | Adding project 4, 5, 6 costs near-zero additional admin in SimPilot | Linear team growth without linear overhead growth |

### API Integration Pathway

```
Current:     Excel files → Manual upload → SimPilot (session data)

Phase 2:     SharePoint/OneDrive (M365) → Automatic scheduled sync → SimPilot

Phase 3:     Teamcenter / SAP / MES → REST API → SimPilot (live, always current)
             ↓
             Webhook alerts → Teams/email notifications
             ↓
             OEM reporting dashboards (read-only customer view)
```

The architecture already supports SimBridge as an external system integration point. The data ingestion layer (ExcelIngestionOrchestrator) is separated from the UI, meaning it can be adapted to accept API responses in the same structure as Excel-parsed data.

### Scalability Value

| Scenario | Manual Model Cost | SimPilot Cost |
|---|---|---|
| Add 1 new project | +3–5 hrs/wk per manager for consolidation | +0 hrs (another project card on dashboard) |
| Add 3 new engineers | +3 hrs/wk coordination overhead | +30 min onboarding; they self-serve |
| Concurrent BMW + Ford + STLA-S + new OEM | Near-impossible to manage in one workbook | Single dashboard, per-project drill-down |
| 12-month retrospective | Manually reconstruct from email threads | Version history + audit trail + import history |

---

## Summary: Value Case

| Category | Current Pain | SimPilot Value |
|---|---|---|
| **Engineer time** | 5–7 hrs/wk per engineer lost to admin | Returned to billable simulation work |
| **Manager time** | 11–16 hrs/wk per manager lost to consolidation | Returned to engineering leadership |
| **PM time** | 10–16 hrs/wk lost to cross-file lookups | Returned to customer and schedule management |
| **Data quality** | Version conflicts, stale snapshots, manual errors | Import audit, diff tracking, change log, audit trail |
| **Sourcing risk** | Missed REUSE opportunities, incorrect NEW_BUY | Equipment registry, reuse matching, sourcing status per asset |
| **Bottleneck visibility** | Discovered late, at review meetings | Proactive — flagged as soon as design lag detected |
| **Scaling** | Each new project adds proportional overhead | Overhead stays flat; data and dashboards scale automatically |
| **Future API** | Locked into Excel distribution model | Architecture ready for live API feeds (Teamcenter, SAP, MES) |

---

*Document generated: February 2026*
*Adjust headcount, hourly rates, and project counts to match your actual team for a precise ROI figure.*
