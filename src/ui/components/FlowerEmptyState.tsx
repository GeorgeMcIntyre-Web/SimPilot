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
            <div className="mb-6">
                {themeMode === 'flower' ? (
                    <div className="relative flex items-center justify-center">
                        {/* Big beautiful cherry blossom */}
                        <svg
                            viewBox="0 0 120 120"
                            className="w-32 h-32 animate-bounce-slow"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                        >
                            {/* Realistic cherry blossom - BIG */}
                            <g transform="translate(60, 40)">
                                {/* Outer petals - larger */}
                                <ellipse cx="0" cy="-12" rx="10" ry="16" fill="#FBCFE8" opacity="0.95" transform="rotate(-20 0 -12)" />
                                <ellipse cx="11" cy="-6" rx="10" ry="16" fill="#FBCFE8" opacity="0.95" transform="rotate(20 11 -6)" />
                                <ellipse cx="11" cy="6" rx="10" ry="16" fill="#FBCFE8" opacity="0.95" transform="rotate(70 11 6)" />
                                <ellipse cx="0" cy="12" rx="10" ry="16" fill="#FBCFE8" opacity="0.95" transform="rotate(110 0 12)" />
                                <ellipse cx="-11" cy="6" rx="10" ry="16" fill="#FBCFE8" opacity="0.95" transform="rotate(160 -11 6)" />
                                <ellipse cx="-11" cy="-6" rx="10" ry="16" fill="#FBCFE8" opacity="0.95" transform="rotate(200 -11 -6)" />
                                {/* Inner petals */}
                                <ellipse cx="0" cy="0" rx="7" ry="10" fill="#F9A8D4" opacity="0.98" transform="rotate(45 0 0)" />
                                <ellipse cx="0" cy="0" rx="7" ry="10" fill="#F9A8D4" opacity="0.98" transform="rotate(-45 0 0)" />
                                {/* Center */}
                                <circle cx="0" cy="0" r="5" fill="#F472B6" />
                                <circle cx="0" cy="0" r="2.5" fill="#EC4899" />
                            </g>
                            {/* Stem */}
                            <path d="M 60 58 L 60 100" stroke="#10B981" strokeWidth="4" strokeLinecap="round" />
                            {/* Leaves */}
                            <ellipse cx="45" cy="80" rx="8" ry="6" fill="#10B981" opacity="0.8" transform="rotate(-30 45 80)" />
                            <ellipse cx="75" cy="88" rx="8" ry="6" fill="#10B981" opacity="0.8" transform="rotate(30 75 88)" />
                        </svg>
                        {/* Additional small flowers for decoration */}
                        <FlowerAccent className="absolute -top-4 -left-4 w-10 h-10 text-rose-300 opacity-70" />
                        <FlowerAccent className="absolute -bottom-4 -right-4 w-8 h-8 text-pink-300 opacity-60" />
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
