import type { HTMLAttributes, ReactNode } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: ReactNode;
}

const baseClass =
  'bg-white/80 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 rounded-3xl shadow-[var(--shadow-soft)]';

export function GlassCard({ className = '', children, ...props }: GlassCardProps) {
  return (
    <div className={`${baseClass} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}


