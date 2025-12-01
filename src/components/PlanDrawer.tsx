import { ReactNode } from 'react';

interface PlanDrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function PlanDrawer({ open, onClose, children }: PlanDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/30 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative h-full w-full max-w-md bg-white shadow-2xl border-l border-slate-200 px-6 py-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Plan</p>
            <h3 className="text-2xl font-light text-slate-900">Your membership</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition"
            aria-label="Close plan drawer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}


