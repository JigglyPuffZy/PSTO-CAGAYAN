import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mx-auto max-w-[1440px] px-4 py-8 pb-24 md:pb-10 lg:px-8',
        className
      )}
    >
      {children}
    </div>
  );
}
