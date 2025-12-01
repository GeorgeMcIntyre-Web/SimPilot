import { useTheme } from '../ThemeContext';
import { FlowerAccent } from './FlowerAccent';
import { FileQuestion } from 'lucide-react';
import { cn } from '../lib/utils';

interface FlowerEmptyStateProps {
    title: string;
    message?: string;
    ctaLabel?: string;
    onCtaClick?: () => void;
}

export function FlowerEmptyState({ title, message, ctaLabel, onCtaClick }: FlowerEmptyStateProps) {
    const { themeMode } = useTheme();

    return (
        <div className={cn(
            "flex flex-col items-center justify-center p-8 text-center rounded-lg border-2 border-dashed transition-colors duration-500",
            themeMode === 'flower'
                ? "bg-rose-50/50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-900/30"
                : "bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700"
        )}>
            <div className="mb-4">
                {themeMode === 'flower' ? (
                    <div className="relative">
                        <span className="text-4xl animate-bounce-slow inline-block" role="img" aria-hidden="true">🌸</span>
                        <FlowerAccent className="absolute -bottom-2 -right-2 w-6 h-6 text-rose-400" />
                    </div>
                ) : (
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                        <FileQuestion className="w-8 h-8 text-gray-400" />
                    </div>
                )}
            </div>

            <h3 className={cn(
                "text-lg font-medium mb-1 transition-colors",
                themeMode === 'flower' ? "text-rose-900 dark:text-rose-100" : "text-gray-900 dark:text-gray-100"
            )}>
                {title}
            </h3>

            {message && (
                <p className={cn(
                    "text-sm mb-6 max-w-sm transition-colors",
                    themeMode === 'flower' ? "text-rose-700 dark:text-rose-300" : "text-gray-500 dark:text-gray-400"
                )}>
                    {message}
                </p>
            )}

            {ctaLabel && onCtaClick && (
                <button
                    onClick={onCtaClick}
                    className={cn(
                        "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors",
                        themeMode === 'flower'
                            ? "text-white bg-rose-500 hover:bg-rose-600 focus:ring-rose-500"
                            : "text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                    )}
                >
                    {ctaLabel}
                </button>
            )}
        </div>
    );
}
