import React, { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children?: ReactNode;
  asChild?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', asChild, ...props }, ref) => {
    const base = 
      'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all cursor-pointer appearance-none pr-8';
    
    if (asChild) {
      const Comp = (props.children as React.ReactElement);
      return React.cloneElement(Comp, {
        className: `${base} ${Comp.props.className || ''} ${className}`.trim(),
        ref,
        ...props,
      });
    }
    
    return (
      <div className="relative">
        <select
          ref={ref}
          className={`${base} ${className}`.trim()}
          {...props}
        >
          {props.children}
        </select>
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4"/>
          </svg>
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';
