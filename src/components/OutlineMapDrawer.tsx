import type { Chapter } from '../api/novelApi';
import type { OutlineMapPayload } from './OutlinePreview';

interface OutlineMapDrawerProps {
  open: boolean;
  data: OutlineMapPayload | null;
  onClose: () => void;
  onSendToDraft: (chapters: Chapter[], mode: 'replace' | 'append') => void;
}

const FORMAT_TEMPLATE = `### Part 1: Setup
*第1章* 开场
- 主角/背景/冲突
- 反派伏笔

### Part 2: Rising tension
*第2章* 升温
- 阶段性目标
- 转折或挫败`;

export default function OutlineMapDrawer({ open, data, onClose, onSendToDraft }: OutlineMapDrawerProps) {
  if (!open || !data) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-sm">
      <div className="h-full w-full max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-600">Outline map</p>
            <h3 className="text-lg font-semibold text-slate-900">Sections overview</h3>
            <p className="text-xs text-slate-500 mt-1">
              {data.totalSections} sections · {data.totalBeats} beats
            </p>
          </div>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">
            Close
          </button>
        </div>

        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 mb-2">Import options</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onSendToDraft(data.outlineChapters, 'replace')}
              className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800"
            >
              Replace current draft
            </button>
            <button
              onClick={() => onSendToDraft(data.outlineChapters, 'append')}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50"
            >
              Append to draft
            </button>
          </div>
          {data.isRaw && (
            <p className="mt-3 text-xs text-amber-600">
              Raw outline detected. Consider using the format tips below for automatic section detection.
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {data.sections.map((section) => (
            <div key={section.title} className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Section</p>
                  <h4 className="text-sm font-semibold text-slate-900">{section.title}</h4>
                </div>
                <span className="text-xs text-slate-500">{section.beats} beats</span>
              </div>
              <p className="mt-3 text-sm text-slate-600 max-h-16 overflow-hidden">
                {section.description || 'No description'}
              </p>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Format tips</p>
              <p className="text-sm text-slate-600">Use headings + bullet beats for best results.</p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(FORMAT_TEMPLATE)}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
              Copy template
            </button>
          </div>
          <pre className="rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-700 p-4 whitespace-pre-wrap">
            {FORMAT_TEMPLATE}
          </pre>
        </div>
      </div>
    </div>
  );
}

