import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Props = HTMLAttributes<HTMLElement> & {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  variant?: 'bento' | 'flat';
};

export function Card({
  title,
  subtitle,
  children,
  variant = 'bento',
  className,
  ...props
}: Props) {
  return (
    <section
      className={cn(
        variant === 'bento' && 'bento-cell p-5',
        variant === 'flat' && 'rounded-2xl bg-white p-5 ring-1 ring-[var(--dost-pale)]',
        className
      )}
      {...props}
    >
      {(title || subtitle) && (
        <header className="relative z-[1] mb-4">
          {subtitle && (
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--dost-soft)]">
              {subtitle}
            </p>
          )}
          {title && (
            <h2 className="font-display text-lg font-bold tracking-tight text-[var(--dost-primary-dark)]">
              {title}
            </h2>
          )}
        </header>
      )}
      <div className="relative z-[1]">{children}</div>
    </section>
  );
}
