import { Link } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { NavItem } from './types';

interface NavLinkProps {
    item: NavItem;
    isActive: boolean;
}

export function NavLink({ item, isActive }: NavLinkProps) {
    const Icon = item.icon;

    return (
        <Link
            to={item.href}
            data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
            className={cn(
                "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200",
                isActive
                    ? "border-slate-500 text-slate-900 dark:text-white"
                    : "border-transparent text-slate-600 dark:text-gray-300 hover:border-slate-300 hover:text-slate-900 dark:hover:text-gray-100 hover:bg-slate-100 dark:hover:bg-slate-800/70"
            )}
        >
            <Icon
                className={cn(
                    "w-4 h-4 mr-2 transition-colors",
                    isActive ? "text-slate-700" : "text-slate-500"
                )}
            />
            {item.label}
        </Link>
    );
}
