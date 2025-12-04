interface LastUpdatedIndicatorProps {
    lastUpdated: number | string | null;
    dataSource: string | null;
}

export function LastUpdatedIndicator({ lastUpdated, dataSource }: LastUpdatedIndicatorProps) {
    if (!lastUpdated || !dataSource) return null;

    return (
        <div
            className="hidden md:flex flex-col items-end text-xs text-gray-500 dark:text-gray-400"
            title={`Last updated: ${new Date(lastUpdated).toLocaleString()}`}
        >
            <span className="font-medium">{dataSource}</span>
            <span className="text-[10px]">
                {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        </div>
    );
}
