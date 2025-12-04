import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

interface WarningsIndicatorProps {
    warningCount: number;
}

export function WarningsIndicator({ warningCount }: WarningsIndicatorProps) {
    if (warningCount === 0) return null;

    return (
        <Link
            to="/warnings"
            className="flex items-center text-yellow-600 dark:text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors"
            title={`${warningCount} warnings`}
        >
            <AlertTriangle className="w-5 h-5" />
            <span className="ml-1 text-xs font-bold">{warningCount}</span>
        </Link>
    );
}
