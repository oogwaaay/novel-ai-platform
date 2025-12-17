import React, { forwardRef, type LabelHTMLAttributes, type ReactNode } from 'react';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
  asChild?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ children, className = '', asChild, ...props }, ref) => {
    const base = 
      'block text-sm font-medium text-slate-900 dark:text-white mb-1.5';
    
    if (asChild) {
      const Comp = (children as React.ReactElement);
      return React.cloneElement(Comp, {
        className: `${base} ${Comp.props.className || ''} ${className}`.trim(),
        ref,
        ...props,
      });
    }
    
    return (
      <label
        ref={ref}
        className={`${base} ${className}`.trim()}
        {...props}
      >
        {children}
      </label>
    );
  }
);

Label.displayName = 'Label';
