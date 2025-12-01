import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface SecondaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  asChild?: boolean;
}

export function SecondaryButton({ children, className = '', asChild, ...props }: SecondaryButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-slate-700 border border-slate-200 bg-white/70 hover:bg-white transition-all';
  if (asChild) {
    const Comp = children as React.ReactElement;
    return React.cloneElement(Comp, {
      className: `${base} ${Comp.props.className || ''} ${className}`.trim(),
      ...props,
    });
  }
  return (
    <button className={`${base} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}


