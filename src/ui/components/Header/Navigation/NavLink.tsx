import { Link } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { NavItem } from './types';
import { ThemeMode } from '../../../ThemeContext';

interface NavLinkProps {
    item: NavItem;
    isActive: boolean;
    themeMode: ThemeMode;
}

export function NavLink({ item, isActive, themeMode }: NavLinkProps) {
    const Icon = item.icon;

    return (
        <Link
            to={item.href}
            data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
            className={cn(
                "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200",
                isActive
                    ? (themeMode === 'flower'
                        ? "border-rose-500 text-gray-900 dark:text-white"
                        : themeMode === 'professional'
                            ? "border-slate-500 text-slate-900 dark:text-white"
                            : "border-blue-500 text-gray-900 dark:text-white")
                    : (themeMode === 'flower'
                        ? "border-transparent text-gray-500 dark:text-gray-400 hover:border-rose-300 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-rose-50/50"
                        : themeMode === 'professional'
                            ? "border-transparent text-slate-600 dark:text-gray-300 hover:border-slate-300 hover:text-slate-900 dark:hover:text-gray-100 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                            : "border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50"
                    )
            )}
        >
            <Icon
                className={cn(
                    "w-4 h-4 mr-2 transition-colors",
                    themeMode === 'flower'
                        ? "text-rose-500"
                        : themeMode === 'professional'
                            ? isActive ? "text-slate-700" : "text-slate-500"
                            : isActive ? "text-blue-600" : "text-gray-500"
                )}
            />
            {item.label}
        </Link>
    );
}
