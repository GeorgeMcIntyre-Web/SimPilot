import { ReactNode } from 'react';
import { FileQuestion } from 'lucide-react';
import { cn } from '../lib/utils';

interface EmptyStateProps {
    title: string;
    message?: string;
    ctaLabel?: string;
    onCtaClick?: () => void;
    icon?: ReactNode;
}

export function EmptyState({ title, message, ctaLabel, onCtaClick, icon }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border-2 border-dashed bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                {icon || <FileQuestion className="h-7 w-7" />}
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {title}
            </h3>

            {message && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-sm">
                    {message}
                </p>
            )}

            {ctaLabel && onCtaClick && (
                <button
                    onClick={onCtaClick}
                    className={cn(
                        "inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold shadow-sm",
                        "text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    )}
                >
                    {ctaLabel}
                </button>
            )}
        </div>
    );
}
