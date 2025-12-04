import { useTheme, type ThemeMode } from '../ThemeContext';
import { FlowerAccent } from './FlowerAccent';
import { cn } from '../lib/utils';

const modes: ThemeMode[] = ['flower', 'standard', 'professional'];
const labels: Record<ThemeMode, string> = {
    flower: "Dale's Flow",
    standard: 'Standard',
    professional: 'Professional'
};

export function ThemeToggle() {
    const { themeMode, setThemeMode } = useTheme();

    const handleClick = (mode: ThemeMode) => setThemeMode(mode);

    return (
        <div className="inline-flex items-center rounded-full bg-gray-200 dark:bg-gray-700 p-1 shadow-inner gap-1">
            {modes.map((mode) => {
                const isActive = themeMode === mode;
                const baseClasses = "px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-2 transition-all";

                return (
                    <button
                        key={mode}
                        type="button"
                        onClick={() => handleClick(mode)}
                        className={cn(
                            baseClasses,
                            isActive
                                ? (mode === 'flower'
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200 shadow"
                                    : mode === 'professional'
                                        ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 shadow"
                                        : "bg-white text-gray-900 dark:bg-gray-600 dark:text-white shadow")
                                : "text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-600/60"
                        )}
                        title={`Switch to ${labels[mode]} mode`}
                    >
                        {mode === 'flower' && (
                            <FlowerAccent className="w-4 h-4 text-rose-500" />
                        )}
                        {mode === 'standard' && (
                            <span className="w-4 h-4 rounded-full bg-gray-400 inline-block" aria-hidden="true" />
                        )}
                        {mode === 'professional' && (
                            <span className="w-4 h-4 rounded-full bg-slate-500 inline-block" aria-hidden="true" />
                        )}
                        {labels[mode]}
                    </button>
                );
            })}
        </div>
    );
}
