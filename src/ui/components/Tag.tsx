import { cn } from '../lib/utils';

interface TagProps {
    label: string;
    color?: 'blue' | 'gray' | 'green' | 'red' | 'yellow' | 'purple';
    className?: string;
}

export function Tag({ label, color = 'gray', className }: TagProps) {
    const colorStyles = {
        gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    };

    return (
        <span
            className={cn(
                "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
                colorStyles[color],
                className
            )}
        >
            {label}
        </span>
    );
}
