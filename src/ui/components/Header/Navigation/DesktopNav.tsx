import { useLocation } from 'react-router-dom';
import { NavLink } from './NavLink';
import { navItems } from './navItems';

export function DesktopNav() {
    const location = useLocation();

    return (
        <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
            {navItems.map((item) => {
                const isActive = location.pathname === item.href ||
                    (item.href !== '/' && location.pathname.startsWith(item.href));
                return (
                    <NavLink
                        key={item.href}
                        item={item}
                        isActive={isActive}
                    />
                );
            })}
        </nav>
    );
}
