import { type ComponentProps } from 'react';

export function Card({ className = '', ...props }: ComponentProps<'section'>) {
  return (
    <section
      {...props}
      className={`rounded-xl border border-slate-200 p-4 ${className}`}
    />
  );
}
