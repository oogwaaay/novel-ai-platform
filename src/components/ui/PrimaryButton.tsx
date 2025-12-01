import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  asChild?: boolean;
}

export function PrimaryButton({ children, className = '', asChild, ...props }: PrimaryButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-[var(--shadow-soft)]';
  if (asChild) {
    const Comp = (children as React.ReactElement);
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


