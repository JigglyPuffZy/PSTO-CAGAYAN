import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

const controlLight =
  'w-full rounded-xl border border-[var(--dost-pale)] bg-white px-4 py-3 text-[15px] text-[var(--dost-primary-dark)] shadow-sm outline-none transition-all placeholder:text-[var(--dost-soft)] focus:border-[var(--dost-primary)] focus:ring-4 focus:ring-[var(--dost-primary)]/12';

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm font-semibold text-[var(--dost-primary-dark)]">{children}</span>
  );
}

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlLight, className)} {...props} />;
}

export function SelectInput({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlLight, className)} {...props} />;
}

export function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-2', className)}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </label>
  );
}

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-2xl bg-[var(--dost-wash)] p-2 ring-1 ring-[var(--dost-pale)]',
        className
      )}
    >
      {children}
    </div>
  );
}

export const filterInputClass =
  'min-w-[140px] flex-1 rounded-xl border-0 bg-white px-3 py-2 text-sm text-[var(--dost-primary-dark)] shadow-sm ring-1 ring-[var(--dost-pale)] outline-none focus:ring-2 focus:ring-[var(--dost-primary)]/30';
