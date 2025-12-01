import { ReactNode, HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

interface KpiTileProps extends HTMLAttributes<HTMLDivElement> {
    label: string;
    value: string | number;
    description?: string;
    icon?: ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    className?: string;
    /** Progress percentage (0-100) for circular progress ring */
    progress?: number;
    /** Progress status for color coding */
    status?: 'success' | 'warning' | 'danger';
}

export function KpiTile({
    label,
    value,
    description,
    icon,
    className,
    progress,
    status = 'success',
    ...props
}: KpiTileProps) {
    // SVG circle math
    const size = 56
    const strokeWidth = 4
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const progressOffset = progress !== undefined
        ? circumference - (progress / 100) * circumference
        : 0

    // Color coding based on status
    const progressColor = {
        success: 'text-emerald-500',
        warning: 'text-yellow-500',
        danger: 'text-rose-500'
    }[status]

    const ringColor = {
        success: 'stroke-emerald-500',
        warning: 'stroke-yellow-500',
        danger: 'stroke-rose-500'
    }[status]

    return (
        <div className={cn("bg-white dark:bg-gray-800 overflow-hidden rounded-lg shadow hover:shadow-md transition-shadow", className)} {...props}>
            <div className="p-5">
                <div className="flex items-center">
                    <div className="flex-shrink-0 relative">
                        {icon && progress !== undefined ? (
                            // Icon with circular progress ring
                            <div className="relative">
                                <svg className="transform -rotate-90" width={size} height={size}>
                                    {/* Background circle */}
                                    <circle
                                        cx={size / 2}
                                        cy={size / 2}
                                        r={radius}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={strokeWidth}
                                        className="text-gray-200 dark:text-gray-700"
                                    />
                                    {/* Progress circle */}
                                    <circle
                                        cx={size / 2}
                                        cy={size / 2}
                                        r={radius}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={strokeWidth}
                                        strokeDasharray={circumference}
                                        strokeDashoffset={progressOffset}
                                        className={cn(ringColor, "transition-all duration-500 ease-out")}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                {/* Icon centered in circle */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className={cn("text-gray-600 dark:text-gray-300", progress && progressColor)}>
                                        {icon}
                                    </div>
                                </div>
                            </div>
                        ) : icon ? (
                            // Icon only (no progress)
                            <div className="text-gray-400">{icon}</div>
                        ) : null}
                    </div>
                    <div className={cn("ml-0 w-0 flex-1", icon && "ml-5")}>
                        <dl>
                            <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
                            <dd>
                                <div className="text-xl font-bold text-gray-900 dark:text-white">{value}</div>
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
