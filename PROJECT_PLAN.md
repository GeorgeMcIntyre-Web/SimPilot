# SimPilot Project Plan

> **Last Updated:** January 2026  
> **Project Owner:** George McIntyre  
> **Current Phase:** v0.3.x Stabilization

---

## Executive Summary

SimPilot is a browser-based simulation management dashboard for automotive BIW (Body-in-White) manufacturing. It ingests Excel workbooks from simulation teams and presents a unified view of project health, engineer workload, and equipment status.

**Primary User:** Dale (Simulation Manager) - Extremely busy, needs zero-config experience.

---

## Current Status

| Metric | Value |
|--------|-------|
| **Version** | v0.3 (Excel Bottlenecks) |
| **Test Pass Rate** | 98.9% (797/806) |
| **Bundle Size** | ~550 KB gzipped |
| **Deployment** | Cloudflare Pages |
| **Tech Stack** | React + TypeScript + Vite + Tailwind |

### What Works Today
- ✅ Local Excel file ingestion (drag & drop)
- ✅ Microsoft 365 file picker (optional)
- ✅ Demo data scenarios
- ✅ Dashboard with project health metrics
- ✅ Dale Console (manager's cockpit view)
- ✅ Workflow bottleneck detection
- ✅ Data quality warnings

### What Needs Work
- ⚠️ 9 skipped tests (React Router v7 ESM issue)
- ⚠️ Console.log cleanup needed
- ⚠️ TypeScript strict mode not fully enabled

---

## Active Work Items

### Sprint: January 2026 - Stabilization

| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Fix `AuthGate.test.tsx` test pollution | 🔴 Blocked | - | Multiple elements found in DOM |
| Fix React Router v7 test compatibility | 🟡 In Progress | - | Upstream ESM/CJS issue |
| Enable strict TypeScript checks | 🟡 In Progress | - | 10 violations remaining |
| Console.log cleanup | ⬜ Not Started | - | 86 occurrences → 0 |
| UI smoke test verification | ⬜ Not Started | - | 5 scenarios to verify |

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     SimPilot (Browser)                       │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (React + Tailwind)                                 │
│  ├── Pages: Dashboard, Dale Console, Projects, Tools, etc.  │
│  └── Components: Cards, Tables, Filters, Charts             │
├─────────────────────────────────────────────────────────────┤
│  Domain Layer (Pure TypeScript)                              │
│  ├── coreStore.ts - Reactive in-memory state                │
│  ├── crossRef/ - Entity linking engine                       │
│  └── workflow/ - Bottleneck computation                      │
├─────────────────────────────────────────────────────────────┤
│  Ingestion Layer                                             │
│  ├── Excel Universal Engine (schema-agnostic)               │
│  ├── Parsers: simulationStatus, robotList, toolList         │
│  └── Demo Data: pre-parsed STLA scenarios                   │
├─────────────────────────────────────────────────────────────┤
│  Integrations                                                │
│  ├── Microsoft 365 (MSAL + Graph API) - Optional            │
│  └── SimBridge (PS Gateway) - Future                        │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Load** → User uploads Excel or selects from M365
2. **Parse** → Universal engine profiles and extracts data
3. **Store** → `coreStore` holds reactive in-memory state
4. **Link** → CrossRefEngine connects simulations to equipment
5. **Compute** → Workflow engine calculates bottlenecks
6. **Display** → React components render dashboards

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend | React + TypeScript | Team expertise, type safety |
| Styling | Tailwind CSS | Rapid UI development |
| Build | Vite | Fast dev server, modern tooling |
| Testing | Vitest | Vite-native, fast execution |
| Hosting | Cloudflare Pages | Free tier, global CDN |
| State | Custom store (Zustand-like) | Simpler than Redux for this scale |
| Auth | Optional MS365 | Most users are on Microsoft |

---

## Key Metrics to Track

### Product Metrics
- **Active Users:** Weekly unique users
- **Session Duration:** Time spent per visit
- **Feature Adoption:** % using bottleneck view
- **Data Quality:** % of sheets mapped successfully

### Technical Metrics
- **Test Pass Rate:** Target 100%
- **Bundle Size:** Target < 600 KB gzipped
- **Lighthouse Score:** Target > 90
- **Time to First Load:** Target < 2 seconds

---

## Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| React Router v7 ESM issues | Low | Tests skipped, runtime works |
| Large Excel files (>10MB) | Medium | Streaming parser designed |
| Browser memory limits | Medium | Pagination, lazy loading |
| M365 auth token expiry | Low | Graceful re-auth prompt |
| Data schema changes | Medium | Universal engine adapts |

---

## Communication Plan

| Stakeholder | Channel | Frequency |
|-------------|---------|-----------|
| Dale (Primary User) | Teams / In-person | Weekly |
| Development | GitHub Issues/PR | Daily |
| Leadership | Status Report | Bi-weekly |

---

## Documentation Index

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | Quick start guide |
| [ROADMAP.md](ROADMAP.md) | Product vision and timeline |
| [ImplementationPlan.md](ImplementationPlan.md) | Technical implementation details |
| [SIMPILOT_v0.3_MASTER_OVERVIEW.md](SIMPILOT_v0.3_MASTER_OVERVIEW.md) | v0.3 feature reference |
| [TECH_DEBT.md](TECH_DEBT.md) | Technical debt tracker |
| [KNOWN_DEBT.md](KNOWN_DEBT.md) | Test failures and workarounds |
| [DEPLOYMENT.md](DEPLOYMENT.md) | How to deploy |
| `/docs/*` | Detailed technical docs |

---

## Appendix: Phase History

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | MVP Scaffold (domain types, store, UI skeleton) | ✅ Complete |
| 2 | Excel Ingestion (STLA Status & Equipment parsing) | ✅ Complete |
| 3 | Logic & Metrics (workload, aggregation) | ✅ Complete |
| 4 | Architecture Hardening (demo data, MS prep) | ✅ Complete |
| 5 | Microsoft Integration (MSAL, Graph API) | ✅ Complete |
| 6 | Dale Console (Manager's Cockpit) | ✅ Complete |
| 7 | E2E Testing (Playwright) | ✅ Complete |
| 8 | Deployment (CI/CD, Cloudflare) | ✅ Complete |
| 9 | Persistence (IndexedDB) | 🔄 Partial |
| 10 | Write-Back (Engineer assignment editing) | ✅ Complete |
| 12 | SimBridge Integration | 🔄 Partial |
| 15-17 | UI Polish (Flower Theme, First Run) | ✅ Complete |

---

## Quick Commands

```bash
# Development
npm install      # Install dependencies
npm run dev      # Start dev server (localhost:5173)
npm run build    # Production build
npm test         # Run all tests
npm run lint     # Check code style

# Verification
npm run test -- --coverage   # Test with coverage
npm run preview              # Preview production build
```
