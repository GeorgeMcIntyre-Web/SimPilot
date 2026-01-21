import { ReactNode } from 'react';

export interface InfoPillProps {
    label: string;
    value?: string;
    tone?: 'warn' | 'ok' | 'muted';
    icon?: ReactNode;
    onEdit?: () => void;
    editing?: boolean;
    editContent?: ReactNode;
}

export function InfoPill({ label, value, tone, icon, onEdit, editing, editContent }: InfoPillProps) {
    const toneClasses = tone === 'warn'
        ? 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
        : tone === 'ok'
            ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200';

    return (
        <div className={`rounded border px-3 py-2 ${toneClasses}`}>
            <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                    {icon}
                    {label}
                </span>
                {onEdit && !editing && (
                    <button
                        onClick={onEdit}
                        className="text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold"
                    >
                        Edit
                    </button>
                )}
            </div>
            <div className="mt-1 text-sm font-bold text-gray-900 dark:text-white truncate">
                {editing ? editContent : (value || '—')}
            </div>
        </div>
    );
}
