import { useAllEngineerMetrics, useCells, useWarnings } from './useDomainData';
import { getAllCellScheduleRisks } from '../../domain/scheduleMetrics';
import { useDaleDayMood } from './useDaleDayMood';

export type DaleAction = {
    id: string;
    title: string;
    detail: string;
    link?: { label: string; to: string };
    severity: 'low' | 'medium' | 'high';
};

export function useDaleActions(): DaleAction[] {
    const engineerMetrics = useAllEngineerMetrics();
    const cells = useCells();
    const scheduleRisks = getAllCellScheduleRisks();
    const warnings = useWarnings();
    const mood = useDaleDayMood();
    const actions: DaleAction[] = [];

    // 1. Check for overloaded engineers
    const overloadedEngineers = engineerMetrics
        .filter(e => e.atRiskCellsCount > 0)
        .sort((a, b) => b.atRiskCellsCount - a.atRiskCellsCount);

    if (overloadedEngineers.length > 0) {
        const topEng = overloadedEngineers[0];
        actions.push({
            id: 'eng-overload',
            title: `Check in with ${topEng.name}`,
            detail: `${topEng.name} has ${topEng.atRiskCellsCount} cells at risk. They might need support.`,
            link: { label: 'View Engineers', to: '/engineers' },
            severity: 'high'
        });
    }

    // 2. Check for late cells
    const lateRisks = scheduleRisks.filter(r => r.status === 'late');
    if (lateRisks.length > 0) {
        const worstLate = lateRisks[0]; // Just take the first one for now, or sort by delay if we had that
        const cell = cells.find(c => c.id === worstLate.cellId);
        if (cell) {
            actions.push({
                id: 'cell-late',
                title: `Focus on ${cell.name}`,
                detail: `This cell is late. It was planned to start on ${worstLate.plannedStart ? new Date(worstLate.plannedStart).toLocaleDateString() : 'unknown date'}.`,
                link: { label: 'View Cell', to: `/projects/${cell.projectId}/cells/${encodeURIComponent(cell.id)}` },
                severity: 'high'
            });
        }
    }

    // 3. Check for specific worst cell (Blocked or Issues)
    const worstCells = cells
        .filter(c => c.simulation?.hasIssues || c.status === 'Blocked')
        .sort((a, b) => (a.simulation?.percentComplete || 0) - (b.simulation?.percentComplete || 0));

    if (worstCells.length > 0) {
        const worst = worstCells[0];
        // Avoid duplicate if we already caught it as late
        const isAlreadyListed = actions.some(a => a.link?.to.includes(worst.id));
        if (!isAlreadyListed) {
            actions.push({
                id: 'cell-blocked',
                title: `Unblock ${worst.name}`,
                detail: `Current status is ${worst.status} with ${worst.simulation?.percentComplete}% completion.`,
                link: { label: 'View Cell', to: `/projects/${worst.projectId}/cells/${encodeURIComponent(worst.id)}` },
                severity: 'medium'
            });
        }
    }

    // 4. Warnings check
    if (warnings.length > 5) {
        actions.push({
            id: 'warnings-high',
            title: 'Review Data Quality',
            detail: `There are ${warnings.length} warnings in the latest ingestion.`,
            link: { label: 'View Warnings', to: '/warnings' },
            severity: 'medium'
        });
    }

    // If calm, suggest planning
    if (actions.length === 0 && mood === 'calm') {
        actions.push({
            id: 'calm-planning',
            title: 'Plan ahead',
            detail: 'No urgent fires. Good time to review upcoming schedule phases.',
            link: { label: 'View Timeline', to: `/projects/${cells[0]?.projectId || ''}` }, // Link to first project if exists
            severity: 'low'
        });
    }

    return actions.slice(0, 3);
}
