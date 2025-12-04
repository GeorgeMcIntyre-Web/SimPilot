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
                        : "border-blue-500 text-gray-900 dark:text-white")
                    : (themeMode === 'flower'
                        ? "border-transparent text-gray-500 dark:text-gray-400 hover:border-rose-300 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-rose-50/50"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50"
                    )
            )}
        >
            <Icon className="w-4 h-4 mr-2" />
            {item.label}
        </Link>
    );
}
