import { Cell } from '../../domain/core';
import { getCellScheduleRisk } from '../../domain/scheduleMetrics';
import { AlertTriangle, Clock } from 'lucide-react';
import { useTheme } from '../ThemeContext';

interface CellChaosHintProps {
    cell: Cell;
}

export function CellChaosHint({ cell }: CellChaosHintProps) {
    const { themeMode } = useTheme();
    const scheduleRisk = getCellScheduleRisk(cell);


    // Only show in Flower mode or if critical
    if (themeMode !== 'flower' && !cell.simulation?.hasIssues && scheduleRisk.status === 'onTrack') {
        return null;
    }

    const reasons: { icon: React.ReactNode; text: string; color: string }[] = [];

    // 1. Simulation Issues
    if (cell.simulation?.hasIssues) {
        reasons.push({
            icon: <AlertTriangle className="h-3 w-3" />,
            text: "Blocked or has critical issues",
            color: "text-red-600 dark:text-red-400"
        });
    }

    // 2. Schedule Risk
    if (scheduleRisk.status === 'late') {
        reasons.push({
            icon: <Clock className="h-3 w-3" />,
            text: "Late: Start date passed, completion low",
            color: "text-rose-600 dark:text-rose-400"
        });
    } else if (scheduleRisk.status === 'atRisk') {
        reasons.push({
            icon: <Clock className="h-3 w-3" />,
            text: "At Risk: Tight schedule vs progress",
            color: "text-amber-600 dark:text-amber-400"
        });
    }

    if (reasons.length === 0) return null;

    return (
        <div className="mt-2 flex flex-wrap gap-2">
            {reasons.map((reason, idx) => (
                <div
                    key={idx}
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm ${reason.color}`}
                >
                    <span className="mr-1.5">{reason.icon}</span>
                    {reason.text}
                </div>
            ))}
        </div>
    );
}
