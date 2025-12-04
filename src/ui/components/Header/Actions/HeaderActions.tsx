import { ThemeToggle } from '../../ThemeToggle';
import { BusyIndicator } from './BusyIndicator';
import { WarningsIndicator } from './WarningsIndicator';
import { UnsyncedChangesIndicator } from './UnsyncedChangesIndicator';

interface HeaderActionsProps {
    busyState: { isBusy: boolean; label?: string };
    lastUpdated: number | string | null;
    dataSource: string | null;
    warningCount: number;
    hasUnsyncedChanges: boolean;
}

export function HeaderActions({
    busyState,
    warningCount,
    hasUnsyncedChanges,
}: HeaderActionsProps) {
    return (
        <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="hidden md:block">
                <ThemeToggle />
            </div>

            <BusyIndicator isBusy={busyState.isBusy} label={busyState.label} />

            <WarningsIndicator warningCount={warningCount} />

            <UnsyncedChangesIndicator hasUnsyncedChanges={hasUnsyncedChanges} />
        </div>
    );
}
