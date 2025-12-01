import type { HTMLAttributes, ReactNode } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: ReactNode;
}

const baseClass =
  'bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl shadow-[var(--shadow-soft)]';

export function GlassCard({ className = '', children, ...props }: GlassCardProps) {
  return (
    <div className={`${baseClass} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}


