import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'danger' | 'ghost' | 'glass';

const variantClass: Record<Variant, string> = {
  primary:
    'font-display border-transparent bg-[var(--dost-primary)] text-white shadow-md shadow-[rgba(0,56,117,0.22)] hover:bg-[var(--dost-primary-dark)]',
  danger:
    'border-transparent bg-[var(--dost-primary-dark)] text-white shadow-md shadow-[rgba(0,56,117,0.25)] hover:bg-[var(--dost-primary)]',
  ghost:
    'border-[var(--dost-pale)] bg-white text-[var(--dost-primary-dark)] shadow-sm hover:bg-[var(--dost-wash)]',
  glass:
    'border-white/15 bg-white/10 text-white backdrop-blur-md hover:bg-white/15',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClass = {
  sm: 'px-3 py-1.5 text-xs rounded-xl',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-5 py-3 text-sm rounded-2xl',
};

export function Button({ variant = 'ghost', size = 'md', className, ...props }: Props) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 border font-semibold transition-all duration-200',
        'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        variantClass[variant],
        sizeClass[size],
        className
      )}
      {...props}
    />
  );
}
