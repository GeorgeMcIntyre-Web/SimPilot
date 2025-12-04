import { FlowerAccent } from '../FlowerAccent';
import { useTheme } from '../../ThemeContext';

export function AppLogo() {
    const { themeMode } = useTheme();
    const isFlower = themeMode === 'flower';
    const isProfessional = themeMode === 'professional';

    return (
        <div className="flex items-center">
            {isFlower ? (
                <FlowerAccent className="w-6 h-6 text-rose-400 mr-2 hover:rotate-12 transition-transform duration-300" />
            ) : isProfessional ? (
                <div className="w-8 h-8 mr-2 rounded-lg bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center text-xs font-bold tracking-wide">
                    SP
                </div>
            ) : (
                <FlowerAccent className="w-6 h-6 text-rose-400 mr-2" />
            )}
            <span className={isFlower
                ? "text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-emerald-600"
                : isProfessional
                    ? "text-xl font-semibold text-slate-900 dark:text-white tracking-tight"
                    : "text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-emerald-600"
            }>
                SimPilot
            </span>
        </div>
    );
}
