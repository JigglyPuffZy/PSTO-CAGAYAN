import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  centered?: boolean;
  eyebrow?: string;
  size?: 'default' | 'hero';
};

export function PageHeader({
  title,
  description,
  actions,
  centered,
  eyebrow,
  size = 'default',
}: Props) {
  return (
    <header
      className={cn(
        'mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        centered && 'text-center sm:flex-col sm:items-center'
      )}
    >
      <div className={cn(centered && 'max-w-2xl', 'animate-fade-up')}>
        {eyebrow && (
          <p className="dost-eyebrow mb-2 inline-flex items-center gap-2">
            <span className="h-px w-6 bg-gradient-to-r from-[var(--dost-primary)] to-transparent" />
            {eyebrow}
          </p>
        )}
        <h1
          className={cn(
            'font-display font-extrabold tracking-tight text-[var(--dost-primary-dark)]',
            size === 'hero' ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'
          )}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-xl text-base leading-relaxed text-[var(--dost-muted)]">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0 animate-fade-up">{actions}</div>}
    </header>
  );
}
