import { useTheme } from '../ThemeContext';

export function ThemeToggle() {
    const { themeMode } = useTheme();

    return (
        <div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100">
            {themeMode === 'professional' ? 'Professional' : 'Professional'}
        </div>
    );
}
