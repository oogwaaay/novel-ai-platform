import { useState, useEffect } from 'react';
import type { StoryTemplate } from '../data/storyTemplates';

interface StoryTemplateEditorProps {
  template?: StoryTemplate | null;
  onSave: (template: StoryTemplate) => void;
  onCancel: () => void;
  isOpen: boolean;
}

const GENRE_OPTIONS = [
  'ai-themed',
  'romance',
  'fantasy',
  'thriller',
  'mystery',
  'horror',
  'science-fiction',
  'historical-fiction',
  'literary-fiction',
  'young-adult',
  'dystopian',
  'adventure',
  'general-fiction',
  'comedy'
];

const COLOR_PRESETS = [
  { from: '#dbeafe', to: '#f8fafc', name: 'Blue' },
  { from: '#fde2e4', to: '#fff7ed', name: 'Pink' },
  { from: '#ede9fe', to: '#faf5ff', name: 'Purple' },
  { from: '#e0f2fe', to: '#eef2ff', name: 'Sky' },
  { from: '#1e293b', to: '#475569', name: 'Dark' },
  { from: '#1e1e2e', to: '#2d2d44', name: 'Darker' },
  { from: '#0f172a', to: '#1e293b', name: 'Navy' },
  { from: '#78350f', to: '#92400e', name: 'Brown' },
  { from: '#4c1d95', to: '#6d28d9', name: 'Violet' },
  { from: '#64748b', to: '#94a3b8', name: 'Gray' },
  { from: '#f59e0b', to: '#fbbf24', name: 'Amber' },
  { from: '#7c3aed', to: '#a855f7', name: 'Purple Bright' },
  { from: '#991b1b', to: '#dc2626', name: 'Red' },
  { from: '#065f46', to: '#047857', name: 'Green' },
  { from: '#ec4899', to: '#f472b6', name: 'Pink Bright' },
  { from: '#312e81', to: '#4338ca', name: 'Indigo' },
  { from: '#92400e', to: '#b45309', name: 'Orange' },
  { from: '#1e40af', to: '#2563eb', name: 'Blue Bright' },
  { from: '#374151', to: '#4b5563', name: 'Slate' },
  { from: '#581c87', to: '#7c3aed', name: 'Purple Dark' },
  { from: '#7f1d1d', to: '#991b1b', name: 'Red Dark' },
  { from: '#1e1b4b', to: '#312e81', name: 'Indigo Dark' },
  { from: '#0c4a6e', to: '#075985', name: 'Cyan Dark' },
  { from: '#fef3c7', to: '#fde68a', name: 'Yellow' },
  { from: '#451a03', to: '#78350f', name: 'Brown Dark' }
];

export default function StoryTemplateEditor({ template, onSave, onCancel, isOpen }: StoryTemplateEditorProps) {
  const [formData, setFormData] = useState<Partial<StoryTemplate>>({
    id: '',
    title: '',
    subtitle: '',
    genre: 'general-fiction',
    sampleIdea: '',
    tones: [],
    cover: {
      title: '',
      author: '',
      colorFrom: '#dbeafe',
      colorTo: '#f8fafc'
    }
  });

  const [toneInput, setToneInput] = useState('');

  useEffect(() => {
    if (template) {
      setFormData(template);
      setToneInput(template.tones.join(', '));
    } else {
      // Reset to defaults for new template
      setFormData({
        id: '',
        title: '',
        subtitle: '',
        genre: 'general-fiction',
        sampleIdea: '',
        tones: [],
        cover: {
          title: '',
          author: '',
          colorFrom: '#dbeafe',
          colorTo: '#f8fafc'
        }
      });
      setToneInput('');
    }
  }, [template, isOpen]);

  const handleSave = () => {
    if (!formData.title || !formData.subtitle || !formData.sampleIdea) {
      alert('Please fill in all required fields (title, subtitle, sample idea).');
      return;
    }

    const tones = toneInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const savedTemplate: StoryTemplate = {
      id: template?.id || crypto.randomUUID(),
      title: formData.title,
      subtitle: formData.subtitle,
      genre: formData.genre || 'general-fiction',
      sampleIdea: formData.sampleIdea,
      tones: tones.length > 0 ? tones : ['General'],
      cover: {
        title: formData.cover?.title || formData.title,
        author: formData.cover?.author || 'Author',
        colorFrom: formData.cover?.colorFrom || '#dbeafe',
        colorTo: formData.cover?.colorTo || '#f8fafc'
      }
    };

    onSave(savedTemplate);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {template ? 'Edit Story Template' : 'Create Story Template'}
          </h3>
          <button
            onClick={onCancel}
            className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            aria-label="Close dialog"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Title *
            </label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-slate-200"
              placeholder="e.g., AI Thriller"
            />
          </div>

          {/* Subtitle */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Subtitle *
            </label>
            <input
              type="text"
              value={formData.subtitle || ''}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-slate-200"
              placeholder="e.g., High-stakes techno drama"
            />
          </div>

          {/* Genre */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Genre *
            </label>
            <select
              value={formData.genre || 'general-fiction'}
              onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-slate-200"
            >
              {GENRE_OPTIONS.map(genre => (
                <option key={genre} value={genre}>
                  {genre.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Sample Idea */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Sample Idea *
            </label>
            <textarea
              value={formData.sampleIdea || ''}
              onChange={(e) => setFormData({ ...formData, sampleIdea: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-slate-200 min-h-[120px]"
              placeholder="A compelling story idea that will inspire users..."
            />
          </div>

          {/* Tones */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Tones (comma-separated)
            </label>
            <input
              type="text"
              value={toneInput}
              onChange={(e) => setToneInput(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-slate-200"
              placeholder="e.g., High-tension techno, Noir investigation, Philosophical sci-fi"
            />
            <p className="text-xs text-slate-400">Separate multiple tones with commas</p>
          </div>

          {/* Cover Colors */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Cover Colors
            </label>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    cover: {
                      ...formData.cover!,
                      colorFrom: preset.from,
                      colorTo: preset.to
                    }
                  })}
                  className={`h-12 rounded-xl border-2 transition ${
                    formData.cover?.colorFrom === preset.from
                      ? 'border-slate-900 ring-2 ring-slate-200'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`
                  }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          {/* Cover Title & Author (Optional) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Cover Title (Optional)
              </label>
              <input
                type="text"
                value={formData.cover?.title || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  cover: {
                    ...formData.cover!,
                    title: e.target.value
                  }
                })}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-slate-200"
                placeholder="Cover title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Cover Author (Optional)
              </label>
              <input
                type="text"
                value={formData.cover?.author || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  cover: {
                    ...formData.cover!,
                    author: e.target.value
                  }
                })}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-slate-200"
                placeholder="Author name"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Preview
            </label>
            <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
              <div className="flex justify-center mb-4">
                <div className="relative h-32 w-24">
                  <div
                    className="absolute -left-2 top-2 bottom-2 w-2 rounded-l-lg shadow-inner"
                    style={{
                      background: `linear-gradient(180deg, ${formData.cover?.colorFrom || '#dbeafe'}, ${formData.cover?.colorTo || '#f8fafc'})`,
                    }}
                  />
                  <div
                    className="relative h-full w-full rounded-xl border border-white shadow-lg overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${formData.cover?.colorFrom || '#dbeafe'}, ${formData.cover?.colorTo || '#f8fafc'})`,
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-black/20" />
                  </div>
                </div>
              </div>
              <h4 className="text-base font-semibold text-slate-900 mb-1">
                {formData.title || 'Template Title'}
              </h4>
              <p className="text-sm text-slate-500 mb-2">
                {formData.subtitle || 'Template subtitle'}
              </p>
              <p className="text-xs text-slate-400 uppercase tracking-[0.3em]">
                {formData.genre || 'genre'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {template ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
}



