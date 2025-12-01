import { useMemo, useState } from 'react';
import type { StyleTemplate } from '../types/templates';
import type { WritingStyle } from '../types/style';

interface StyleTemplateLibraryProps {
  customTemplates: StyleTemplate[];
  onChange: (templates: StyleTemplate[]) => void;
  onApply: (template: StyleTemplate) => void;
  onSaveCurrent: () => void;
  canSaveCurrent: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
}

const BUILT_IN_TEMPLATES: StyleTemplate[] = [
  {
    id: 'tpl-literary-elegance',
    name: 'Literary Elegance',
    description: 'Rich imagery, introspective tone, longer sentences.',
    builtIn: true,
    style: {
      name: 'Literary Elegance',
      preset: 'literary',
      updatedAt: Date.now()
    },
    createdAt: Date.now()
  },
  {
    id: 'tpl-commercial-thriller',
    name: 'Commercial Thriller',
    description: 'Fast pacing, short sentences, suspense-driven.',
    builtIn: true,
    style: {
      name: 'Commercial Thriller',
      preset: 'commercial',
      customTraits: ['Tone: intense', 'Pacing: fast', 'Sentence length: short'],
      updatedAt: Date.now()
    },
    createdAt: Date.now()
  },
  {
    id: 'tpl-experimental-poetic',
    name: 'Experimental Poetic',
    description: 'Lyrical voice, free-form structure, vivid metaphors.',
    builtIn: true,
    style: {
      name: 'Experimental Poetic',
      preset: 'experimental',
      customTraits: ['Tone: poetic', 'Sentence length: long', 'Vocabulary: complex'],
      updatedAt: Date.now()
    },
    createdAt: Date.now()
  }
];

const TemplateCard = ({
  template,
  onApply,
  onDelete
}: {
  template: StyleTemplate;
  onApply: () => void;
  onDelete?: () => void;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 h-full flex flex-col justify-between">
    <div>
      <p className="text-sm font-semibold text-slate-900">{template.name}</p>
      <p className="text-xs text-slate-500 mt-1">{template.description}</p>
    </div>
    <div className="flex items-center justify-between mt-3">
      <button
        onClick={onApply}
        className="text-xs font-semibold text-slate-900 hover:text-slate-700"
      >
        Apply
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          className="text-xs text-rose-500 hover:text-rose-600"
        >
          Delete
        </button>
      )}
    </div>
  </div>
);

export default function StyleTemplateLibrary({
  customTemplates,
  onChange,
  onApply,
  onSaveCurrent,
  canSaveCurrent,
  isCollapsed,
  onToggle
}: StyleTemplateLibraryProps) {
  const [search, setSearch] = useState('');

  const allTemplates = useMemo(() => [...BUILT_IN_TEMPLATES, ...customTemplates], [customTemplates]);

  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return allTemplates;
    const term = search.trim().toLowerCase();
    return allTemplates.filter(
      (tpl) =>
        tpl.name.toLowerCase().includes(term) ||
        tpl.description.toLowerCase().includes(term)
    );
  }, [search, allTemplates]);

  const handleDelete = (id: string) => {
    onChange(customTemplates.filter((tpl) => tpl.id !== id));
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Style Templates</p>
          <p className="text-sm text-slate-500">
            {customTemplates.length} saved · {BUILT_IN_TEMPLATES.length} presets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSaveCurrent}
            disabled={!canSaveCurrent}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 disabled:opacity-50"
          >
            Save current
          </button>
          <button
            onClick={onToggle}
            className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900"
            aria-label={isCollapsed ? 'Expand template library' : 'Collapse template library'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="sr-only">Search templates</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-slate-200"
            />
          </div>
          {filteredTemplates.length === 0 ? (
            <p className="text-sm text-slate-500">No templates found.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onApply={() => onApply(template)}
                  onDelete={!template.builtIn ? () => handleDelete(template.id) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}




