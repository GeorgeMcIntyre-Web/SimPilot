import { Link } from 'react-router-dom';
import { Upload } from 'lucide-react';

interface UnsyncedChangesIndicatorProps {
    hasUnsyncedChanges: boolean;
}

export function UnsyncedChangesIndicator({ hasUnsyncedChanges }: UnsyncedChangesIndicatorProps) {
    if (!hasUnsyncedChanges) return null;

    return (
        <Link
            to="/changes"
            className="flex items-center text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-400 transition-colors"
            title="Unsynced changes"
        >
            <div className="relative">
                <Upload className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
            </div>
            <span className="ml-1 text-xs font-bold hidden sm:inline">Sync</span>
        </Link>
    );
}
