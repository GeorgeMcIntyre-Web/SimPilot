import { useTheme } from '../ThemeContext';
import { FlowerAccent } from './FlowerAccent';
import { cn } from '../lib/utils';

export function ThemeToggle() {
    const { themeMode, setThemeMode } = useTheme();

    return (
        <button
            onClick={() => setThemeMode(themeMode === 'flower' ? 'standard' : 'flower')}
            className={cn(
                "relative inline-flex items-center h-8 rounded-full w-36 px-1 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500",
                themeMode === 'flower'
                    ? "bg-rose-100 dark:bg-rose-900/30 hover:shadow-[0_0_10px_rgba(251,113,133,0.4)] hover:scale-[1.02]"
                    : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            )}
            title={themeMode === 'flower' ? "Switch to Standard Mode" : "Switch to Dale's Garden"}
            aria-label="Toggle theme mode"
        >
            <span className="sr-only">
                {themeMode === 'flower' ? "Switch to Standard Mode" : "Switch to Dale's Garden"}
            </span>

            {/* Slider */}
            <span
                className={cn(
                    "inline-block w-6 h-6 transform bg-white rounded-full shadow transition-transform duration-200 ease-in-out flex items-center justify-center",
                    themeMode === 'flower' ? "translate-x-28" : "translate-x-0"
                )}
            >
                {themeMode === 'flower' ? (
                    <FlowerAccent className="w-4 h-4 text-rose-500 hover:rotate-45 transition-transform duration-500" />
                ) : (
                    <div className="w-4 h-4 rounded-full bg-gray-400" />
                )}
            </span>

            {/* Labels */}
            <span className={cn(
                "absolute text-xs font-medium transition-opacity duration-200",
                themeMode === 'flower'
                    ? "left-3 text-rose-700 dark:text-rose-300 opacity-100"
                    : "left-3 text-gray-500 opacity-0"
            )}>
                Dale's Garden
            </span>
            <span className={cn(
                "absolute text-xs font-medium transition-opacity duration-200",
                themeMode === 'flower'
                    ? "right-3 text-gray-500 opacity-0"
                    : "right-3 text-gray-600 dark:text-gray-300 opacity-100"
            )}>
                Standard
            </span>
        </button>
    );
}
