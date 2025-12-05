import { Loader2 } from 'lucide-react';

interface BusyIndicatorProps {
    isBusy: boolean;
    label?: string;
}

export function BusyIndicator({ isBusy, label }: BusyIndicatorProps) {
    if (!isBusy) return null;

    return (
        <div className="flex items-center text-blue-600 dark:text-blue-400 animate-pulse">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            <span className="text-xs font-medium">{label || 'Processing...'}</span>
        </div>
    );
}
