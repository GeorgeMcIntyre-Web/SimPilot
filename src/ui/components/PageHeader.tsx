import { ReactNode } from 'react';

interface PageHeaderProps {
    title: ReactNode;
    subtitle?: ReactNode;
    actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
    return (
        <div className="md:flex md:items-center md:justify-between mb-8">
            <div className="min-w-0 flex-1">
                <h2 className="typography-title sm:truncate">
                    {title}
                </h2>
                {subtitle && (
                    <div className="mt-1 typography-subtitle">
                        {subtitle}
                    </div>
                )}
            </div>
            {actions && (
                <div className="mt-4 flex md:ml-4 md:mt-0">
                    {actions}
                </div>
            )}
        </div>
    );
}
