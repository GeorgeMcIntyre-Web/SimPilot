import {
    LayoutDashboard,
    FolderKanban,
    Wrench,
    Upload,
    Users,
    Calendar,
    Box,
    LayoutGrid,
    Activity,
    History,
    AlertTriangle
} from 'lucide-react';
import { NavItem } from './types';

export const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/simulation-2', label: 'Simulation-2', icon: LayoutGrid },
    { href: '/simulation', label: 'Simulation', icon: LayoutGrid },
    { href: '/tooling-bottlenecks', label: 'Bottlenecks', icon: AlertTriangle },
    { href: '/projects', label: 'Projects', icon: FolderKanban },
    { href: '/projects-by-customer', label: 'By Customer', icon: FolderKanban },
    { href: '/readiness', label: 'Readiness', icon: Calendar },
    { href: '/engineers', label: 'Engineers', icon: Users },
    { href: '/tools', label: 'Tools', icon: Wrench },
    { href: '/assets', label: 'Assets', icon: Box },
    { href: '/data-health', label: 'Data Health', icon: Activity },
    { href: '/data-loader', label: 'Data Loader', icon: Upload },
    { href: '/import-history', label: 'Import History', icon: History },
];
