import { Project, Area, Cell, Robot, Tool } from './core'

export type DemoScenarioId = 'STLA_SAMPLE' | 'TINY_SAMPLE'

export interface DemoScenarioSummary {
    id: DemoScenarioId
    label: string
    description: string
}

export const DEMO_SCENARIOS: DemoScenarioSummary[] = [
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
        // Project
        const p1: Project = {
            id: 'p-tiny-1',
            name: 'Tiny Project',
            customer: 'Tiny OEM',
            status: 'Running'
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

    } else if (id === 'STLA_SAMPLE') {
        // Project 1: Rear
        const p1: Project = {
            id: 'p-stla-1',
            name: 'STLA-S REAR UNIT',
            customer: 'STLA',
            status: 'Running'
        }
        projects.push(p1)

        const a1: Area = { id: 'a-stla-1', name: 'Rear Floor', projectId: p1.id }
        const a2: Area = { id: 'a-stla-2', name: 'Wheelhouse', projectId: p1.id }
        areas.push(a1, a2)

        // Cells for Rear Floor
        for (let i = 1; i <= 5; i++) {
            const hasIssues = i % 3 === 0
            const percent = i * 20 > 100 ? 100 : i * 20

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

        // Project 2: Underbody
        const p2: Project = {
            id: 'p-stla-2',
            name: 'STLA-S UNDERBODY',
            customer: 'STLA',
            status: 'Planning'
        }
        projects.push(p2)

        const a3: Area = { id: 'a-stla-3', name: 'Main Line', projectId: p2.id }
        areas.push(a3)

        // Cells for Underbody
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
                }
            }
            cells.push(cell)
        }
    }

    return { projects, areas, cells, robots, tools, warnings }
}
