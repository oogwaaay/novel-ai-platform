import React, { forwardRef, type TextareaHTMLAttributes, type ReactNode } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  children?: ReactNode;
  asChild?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', asChild, ...props }, ref) => {
    const base = 
      'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all resize-none';
    
    if (asChild) {
      const Comp = (props.children as React.ReactElement);
      return React.cloneElement(Comp, {
        className: `${base} ${Comp.props.className || ''} ${className}`.trim(),
        ref,
        ...props,
      });
    }
    
    return (
      <textarea
        ref={ref}
        className={`${base} ${className}`.trim()}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
