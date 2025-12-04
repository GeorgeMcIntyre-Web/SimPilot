import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { navItems } from './navItems';

interface MobileNavProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
    const location = useLocation();

    if (!isOpen) return null;

    return (
        <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            onClick={onClose}
                            className={cn(
                                "block pl-3 pr-4 py-2 border-l-4 text-base font-medium",
                                isActive
                                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300"
                                    : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 hover:text-gray-700"
                            )}
                        >
                            <div className="flex items-center">
                                <Icon className="w-5 h-5 mr-3" />
                                {item.label}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
