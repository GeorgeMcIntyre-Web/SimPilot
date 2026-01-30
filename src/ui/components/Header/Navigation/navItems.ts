import {
    LayoutDashboard,
    Bot,
    Workflow,
    OctagonAlert,
    Building2,
    CalendarCheck,
    Users,
    Wrench,
    Package,
    FileUp,
    Clock
} from 'lucide-react';
import { NavItem } from './types';

export const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/robot-simulation', label: 'Status', icon: Bot },
    { href: '/simulation', label: 'Simulation', icon: Workflow },
    { href: '/tooling-bottlenecks', label: 'Bottlenecks', icon: OctagonAlert },
    { href: '/projects', label: 'Projects', icon: Building2 },
    { href: '/readiness', label: 'Readiness', icon: CalendarCheck },
    { href: '/engineers', label: 'Engineers', icon: Users },
    { href: '/tools', label: 'Tools', icon: Wrench },
    { href: '/assets', label: 'Assets', icon: Package },
    { href: '/data-loader', label: 'Data Loader', icon: FileUp },
    { href: '/import-history', label: 'Import History', icon: Clock },
];
