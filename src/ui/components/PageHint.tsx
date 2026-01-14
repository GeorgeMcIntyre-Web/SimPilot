import { cn } from '../lib/utils';

interface PageHintProps {
    standardText: string;
    flowerText: string;
    className?: string;
}

export function PageHint({ standardText, className }: PageHintProps) {
    return (
        <p className={cn("text-sm text-gray-500 dark:text-gray-400 mt-1", className)}>
            {standardText}
        </p>
    );
}
