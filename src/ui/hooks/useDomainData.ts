import {
    useProjects as useRealProjects,
    useProject as useRealProject,
    useAreas as useRealAreas,
    useCells as useRealCells,
    useCell as useRealCell,
    useRobots as useRealRobots,
    useTools as useRealTools,
    useWarnings as useRealWarnings,
    useHasUnsyncedChanges as useRealHasUnsyncedChanges,
    useLastUpdated as useRealLastUpdated,
    useDataSource as useRealDataSource
} from '../../domain/coreStore';
import { Project, Area, Cell, Robot, Tool, ToolType, SpotWeldSubType } from '../../domain/core';

// Re-export types
export type { Project, Area, Cell, Robot, Tool, ToolType, SpotWeldSubType };

// --- Hooks ---

export function useProjects(): Project[] {
    return useRealProjects();
}

export function useProjectById(id: string): Project | undefined {
    return useRealProject(id);
}

export function useAreas(projectId?: string): Area[] {
    return useRealAreas(projectId);
}

export function useCells(projectId?: string): Cell[] {
    return useRealCells(projectId);
}

export function useCellById(id: string | undefined): Cell | undefined {
    if (!id) return undefined;
    return useRealCell(id);
}

export function useRobots(): Robot[] {
    // useRealRobots() returns all robots if no arg provided
    return useRealRobots();
}

export function useRobotsByCell(cellId: string): Robot[] {
    return useRealRobots(cellId);
}

export function useTools(): Tool[] {
    return useRealTools();
}

export function useToolsByCell(cellId: string): Tool[] {
    return useRealTools(cellId);
}

export function useToolsFiltered(filter: { type?: ToolType; subType?: SpotWeldSubType }): Tool[] {
    let tools = useRealTools();
    if (filter.type && filter.type !== 'OTHER') {
        tools = tools.filter(t => t.toolType === filter.type);
    } else if (filter.type === 'OTHER') {
        tools = tools.filter(t => t.toolType === 'OTHER');
    }

    if (filter.subType && (filter.subType as string) !== 'ALL') {
        tools = tools.filter(t => t.subType === filter.subType);
    }
    return tools;
}

export function useWarnings(): string[] {
    return useRealWarnings();
}

export function useHasUnsyncedChanges(): boolean {
    return useRealHasUnsyncedChanges();
}

export function useLastUpdated() {
    return useRealLastUpdated();
}

export function useDataSource() {
    return useRealDataSource();
}

// --- Derived Metrics Hooks ---

import { getAllCellScheduleRisks } from '../../domain/scheduleMetrics';

// ...

export function useGlobalSimulationMetrics() {
    const projects = useRealProjects();
    const cells = useRealCells();
    const scheduleRisks = getAllCellScheduleRisks();

    const cellsWithSimulation = cells.filter(c => c.simulation && c.simulation.percentComplete > 0);
    const avgCompletion = cellsWithSimulation.length > 0
        ? Math.round(cellsWithSimulation.reduce((acc, c) => acc + (c.simulation?.percentComplete || 0), 0) / cellsWithSimulation.length)
        : 0;

    const atRiskCellsCount = cells.filter(c => {
        if (!c.simulation) return false;
        return c.simulation.hasIssues || (c.simulation.percentComplete > 0 && c.simulation.percentComplete < 100 && c.status === 'Blocked');
    }).length;

    const lateCellsCount = scheduleRisks.filter(r => r.status === 'late').length;

    return {
        totalProjects: projects.length,
        totalCells: cells.length,
        avgCompletion,
        atRiskCellsCount,
        lateCellsCount
    };
}

export function useAllProjectMetrics() {
    const projects = useRealProjects();
    const cells = useRealCells();

    return projects.map(p => {
        const projectCells = cells.filter(c => c.projectId === p.id);
        const cellsWithSim = projectCells.filter(c => c.simulation && c.simulation.percentComplete > 0);
        const avgCompletion = cellsWithSim.length > 0
            ? Math.round(cellsWithSim.reduce((acc, c) => acc + (c.simulation?.percentComplete || 0), 0) / cellsWithSim.length)
            : 0;

        const atRiskCellsCount = projectCells.filter(c => {
            if (!c.simulation) return false;
            return c.simulation.hasIssues || (c.simulation.percentComplete > 0 && c.simulation.percentComplete < 100 && c.status === 'Blocked');
        }).length;

        return {
            ...p,
            cellCount: projectCells.length,
            avgCompletion,
            atRiskCellsCount
        };
    });
}

export function useProjectMetrics(projectId: string) {
    const project = useRealProject(projectId);
    const cells = useRealCells(projectId);

    if (!project) return undefined;

    const cellsWithSim = cells.filter(c => c.simulation && c.simulation.percentComplete > 0);
    const avgCompletion = cellsWithSim.length > 0
        ? Math.round(cellsWithSim.reduce((acc, c) => acc + (c.simulation?.percentComplete || 0), 0) / cellsWithSim.length)
        : 0;

    const atRiskCellsCount = cells.filter(c => {
        if (!c.simulation) return false;
        return c.simulation.hasIssues || (c.simulation.percentComplete > 0 && c.simulation.percentComplete < 100 && c.status === 'Blocked');
    }).length;

    return {
        ...project,
        cellCount: cells.length,
        avgCompletion,
        atRiskCellsCount
    };
}

export function useAllEngineerMetrics() {
    const cells = useRealCells();
    const projects = useRealProjects();

    const engineers: Record<string, Cell[]> = {};

    cells.forEach(c => {
        if (c.assignedEngineer) {
            if (!engineers[c.assignedEngineer]) {
                engineers[c.assignedEngineer] = [];
            }
            engineers[c.assignedEngineer].push(c);
        }
    });

    return Object.entries(engineers).map(([name, engineerCells]) => {
        const cellsWithSim = engineerCells.filter(c => c.simulation && c.simulation.percentComplete > 0);
        const avgCompletion = cellsWithSim.length > 0
            ? Math.round(cellsWithSim.reduce((acc, c) => acc + (c.simulation?.percentComplete || 0), 0) / cellsWithSim.length)
            : 0;

        const atRiskCellsCount = engineerCells.filter(c => {
            if (!c.simulation) return false;
            return c.simulation.hasIssues || (c.simulation.percentComplete > 0 && c.simulation.percentComplete < 100 && c.status === 'Blocked');
        }).length;

        const projectIds = Array.from(new Set(engineerCells.map(c => c.projectId)));
        const projectNames = projectIds.map(id => projects.find(p => p.id === id)?.name || id).join(', ');

        return {
            name, // Keeping 'name' here as this hook returns a locally defined object structure, NOT EngineerMetrics from derivedMetrics
            cellCount: engineerCells.length,
            avgCompletion,
            atRiskCellsCount,
            projectNames
        };
    }).sort((a, b) => {
        if (b.atRiskCellsCount !== a.atRiskCellsCount) return b.atRiskCellsCount - a.atRiskCellsCount;
        return a.name.localeCompare(b.name);
    });
}

export function useEngineerMetrics(name: string) {
    const allMetrics = useAllEngineerMetrics();
    return allMetrics.find(e => e.name === name);
}

export function useHasSimulationData() {
    const cells = useRealCells();
    return cells.length > 0;
}

// Alias for backward compatibility
export function useHasData() {
    return useHasSimulationData();
}
