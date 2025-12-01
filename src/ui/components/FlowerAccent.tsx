import { useTheme } from '../ThemeContext';
import { cn } from '../lib/utils';

export function FlowerAccent({ className = "w-5 h-5" }: { className?: string }) {
    const { themeMode } = useTheme();

    if (themeMode === 'standard') {
        return null;
    }

    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
                "motion-safe:animate-float",
                className
            )}
            aria-hidden="true"
        >
            <path d="M12 7.5a4.5 4.5 0 1 1 4.5 4.5M12 7.5A4.5 4.5 0 1 0 7.5 12M12 7.5V9m0 9v3m0-3a4.5 4.5 0 1 1-4.5-4.5M12 18a4.5 4.5 0 1 0 4.5-4.5M12 18v-1.5m0-9v-3" />
            <circle cx="12" cy="12" r="2" />
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" className="opacity-10" stroke="none" fill="currentColor" />
        </svg>
    );
}
