import { Outlet } from 'react-router-dom';
import { useHasSimulationData, useWarnings, useHasUnsyncedChanges, useLastUpdated, useDataSource } from '../../ui/hooks/useDomainData';
import { useMsAccount } from '../../integrations/ms/useMsAccount';
import { useAuth } from '../../auth';
import { useGlobalBusy } from '../../ui/GlobalBusyContext';
import { useTheme } from '../ThemeContext';
import { Header } from './Header';

export function LayoutShell() {
    const hasData = useHasSimulationData();
    const { enabled: msEnabled, isSignedIn, account, login, logout } = useMsAccount();
    const { user: googleUser, logout: googleLogout } = useAuth();
    const { state: busyState } = useGlobalBusy();
    const warnings = useWarnings();
    const { themeMode } = useTheme();
    const lastUpdated = useLastUpdated();
    const dataSource = useDataSource();
    const hasUnsyncedChanges = useHasUnsyncedChanges();
    console.log('LayoutShell render. hasData:', hasData);

    return (
        <div data-testid="app-shell" className="min-h-screen bg-slate-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col relative overflow-hidden">
            <Header
                hasData={hasData}
                themeMode={themeMode}
                busyState={busyState}
                lastUpdated={lastUpdated}
                dataSource={dataSource}
                warnings={warnings}
                hasUnsyncedChanges={hasUnsyncedChanges}
                googleUser={googleUser}
                googleLogout={googleLogout}
                msEnabled={msEnabled}
                msIsSignedIn={isSignedIn}
                msAccount={account}
                msLogin={login}
                msLogout={logout}
            />

            {/* Main Content */}
            <main className="flex-1 py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
