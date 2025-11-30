import { useAllEngineerMetrics, useCells, useGlobalSimulationMetrics, useWarnings } from './useDomainData';
import { getAllCellScheduleRisks } from '../../domain/scheduleMetrics';
import { useDaleDayMood, DaleMood } from './useDaleDayMood';

export type DaleSummary = {
    summaryText: string;
    tone: DaleMood;
};

export function useDaleSummary(): DaleSummary {
    const metrics = useGlobalSimulationMetrics();
    const engineerMetrics = useAllEngineerMetrics();
    const cells = useCells();
    const scheduleRisks = getAllCellScheduleRisks();
    const warnings = useWarnings();
    const mood = useDaleDayMood();

    if (metrics.totalCells === 0) {
        return {
            summaryText: "No data loaded yet. Please load a scenario to see the summary.",
            tone: 'normal'
        };
    }

    const lateCount = scheduleRisks.filter(r => r.status === 'late').length;
    const overloadedEngineers = engineerMetrics
        .filter(e => e.atRiskCellsCount > 0)
        .sort((a, b) => b.atRiskCellsCount - a.atRiskCellsCount);

    const worstCell = cells
        .filter(c => c.simulation?.hasIssues || c.status === 'Blocked')
        .sort((a, b) => (a.simulation?.percentComplete || 0) - (b.simulation?.percentComplete || 0))[0];

    let text = "";

    // Opening
    if (mood === 'stormy') {
        text += "Today looks stormy. ";
    } else if (mood === 'spiky') {
        text += "Today is a bit spiky. ";
    } else if (mood === 'calm') {
        text += "Today is calm and healthy. ";
    } else {
        text += "Simulation status is normal. ";
    }

    // Metrics
    if (lateCount > 0) {
        text += `${lateCount} cells are running late. `;
    }

    if (overloadedEngineers.length > 0) {
        const names = overloadedEngineers.slice(0, 2).map(e => e.name).join(' and ');
        text += `${names} ${overloadedEngineers.length === 1 ? 'is' : 'are'} managing at-risk cells. `;
    }

    // Worst Cell
    if (worstCell) {
        text += `The most critical cell is ${worstCell.name} (${worstCell.simulation?.percentComplete}% complete). `;
    }

    // Warnings
    if (warnings.length > 0) {
        text += `${warnings.length} data warnings detected. `;
    }

    // Closing recommendation
    if (worstCell) {
        text += `Suggest tackling ${worstCell.name} first.`;
    } else if (overloadedEngineers.length > 0) {
        text += `Suggest reviewing ${overloadedEngineers[0].name}'s workload.`;
    } else if (mood === 'calm') {
        text += "Everything is on track.";
    }

    return {
        summaryText: text,
        tone: mood
    };
}
