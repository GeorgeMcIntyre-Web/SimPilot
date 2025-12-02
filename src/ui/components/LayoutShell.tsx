import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Wrench, Upload, Menu, Users, LogOut, Calendar, Box, LayoutGrid } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState } from 'react';
import { useHasSimulationData, useWarnings, useHasUnsyncedChanges, useLastUpdated, useDataSource } from '../../ui/hooks/useDomainData';
import { useMsAccount } from '../../integrations/ms/useMsAccount';
import { useAuth } from '../../auth';
import { useGlobalBusy } from '../../ui/GlobalBusyContext';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { FlowerAccent } from './FlowerAccent';
import { useTheme } from '../ThemeContext';
import { ThemeToggle } from './ThemeToggle';

export function LayoutShell() {
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const hasData = useHasSimulationData();
    const { enabled: msEnabled, isSignedIn, account, login, logout } = useMsAccount();
    const { user: googleUser, logout: googleLogout } = useAuth();
    const { state: busyState } = useGlobalBusy();
    const warnings = useWarnings();
    const { themeMode } = useTheme();
    const lastUpdated = useLastUpdated();
    const dataSource = useDataSource();
    console.log('LayoutShell render. hasData:', hasData);

    const navItems = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/simulation', label: 'Simulation', icon: LayoutGrid },
        { href: '/projects', label: 'Projects', icon: FolderKanban },
        { href: '/projects-by-customer', label: 'By Customer', icon: FolderKanban },
        { href: '/readiness', label: 'Readiness', icon: Calendar },
        { href: '/engineers', label: 'Engineers', icon: Users },
        { href: '/tools', label: 'Tools', icon: Wrench },
        { href: '/assets', label: 'Assets', icon: Box },
        { href: '/data-loader', label: 'Data Loader', icon: Upload },
    ];

    return (
        <div data-testid="app-shell" className="min-h-screen bg-slate-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col relative overflow-hidden">
            {/* Header */}
            <header className={cn(
                "border-b sticky top-0 z-10 transition-colors duration-500",
                themeMode === 'flower'
                    ? "bg-gradient-to-r from-rose-50 via-white to-emerald-50 dark:from-gray-800 dark:to-gray-800 border-rose-100 dark:border-gray-700"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            )}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center space-x-3">
                                <div className="flex items-center">
                                    <FlowerAccent className="w-6 h-6 text-rose-400 mr-2 hover:rotate-12 transition-transform duration-300" />
                                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-emerald-600">
                                        SimPilot
                                    </span>
                                </div>
                                <div
                                    data-testid="data-status-indicator"
                                    data-status={hasData ? 'loaded' : 'empty'}
                                    className={`flex items-center px-2 py-0.5 rounded-full border ${hasData ? 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                                    title={hasData ? "Simulation data loaded" : "No simulation data loaded"}
                                >
                                    <div className={`h-2 w-2 rounded-full mr-1.5 ${hasData ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                                    <span className={`text-xs font-medium ${hasData ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {hasData ? 'Data Loaded' : 'No Data'}
                                    </span>
                                </div>
                            </div>
                            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.href ||
                                        (item.href !== '/' && location.pathname.startsWith(item.href));
                                    return (
                                        <Link
                                            key={item.href}
                                            to={item.href}
                                            data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                                            className={cn(
                                                "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200",
                                                isActive
                                                    ? (themeMode === 'flower' ? "border-rose-500 text-gray-900 dark:text-white" : "border-blue-500 text-gray-900 dark:text-white")
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
                                })}
                            </nav>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="hidden md:block">
                                <ThemeToggle />
                            </div>

                            {/* Busy Indicator */}
                            {busyState.isBusy && (
                                <div className="flex items-center text-blue-600 dark:text-blue-400 animate-pulse">
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    <span className="text-xs font-medium">{busyState.label || 'Processing...'}</span>
                                </div>
                            )}

                            {/* Last Updated Indicator */}
                            {lastUpdated && dataSource && (
                                <div className="hidden md:flex flex-col items-end mr-4 text-xs text-gray-500 dark:text-gray-400" title={`Last updated: ${new Date(lastUpdated).toLocaleString()}`}>
                                    <span className="font-medium">{dataSource}</span>
                                    <span className="text-[10px]">{new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            )}

                            {/* Warnings Indicator */}
                            {warnings.length > 0 && (
                                <Link
                                    to="/warnings"
                                    className="flex items-center text-yellow-600 dark:text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors"
                                    title={`${warnings.length} warnings`}
                                >
                                    <AlertTriangle className="w-5 h-5" />
                                    <span className="ml-1 text-xs font-bold">{warnings.length}</span>
                                </Link>
                            )}

                            {/* Unsynced Changes Indicator */}
                            {useHasUnsyncedChanges() && (
                                <Link
                                    to="/changes"
                                    className="flex items-center text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-400 transition-colors ml-4"
                                    title="Unsynced changes"
                                >
                                    <div className="relative">
                                        <Upload className="w-5 h-5" />
                                        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                                    </div>
                                    <span className="ml-1 text-xs font-bold hidden sm:inline">Sync</span>
                                </Link>
                            )}

                            <div className="flex items-center">
                                {/* Google Auth User Display */}
                                {googleUser && (
                                    <div className="hidden sm:flex items-center ml-4 border-l border-gray-200 dark:border-gray-700 pl-4">
                                        <div className="flex items-center space-x-3">
                                            {googleUser.picture && (
                                                <img
                                                    src={googleUser.picture}
                                                    alt={googleUser.name || 'User'}
                                                    className="w-7 h-7 rounded-full border-2 border-rose-200 dark:border-rose-700"
                                                />
                                            )}
                                            <span
                                                className="text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[150px] truncate"
                                                title={googleUser.email}
                                            >
                                                {googleUser.name || googleUser.email || 'User'}
                                            </span>
                                            <button
                                                onClick={googleLogout}
                                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                title="Sign out"
                                            >
                                                <LogOut className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Microsoft Auth UI */}
                                {msEnabled && (
                                    <div className="hidden sm:flex items-center ml-4 border-l border-gray-200 dark:border-gray-700 pl-4">
                                        {!isSignedIn ? (
                                            <button
                                                onClick={() => login()}
                                                className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                                            >
                                                Sign in with Microsoft
                                            </button>
                                        ) : (
                                            <div className="flex items-center space-x-3">
                                                <div className="flex items-center space-x-2" title={account?.username}>
                                                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[150px] truncate">
                                                        MS: {account?.name || account?.username}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => logout()}
                                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                    title="Sign out"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Mobile menu button */}
                                <div className="-mr-2 flex items-center sm:hidden ml-4">
                                    <button
                                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                        className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                                    >
                                        <span className="sr-only">Open main menu</span>
                                        <Menu className="block h-6 w-6" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {isMobileMenuOpen && (
                    <div className="sm:hidden">
                        <div className="pt-2 pb-3 space-y-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        to={item.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
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

                            {/* Mobile Google Auth */}
                            {googleUser && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 pb-3">
                                    <div className="px-4 space-y-1">
                                        <div className="flex items-center space-x-3">
                                            {googleUser.picture && (
                                                <img
                                                    src={googleUser.picture}
                                                    alt={googleUser.name || 'User'}
                                                    className="w-8 h-8 rounded-full border-2 border-rose-200 dark:border-rose-700"
                                                />
                                            )}
                                            <div>
                                                <div className="text-base font-medium text-gray-800 dark:text-gray-200">
                                                    {googleUser.name || 'User'}
                                                </div>
                                                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {googleUser.email}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                googleLogout();
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className="block w-full text-left mt-2 text-base font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                        >
                                            Sign out
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Mobile MS Auth */}
                            {msEnabled && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 pb-3">
                                    {!isSignedIn ? (
                                        <button
                                            onClick={() => {
                                                login();
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                        >
                                            Sign in with Microsoft
                                        </button>
                                    ) : (
                                        <div className="px-4 space-y-1">
                                            <div className="text-base font-medium text-gray-800 dark:text-gray-200">
                                                {account?.name || account?.username}
                                            </div>
                                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                {account?.username}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    logout();
                                                    setIsMobileMenuOpen(false);
                                                }}
                                                className="block w-full text-left mt-1 text-base font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                            >
                                                Sign out
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="flex-1 py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
