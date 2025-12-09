import { useTheme } from '../ThemeContext';
import { cn } from '../lib/utils';
import { Sparkles } from 'lucide-react';

interface PageHintProps {
    standardText: string;
    flowerText: string;
    className?: string;
}

export function PageHint({ standardText, flowerText, className }: PageHintProps) {
    const { themeMode } = useTheme();

    return themeMode === 'flower' ? (
        <p className={cn(
            "text-sm font-medium text-rose-600 dark:text-rose-300 mt-1 flex items-center gap-2 animate-fade-in",
            className
        )}>
            <Sparkles className="w-3 h-3 text-rose-400 motion-safe:animate-pulse" aria-hidden="true" />
            {flowerText}
        </p>
    ) : (
        <p className={cn("text-sm text-gray-500 dark:text-gray-400 mt-1", className)}>
            {standardText}
        </p>
    );
}
