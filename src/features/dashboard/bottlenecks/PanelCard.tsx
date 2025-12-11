import type { HTMLAttributes } from 'react';
import { cn } from '../../../ui/lib/utils';

interface PanelCardProps extends HTMLAttributes<HTMLDivElement> {}

export function PanelCard({ className, ...rest }: PanelCardProps) {
  return (
    <section
      className={cn(
        'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm',
        className
      )}
      {...rest}
    />
  );
}
