import React, { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface RadioProps extends InputHTMLAttributes<HTMLInputElement> {
  children?: ReactNode;
  asChild?: boolean;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className = '', asChild, ...props }, ref) => {
    const base = 
      'rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all cursor-pointer h-4 w-4';
    
    if (asChild) {
      const Comp = (props.children as React.ReactElement);
      return React.cloneElement(Comp, {
        className: `${base} ${Comp.props.className || ''} ${className}`.trim(),
        ref,
        type: 'radio',
        ...props,
      });
    }
    
    return (
      <input
        ref={ref}
        type="radio"
        className={`${base} ${className}`.trim()}
        {...props}
      />
    );
  }
);

Radio.displayName = 'Radio';
