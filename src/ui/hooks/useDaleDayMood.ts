import { useGlobalSimulationMetrics, useWarnings } from './useDomainData';

export type DaleMood = 'calm' | 'normal' | 'spiky' | 'stormy';

export function useDaleDayMood(): DaleMood {
    const metrics = useGlobalSimulationMetrics();
    const warnings = useWarnings();

    // If no cells, it's just a normal empty state
    if (metrics.totalCells === 0) {
        return 'normal';
    }

    // Stormy: Significant late cells or high warnings combined with risks
    if (metrics.lateCellsCount > 5 || (metrics.atRiskCellsCount > 10 && warnings.length > 5)) {
        return 'stormy';
    }

    // Spiky: Some risks or warnings present
    if (metrics.atRiskCellsCount > 2 || warnings.length > 2 || metrics.lateCellsCount > 0) {
        return 'spiky';
    }

    // Calm: Little to no issues
    return 'calm';
}
