interface DataStatusIndicatorProps {
    hasData: boolean;
}

export function DataStatusIndicator({ hasData }: DataStatusIndicatorProps) {
    return (
        <div
            data-testid="data-status-indicator"
            data-status={hasData ? 'loaded' : 'empty'}
            className={`flex items-center px-2 py-0.5 rounded-full border ${
                hasData
                    ? 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800'
                    : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}
            title={hasData ? "Simulation data loaded" : "No simulation data loaded"}
        >
            <div
                className={`h-2 w-2 rounded-full mr-1.5 ${
                    hasData ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`}
            />
            <span
                className={`text-xs font-medium ${
                    hasData
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-gray-500 dark:text-gray-400'
                }`}
            >
                {hasData ? 'Data Loaded' : 'No Data'}
            </span>
        </div>
    );
}
