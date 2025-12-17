import React, { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  children?: ReactNode;
  asChild?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', asChild, ...props }, ref) => {
    const base = 
      'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all';
    
    if (asChild) {
      const Comp = (props.children as React.ReactElement);
      return React.cloneElement(Comp, {
        className: `${base} ${Comp.props.className || ''} ${className}`.trim(),
        ref,
        ...props,
      });
    }
    
    return (
      <input
        ref={ref}
        className={`${base} ${className}`.trim()}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
