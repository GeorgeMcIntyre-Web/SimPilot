import { Project, Area, Cell, Robot, Tool, SchedulePhase } from './core'

export type DemoScenarioId = 'STLA_SAMPLE' | 'TINY_SAMPLE' | 'BMW_ROI_DEMO'

export interface DemoScenarioSummary {
    id: DemoScenarioId
    label: string
    description: string
}

export const DEMO_SCENARIOS: DemoScenarioSummary[] = [
    {
        id: 'BMW_ROI_DEMO',
        label: 'BMW Body Shop – ROI Demo',
        description: 'Realistic BMW project showing at-risk stations, blocked engineers, and sourcing gaps. Use this for stakeholder demos.',
    },
    {
        id: 'STLA_SAMPLE',
        label: 'STLA Sample (Rear + Underbody)',
        description: 'Two projects with multiple areas, cells, robots and tools. Good for Dale demos.',
    },
    {
        id: 'TINY_SAMPLE',
        label: 'Tiny Sample',
        description: 'Minimal dataset with 1 project, 1 area, 2 cells and 1 engineer.',
    },
]

/**
 * Generate ISO date string from days offset from now
 */
function getDateOffset(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date.toISOString().split('T')[0]
}

export function getDemoScenarioData(id: DemoScenarioId): {
    projects: Project[]
    areas: Area[]
    cells: Cell[]
    robots: Robot[]
    tools: Tool[]
    warnings: string[]
} {
    const projects: Project[] = []
    const areas: Area[] = []
    const cells: Cell[] = []
    const robots: Robot[] = []
    const tools: Tool[] = []
    const warnings: string[] = []

    const dummySource = {
        sourceFile: 'demo_data.xlsx',
        sheetName: 'Demo',
        rowIndex: 1
    }

    if (id === 'TINY_SAMPLE') {
        return getTinySampleData(dummySource)
    }

    if (id === 'STLA_SAMPLE') {
        return getStlaSampleData(dummySource)
    }

    if (id === 'BMW_ROI_DEMO') {
        return getBmwRoiDemoData(dummySource)
    }

    return { projects, areas, cells, robots, tools, warnings }
}

function getTinySampleData(dummySource: any) {
    const projects: Project[] = []
    const areas: Area[] = []
    const cells: Cell[] = []
    const robots: Robot[] = []
    const tools: Tool[] = []
    const warnings: string[] = []

    // Project
    const p1: Project = {
        id: 'p-tiny-1',
        name: 'Tiny Project',
        customer: 'Tiny OEM',
        status: 'Running',
        schedule: {
            phase: 'offline',
            status: 'onTrack',
            plannedStart: getDateOffset(-30),
            plannedEnd: getDateOffset(30)
        }
    }
    projects.push(p1)

    // Area
    const a1: Area = { id: 'a-tiny-1', name: 'Tiny Area', projectId: p1.id }
    areas.push(a1)

    // Cells
    const c1: Cell = {
        id: 'c-tiny-1',
        name: 'Cell 10',
        code: 'C10',
        areaId: a1.id,
        projectId: p1.id,
        status: 'Approved',
        assignedEngineer: 'Dale',
        simulation: {
            percentComplete: 100,
            hasIssues: false,
            metrics: { cycleTime: 45.5 },
            ...dummySource
        },
        schedule: {
            phase: 'offline',
            status: 'onTrack',
            plannedStart: getDateOffset(-25),
            plannedEnd: getDateOffset(5),
            dueDate: getDateOffset(10)
        }
    }
    const c2: Cell = {
        id: 'c-tiny-2',
        name: 'Cell 20',
        code: 'C20',
        areaId: a1.id,
        projectId: p1.id,
        status: 'Blocked',
        assignedEngineer: 'George',
        simulation: {
            percentComplete: 45,
            hasIssues: true,
            metrics: { cycleTime: 0 },
            ...dummySource
        },
        schedule: {
            phase: 'offline',
            status: 'atRisk',
            plannedStart: getDateOffset(-20),
            plannedEnd: getDateOffset(8),
            dueDate: getDateOffset(8)
        }
    }
    cells.push(c1, c2)

    // Robots
    robots.push({
        id: 'r-tiny-1',
        name: 'R1',
        cellId: c1.id,
        toolIds: ['t-tiny-1'],
        ...dummySource
    })
    robots.push({
        id: 'r-tiny-2',
        name: 'R2',
        cellId: c2.id,
        toolIds: [],
        ...dummySource
    })

    // Tools
    tools.push({
        id: 't-tiny-1',
        name: 'Weld Gun 1',
        toolType: 'SPOT_WELD',
        mountType: 'ROBOT_MOUNTED',
        cellId: c1.id,
        ...dummySource
    })

    return { projects, areas, cells, robots, tools, warnings }
}

function getStlaSampleData(dummySource: any) {
    const projects: Project[] = []
    const areas: Area[] = []
    const cells: Cell[] = []
    const robots: Robot[] = []
    const tools: Tool[] = []
    const warnings: string[] = []

    // Project 1: Rear
    const p1: Project = {
        id: 'p-stla-1',
        name: 'STLA-S REAR UNIT',
        customer: 'STLA',
        status: 'Running',
        schedule: {
            phase: 'offline',
            status: 'atRisk',
            plannedStart: getDateOffset(-60),
            plannedEnd: getDateOffset(30)
        }
    }
    projects.push(p1)

    const a1: Area = { id: 'a-stla-1', name: 'Rear Floor', projectId: p1.id }
    const a2: Area = { id: 'a-stla-2', name: 'Wheelhouse', projectId: p1.id }
    areas.push(a1, a2)

    // Cells for Rear Floor - with varied schedule states
    for (let i = 1; i <= 5; i++) {
        const hasIssues = i % 3 === 0
        const percent = i * 20 > 100 ? 100 : i * 20

        const { plannedStart, plannedEnd, dueDate, phase } = getCellSchedule(i)

        const cell: Cell = {
            id: `c-stla-1-${i}`,
            name: `OP${i}0`,
            code: `OP${i}0`,
            areaId: a1.id,
            projectId: p1.id,
            status: hasIssues ? 'Blocked' : (percent === 100 ? 'Approved' : 'InProgress'),
            assignedEngineer: i % 2 === 0 ? 'Dale' : 'George',
            simulation: {
                percentComplete: percent,
                hasIssues,
                metrics: { cycleTime: 50 + i },
                ...dummySource
            },
            schedule: {
                phase,
                status: 'unknown', // Will be computed by scheduleMetrics
                plannedStart,
                plannedEnd,
                dueDate
            }
        }
        cells.push(cell)

        // Add robots
        const r1Id = `r-stla-1-${i}-1`
        const r2Id = `r-stla-1-${i}-2`
        const t1Id = `t-stla-1-${i}-1`

        robots.push({
            id: r1Id,
            name: `R${i}1`,
            cellId: cell.id,
            toolIds: [t1Id],
            ...dummySource
        })
        robots.push({
            id: r2Id,
            name: `R${i}2`,
            cellId: cell.id,
            toolIds: [],
            ...dummySource
        })

        // Add tools
        tools.push({
            id: t1Id,
            name: `Gun ${i}1`,
            toolType: 'SPOT_WELD',
            mountType: 'ROBOT_MOUNTED',
            cellId: cell.id,
            ...dummySource
        })
    }

    // Wheelhouse cells - one with no schedule data
    const whCell: Cell = {
        id: 'c-stla-wh-1',
        name: 'WH10',
        code: 'WH10',
        areaId: a2.id,
        projectId: p1.id,
        status: 'InProgress',
        assignedEngineer: 'Dale',
        simulation: {
            percentComplete: 75,
            hasIssues: false,
            metrics: { cycleTime: 48 },
            ...dummySource
        }
        // NO schedule field - tests graceful degradation
    }
    cells.push(whCell)

    // Project 2: Underbody
    const p2: Project = {
        id: 'p-stla-2',
        name: 'STLA-S UNDERBODY',
        customer: 'STLA',
        status: 'Planning',
        schedule: {
            phase: 'presim',
            status: 'onTrack',
            plannedStart: getDateOffset(10),
            plannedEnd: getDateOffset(90)
        }
    }
    projects.push(p2)

    const a3: Area = { id: 'a-stla-3', name: 'Main Line', projectId: p2.id }
    areas.push(a3)

    // Cells for Underbody - future project
    for (let i = 1; i <= 4; i++) {
        const cell: Cell = {
            id: `c-stla-2-${i}`,
            name: `UB${i}0`,
            code: `UB${i}0`,
            areaId: a3.id,
            projectId: p2.id,
            status: 'NotStarted',
            assignedEngineer: undefined,
            simulation: {
                percentComplete: 0,
                hasIssues: false,
                metrics: {},
                ...dummySource
            },
            schedule: {
                phase: 'presim',
                status: 'unknown',
                plannedStart: getDateOffset(15 + i * 7),
                plannedEnd: getDateOffset(45 + i * 7)
            }
        }
        cells.push(cell)
    }

    return { projects, areas, cells, robots, tools, warnings }
}

// =============================================================================
// BMW ROI DEMO
// Designed for stakeholder presentations. Tells three stories:
//   1. Manager: At-a-glance risk view replacing Monday morning Excel triage
//   2. Engineer: Sarah Jones has 2 blocked cells — she can see exactly why
//   3. PM: 5 tools with UNKNOWN sourcing = unresolved £30k+ decisions
// =============================================================================
function getBmwRoiDemoData(dummySource: any) {
    const projects: Project[] = []
    const areas: Area[] = []
    const cells: Cell[] = []
    const robots: Robot[] = []
    const tools: Tool[] = []
    const warnings: string[] = []

    // -------------------------------------------------------------------------
    // PROJECT
    // -------------------------------------------------------------------------
    const p1: Project = {
        id: 'p-bmw-1',
        name: 'BMW J10735 Body Shop',
        jobNumber: 'J10735',
        customer: 'BMW',
        manager: 'Charles',
        status: 'Running',
        schedule: {
            phase: 'offline',
            status: 'atRisk',
            plannedStart: getDateOffset(-90),
            plannedEnd: getDateOffset(45)
        }
    }
    projects.push(p1)

    // -------------------------------------------------------------------------
    // AREAS
    // -------------------------------------------------------------------------
    const aFront: Area = { id: 'a-bmw-front', name: 'FRONT UNIT', projectId: p1.id }
    const aRear: Area  = { id: 'a-bmw-rear',  name: 'REAR UNIT',  projectId: p1.id }
    const aUnder: Area = { id: 'a-bmw-under', name: 'UNDERBODY',  projectId: p1.id }
    areas.push(aFront, aRear, aUnder)

    // -------------------------------------------------------------------------
    // FRONT UNIT CELLS
    // -------------------------------------------------------------------------

    // OP010 – Dave Smith – 100% – DONE (show the audience what "healthy" looks like)
    const cF1: Cell = {
        id: 'c-bmw-f1', name: 'Front Floor OP010', code: 'OP010',
        areaId: aFront.id, projectId: p1.id,
        status: 'Approved', assignedEngineer: 'Dave Smith',
        simulation: { percentComplete: 100, hasIssues: false, metrics: { cycleTime: 42.1 }, ...dummySource },
        schedule: { phase: 'offline', status: 'onTrack', plannedStart: getDateOffset(-80), plannedEnd: getDateOffset(-10), dueDate: getDateOffset(-5) }
    }

    // OP020 – Dave Smith – 100% – DONE
    const cF2: Cell = {
        id: 'c-bmw-f2', name: 'Front Floor OP020', code: 'OP020',
        areaId: aFront.id, projectId: p1.id,
        status: 'Approved', assignedEngineer: 'Dave Smith',
        simulation: { percentComplete: 100, hasIssues: false, metrics: { cycleTime: 38.5 }, ...dummySource },
        schedule: { phase: 'offline', status: 'onTrack', plannedStart: getDateOffset(-75), plannedEnd: getDateOffset(-8), dueDate: getDateOffset(-3) }
    }

    // OP030 – Sarah Jones – 72% – AT RISK (due in 8 days, behind pace)
    const cF3: Cell = {
        id: 'c-bmw-f3', name: 'Front Floor OP030', code: 'OP030',
        areaId: aFront.id, projectId: p1.id,
        status: 'InProgress', assignedEngineer: 'Sarah Jones',
        simulation: { percentComplete: 72, hasIssues: false, metrics: { cycleTime: 0 }, ...dummySource },
        schedule: { phase: 'offline', status: 'atRisk', plannedStart: getDateOffset(-60), plannedEnd: getDateOffset(8), dueDate: getDateOffset(8) }
    }

    // OP040 – Sarah Jones – 38% – BLOCKED (weld gun G04 not yet delivered)
    const cF4: Cell = {
        id: 'c-bmw-f4', name: 'Front Floor OP040', code: 'OP040',
        areaId: aFront.id, projectId: p1.id,
        status: 'Blocked', assignedEngineer: 'Sarah Jones',
        simulation: { percentComplete: 38, hasIssues: true, metrics: { cycleTime: 0 }, ...dummySource },
        schedule: { phase: 'offline', status: 'atRisk', plannedStart: getDateOffset(-55), plannedEnd: getDateOffset(10), dueDate: getDateOffset(10) }
    }

    // OP050 – Mike Brown – 65% – on track
    const cF5: Cell = {
        id: 'c-bmw-f5', name: 'Front Floor OP050', code: 'OP050',
        areaId: aFront.id, projectId: p1.id,
        status: 'InProgress', assignedEngineer: 'Mike Brown',
        simulation: { percentComplete: 65, hasIssues: false, metrics: { cycleTime: 0 }, ...dummySource },
        schedule: { phase: 'offline', status: 'onTrack', plannedStart: getDateOffset(-50), plannedEnd: getDateOffset(20), dueDate: getDateOffset(25) }
    }

    cells.push(cF1, cF2, cF3, cF4, cF5)

    // -------------------------------------------------------------------------
    // REAR UNIT CELLS
    // -------------------------------------------------------------------------

    // OP010 – Mike Brown – 58% – AT RISK
    const cR1: Cell = {
        id: 'c-bmw-r1', name: 'Rear Rail OP010', code: 'OP010',
        areaId: aRear.id, projectId: p1.id,
        status: 'InProgress', assignedEngineer: 'Mike Brown',
        simulation: { percentComplete: 58, hasIssues: false, metrics: { cycleTime: 0 }, ...dummySource },
        schedule: { phase: 'offline', status: 'atRisk', plannedStart: getDateOffset(-45), plannedEnd: getDateOffset(12), dueDate: getDateOffset(12) }
    }

    // OP020 – Sarah Jones – 22% – BLOCKED + LATE (past due, no tooling delivered)
    // KEY STORY: This is Sarah's second blocked cell. The weld gun sourcing is UNKNOWN.
    const cR2: Cell = {
        id: 'c-bmw-r2', name: 'Rear Rail OP020', code: 'OP020',
        areaId: aRear.id, projectId: p1.id,
        status: 'Blocked', assignedEngineer: 'Sarah Jones',
        simulation: { percentComplete: 22, hasIssues: true, metrics: { cycleTime: 0 }, ...dummySource },
        schedule: { phase: 'offline', status: 'late', plannedStart: getDateOffset(-55), plannedEnd: getDateOffset(-3), dueDate: getDateOffset(-3) }
    }

    // OP030 – Dave Smith – 91% – nearly done, on track
    const cR3: Cell = {
        id: 'c-bmw-r3', name: 'Rear Rail OP030', code: 'OP030',
        areaId: aRear.id, projectId: p1.id,
        status: 'ReadyForReview', assignedEngineer: 'Dave Smith',
        simulation: { percentComplete: 91, hasIssues: false, metrics: { cycleTime: 44.0 }, ...dummySource },
        schedule: { phase: 'offline', status: 'onTrack', plannedStart: getDateOffset(-40), plannedEnd: getDateOffset(15), dueDate: getDateOffset(20) }
    }

    // OP040 – unassigned – not started yet
    const cR4: Cell = {
        id: 'c-bmw-r4', name: 'Rear Rail OP040', code: 'OP040',
        areaId: aRear.id, projectId: p1.id,
        status: 'NotStarted', assignedEngineer: undefined,
        simulation: { percentComplete: 0, hasIssues: false, metrics: {}, ...dummySource },
        schedule: { phase: 'presim', status: 'unknown', plannedStart: getDateOffset(5), plannedEnd: getDateOffset(45) }
    }

    cells.push(cR1, cR2, cR3, cR4)

    // -------------------------------------------------------------------------
    // UNDERBODY CELLS
    // -------------------------------------------------------------------------

    // OP010 – Mike Brown – 12% – BLOCKED + LATE (critical: weld gun not even designed yet)
    const cU1: Cell = {
        id: 'c-bmw-u1', name: 'Underbody OP010', code: 'OP010',
        areaId: aUnder.id, projectId: p1.id,
        status: 'Blocked', assignedEngineer: 'Mike Brown',
        simulation: { percentComplete: 12, hasIssues: true, metrics: { cycleTime: 0 }, ...dummySource },
        schedule: { phase: 'offline', status: 'late', plannedStart: getDateOffset(-35), plannedEnd: getDateOffset(-2), dueDate: getDateOffset(-2) }
    }

    // OP020 – Dave Smith – 35% – AT RISK
    const cU2: Cell = {
        id: 'c-bmw-u2', name: 'Underbody OP020', code: 'OP020',
        areaId: aUnder.id, projectId: p1.id,
        status: 'InProgress', assignedEngineer: 'Dave Smith',
        simulation: { percentComplete: 35, hasIssues: false, metrics: { cycleTime: 0 }, ...dummySource },
        schedule: { phase: 'offline', status: 'atRisk', plannedStart: getDateOffset(-30), plannedEnd: getDateOffset(18), dueDate: getDateOffset(18) }
    }

    // OP030 – unassigned – future
    const cU3: Cell = {
        id: 'c-bmw-u3', name: 'Underbody OP030', code: 'OP030',
        areaId: aUnder.id, projectId: p1.id,
        status: 'NotStarted', assignedEngineer: undefined,
        simulation: { percentComplete: 0, hasIssues: false, metrics: {}, ...dummySource },
        schedule: { phase: 'presim', status: 'unknown', plannedStart: getDateOffset(10), plannedEnd: getDateOffset(50) }
    }

    cells.push(cU1, cU2, cU3)

    // -------------------------------------------------------------------------
    // ROBOTS
    // -------------------------------------------------------------------------
    // FRONT UNIT
    const rF1Id = 'r-bmw-f1'; const rF2Id = 'r-bmw-f2'
    const rF3Id = 'r-bmw-f3'; const rF4Id = 'r-bmw-f4'
    const rF5Id = 'r-bmw-f5'; const rF6Id = 'r-bmw-f6'
    const rF7Id = 'r-bmw-f7'

    robots.push(
        { id: rF1Id, name: 'R01', kind: 'ROBOT', sourcing: 'REUSE', oemModel: 'FANUC R-2000iC/270F', cellId: cF1.id, toolIds: ['t-bmw-g01'], metadata: { 'Payload (kg)': 270, 'Notes': 'Reused from J10100' }, ...dummySource },
        { id: rF2Id, name: 'R02', kind: 'ROBOT', sourcing: 'REUSE', oemModel: 'FANUC R-2000iC/270F', cellId: cF1.id, toolIds: [],            metadata: { 'Payload (kg)': 270 }, ...dummySource },
        { id: rF3Id, name: 'R03', kind: 'ROBOT', sourcing: 'REUSE', oemModel: 'KUKA KR210 R3100', cellId: cF2.id, toolIds: ['t-bmw-g02'],   metadata: { 'Payload (kg)': 210 }, ...dummySource },
        { id: rF4Id, name: 'R04', kind: 'ROBOT', sourcing: 'NEW_BUY', oemModel: 'ABB IRB 6700-205', cellId: cF3.id, toolIds: ['t-bmw-g03'], metadata: { 'Payload (kg)': 205, 'Supplier': 'ABB UK' }, ...dummySource },
        { id: rF5Id, name: 'R05', kind: 'ROBOT', sourcing: 'REUSE', oemModel: 'FANUC R-2000iC/270F', cellId: cF4.id, toolIds: ['t-bmw-g04'], metadata: { 'Payload (kg)': 270, 'Notes': 'Blocked – awaiting G04 delivery' }, ...dummySource },
        { id: rF6Id, name: 'R06', kind: 'ROBOT', sourcing: 'REUSE', oemModel: 'FANUC R-2000iC/270F', cellId: cF4.id, toolIds: [],            metadata: { 'Payload (kg)': 270 }, ...dummySource },
        { id: rF7Id, name: 'R07', kind: 'ROBOT', sourcing: 'NEW_BUY', oemModel: 'KUKA KR210 R3100', cellId: cF5.id, toolIds: ['t-bmw-g05'], metadata: { 'Payload (kg)': 210, 'Supplier': 'KUKA Systems' }, ...dummySource },
    )

    // REAR UNIT
    const rR1Id = 'r-bmw-r1'; const rR2Id = 'r-bmw-r2'
    const rR3Id = 'r-bmw-r3'; const rR4Id = 'r-bmw-r4'

    robots.push(
        { id: rR1Id, name: 'R08', kind: 'ROBOT', sourcing: 'REUSE', oemModel: 'FANUC R-2000iC/270F', cellId: cR1.id, toolIds: ['t-bmw-g06'], metadata: { 'Payload (kg)': 270 }, ...dummySource },
        { id: rR2Id, name: 'R09', kind: 'ROBOT', sourcing: 'UNKNOWN', oemModel: 'ABB IRB 6700-205', cellId: cR2.id, toolIds: ['t-bmw-g07'], metadata: { 'Payload (kg)': 205, 'Notes': 'Sourcing decision outstanding' }, ...dummySource },
        { id: rR3Id, name: 'R10', kind: 'ROBOT', sourcing: 'UNKNOWN', oemModel: 'ABB IRB 6700-205', cellId: cR2.id, toolIds: ['t-bmw-g08'], metadata: { 'Payload (kg)': 205, 'Notes': 'Sourcing decision outstanding' }, ...dummySource },
        { id: rR4Id, name: 'R11', kind: 'ROBOT', sourcing: 'REUSE', oemModel: 'KUKA KR210 R3100', cellId: cR3.id, toolIds: ['t-bmw-g09'],  metadata: { 'Payload (kg)': 210, 'Notes': 'Reused from J10050' }, ...dummySource },
    )

    // UNDERBODY
    const rU1Id = 'r-bmw-u1'; const rU2Id = 'r-bmw-u2'

    robots.push(
        { id: rU1Id, name: 'R12', kind: 'ROBOT', sourcing: 'NEW_BUY', oemModel: 'FANUC R-2000iC/270F', cellId: cU1.id, toolIds: ['t-bmw-g10'], metadata: { 'Payload (kg)': 270, 'Supplier': 'FANUC UK', 'Notes': 'Gun not yet designed – blocking simulation' }, ...dummySource },
        { id: rU2Id, name: 'R13', kind: 'ROBOT', sourcing: 'UNKNOWN', oemModel: 'ABB IRB 6700-205', cellId: cU2.id, toolIds: ['t-bmw-g11'],  metadata: { 'Payload (kg)': 205, 'Notes': 'Sourcing decision outstanding' }, ...dummySource },
    )

    // -------------------------------------------------------------------------
    // TOOLS / WELD GUNS
    // -------------------------------------------------------------------------
    tools.push(
        // FRONT UNIT – healthy sourcing – REUSE and NEW_BUY decided
        { id: 't-bmw-g01', name: 'G01 Spot Weld Gun', kind: 'GUN', toolType: 'SPOT_WELD', mountType: 'ROBOT_MOUNTED', sourcing: 'REUSE',   cellId: cF1.id, robotId: rF1Id, metadata: { 'Gun No': 'G01', 'Max Force (kN)': 4.5, 'Notes': 'From J10100 reuse stock' }, ...dummySource },
        { id: 't-bmw-g02', name: 'G02 Spot Weld Gun', kind: 'GUN', toolType: 'SPOT_WELD', mountType: 'ROBOT_MOUNTED', sourcing: 'REUSE',   cellId: cF2.id, robotId: rF3Id, metadata: { 'Gun No': 'G02', 'Max Force (kN)': 4.5 }, ...dummySource },
        { id: 't-bmw-g03', name: 'G03 Spot Weld Gun', kind: 'GUN', toolType: 'SPOT_WELD', mountType: 'ROBOT_MOUNTED', sourcing: 'NEW_BUY', cellId: cF3.id, robotId: rF4Id, metadata: { 'Gun No': 'G03', 'Max Force (kN)': 5.0, 'Supplier': 'Nimak GmbH' }, ...dummySource },
        // G04 – UNKNOWN sourcing – this is BLOCKING OP040 (Sarah Jones's station)
        { id: 't-bmw-g04', name: 'G04 Spot Weld Gun', kind: 'GUN', toolType: 'SPOT_WELD', mountType: 'ROBOT_MOUNTED', sourcing: 'UNKNOWN', cellId: cF4.id, robotId: rF5Id, metadata: { 'Gun No': 'G04', 'Max Force (kN)': 4.5, 'Notes': '⚠ Sourcing not decided – blocking OP040 simulation' }, ...dummySource },
        { id: 't-bmw-g05', name: 'G05 Spot Weld Gun', kind: 'GUN', toolType: 'SPOT_WELD', mountType: 'ROBOT_MOUNTED', sourcing: 'NEW_BUY', cellId: cF5.id, robotId: rF7Id, metadata: { 'Gun No': 'G05', 'Max Force (kN)': 5.0, 'Supplier': 'Nimak GmbH' }, ...dummySource },

        // REAR UNIT – two UNKNOWN guns on the blocked/late station
        { id: 't-bmw-g06', name: 'G06 Spot Weld Gun', kind: 'GUN', toolType: 'SPOT_WELD', mountType: 'ROBOT_MOUNTED', sourcing: 'REUSE',   cellId: cR1.id, robotId: rR1Id, metadata: { 'Gun No': 'G06', 'Max Force (kN)': 4.5 }, ...dummySource },
        { id: 't-bmw-g07', name: 'G07 Spot Weld Gun', kind: 'GUN', toolType: 'SPOT_WELD', mountType: 'ROBOT_MOUNTED', sourcing: 'UNKNOWN', cellId: cR2.id, robotId: rR2Id, metadata: { 'Gun No': 'G07', 'Max Force (kN)': 5.0, 'Notes': '⚠ Sourcing outstanding – station past due date' }, ...dummySource },
        { id: 't-bmw-g08', name: 'G08 Spot Weld Gun', kind: 'GUN', toolType: 'SPOT_WELD', mountType: 'ROBOT_MOUNTED', sourcing: 'UNKNOWN', cellId: cR2.id, robotId: rR3Id, metadata: { 'Gun No': 'G08', 'Max Force (kN)': 5.0, 'Notes': '⚠ Sourcing outstanding – station past due date' }, ...dummySource },
        { id: 't-bmw-g09', name: 'G09 Spot Weld Gun', kind: 'GUN', toolType: 'SPOT_WELD', mountType: 'ROBOT_MOUNTED', sourcing: 'REUSE',   cellId: cR3.id, robotId: rR4Id, metadata: { 'Gun No': 'G09', 'Max Force (kN)': 4.5, 'Notes': 'From J10050 reuse stock' }, ...dummySource },

        // UNDERBODY – critical: gun not even designed yet (UNKNOWN, blocking critical station)
        { id: 't-bmw-g10', name: 'G10 Spot Weld Gun', kind: 'GUN', toolType: 'SPOT_WELD', mountType: 'ROBOT_MOUNTED', sourcing: 'UNKNOWN', cellId: cU1.id, robotId: rU1Id, metadata: { 'Gun No': 'G10', 'Notes': '⚠ Gun design not started – station blocked and past due' }, ...dummySource },
        { id: 't-bmw-g11', name: 'G11 Spot Weld Gun', kind: 'GUN', toolType: 'SPOT_WELD', mountType: 'ROBOT_MOUNTED', sourcing: 'UNKNOWN', cellId: cU2.id, robotId: rU2Id, metadata: { 'Gun No': 'G11', 'Notes': '⚠ Sourcing decision outstanding' }, ...dummySource },
    )

    // -------------------------------------------------------------------------
    // WARNINGS – shown on Warnings page and Data Health
    // -------------------------------------------------------------------------
    warnings.push(
        'FRONT UNIT OP040 (G04): Weld gun sourcing is UNKNOWN — simulation is blocked pending a sourcing decision',
        'REAR UNIT OP020 (G07, G08): Two guns with UNKNOWN sourcing on a station that is past its due date',
        'UNDERBODY OP010 (G10): Weld gun design not started — station is Blocked and 2 days past its deadline',
        'UNDERBODY OP020 (G11): Sourcing decision outstanding — at-risk of missing offline phase deadline',
        'Sarah Jones: 2 of 3 assigned stations are currently Blocked',
        'Mike Brown: 2 of 3 assigned stations are At-Risk or Blocked',
    )

    return { projects, areas, cells, robots, tools, warnings }
}

function getCellSchedule(i: number): { plannedStart: string, plannedEnd: string, dueDate?: string, phase: SchedulePhase } {
    if (i === 1) {
        // On track - early phase, good progress
        return {
            plannedStart: getDateOffset(-40),
            plannedEnd: getDateOffset(20),
            dueDate: getDateOffset(25),
            phase: 'presim'
        }
    }

    if (i === 2) {
        // On track - mid phase, excellent progress (100%)
        return {
            plannedStart: getDateOffset(-35),
            plannedEnd: getDateOffset(15),
            dueDate: getDateOffset(20),
            phase: 'offline'
        }
    }

    if (i === 3) {
        // At risk - low completion, close to deadline
        return {
            plannedStart: getDateOffset(-30),
            plannedEnd: getDateOffset(5),
            dueDate: getDateOffset(5),
            phase: 'offline'
        }
    }

    if (i === 4) {
        // Late - past due date, not complete
        return {
            plannedStart: getDateOffset(-45),
            plannedEnd: getDateOffset(-5),
            dueDate: getDateOffset(-5),
            phase: 'onsite'
        }
    }

    // On track - high completion, plenty of time
    return {
        plannedStart: getDateOffset(-20),
        plannedEnd: getDateOffset(40),
        dueDate: getDateOffset(50),
        phase: 'rampup'
    }
}
