import { Database, DatabaseZap } from 'lucide-react';

interface DataStatusIndicatorProps {
    hasData: boolean;
}

export function DataStatusIndicator({ hasData }: DataStatusIndicatorProps) {
    return (
        <div
            data-testid="data-status-indicator"
            data-status={hasData ? 'loaded' : 'empty'}
            className="flex items-center"
            title={hasData ? "Simulation data loaded" : "No simulation data loaded"}
        >
            {hasData ? (
                <DatabaseZap className="w-4 h-4 text-green-500 dark:text-green-400" />
            ) : (
                <Database className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            )}
        </div>
    );
}
