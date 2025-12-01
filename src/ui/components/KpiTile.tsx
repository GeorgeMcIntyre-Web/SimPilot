import { ReactNode, HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

interface KpiTileProps extends HTMLAttributes<HTMLDivElement> {
    label: string;
    value: string | number;
    description?: string;
    icon?: ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    className?: string;
}

export function KpiTile({ label, value, description, icon, className, ...props }: KpiTileProps) {
    return (
        <div className={cn("bg-white dark:bg-gray-800 overflow-hidden rounded-lg shadow", className)} {...props}>
            <div className="p-5">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        {icon && <div className="text-gray-400">{icon}</div>}
                    </div>
                    <div className={cn("ml-0 w-0 flex-1", icon && "ml-5")}>
                        <dl>
                            <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
                            <dd>
                                <div className="text-lg font-medium text-gray-900 dark:text-white">{value}</div>
                            </dd>
                        </dl>
                    </div>
                </div>
            </div>
            {description && (
                <div className="bg-gray-50 dark:bg-gray-700/50 px-5 py-3">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {description}
                    </div>
                </div>
            )}
        </div>
    );
}
