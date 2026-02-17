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
} from 'lucide-react'
import { NavItem } from './types'

export const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: Building2 },
  { href: '/robot-simulation', label: 'Robots Status', icon: Bot },
  { href: '/readiness', label: 'Readiness', icon: CalendarCheck },
  { href: '/engineers', label: 'Engineers', icon: Users },
  { href: '/assets', label: 'Assets', icon: Package },
  { href: '/simulation', label: 'Simulation', icon: Workflow },
  { href: '/tooling-bottlenecks', label: 'Bottlenecks', icon: OctagonAlert },
  { href: '/tools', label: 'Tools', icon: Wrench },
  { href: '/data-loader', label: 'Data Loader', icon: FileUp },
]
