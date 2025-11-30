import { cn } from '../lib/utils';
import { ProjectStatus, CellStatus } from '../../domain/types';

type StatusType = ProjectStatus | CellStatus | string;

interface StatusPillProps {
    status: StatusType;
    className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
    const getStatusStyles = (s: string) => {
        const normalized = s.toUpperCase().replace(/_/g, '');

        switch (normalized) {
            // Project Statuses
            case 'PLANNING':
            case 'NOTSTARTED':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            case 'ACTIVE':
            case 'RUNNING':
            case 'INPROGRESS':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'ONHOLD':
            case 'BLOCKED':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            case 'COMPLETED':
            case 'APPROVED':
            case 'READYFORAPPROVAL':
            case 'READYFORREVIEW':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const formatStatus = (s: string) => {
        return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                getStatusStyles(status),
                className
            )}
        >
            {formatStatus(status)}
        </span>
    );
}
