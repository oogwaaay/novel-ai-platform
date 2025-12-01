import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StoryTemplate } from '../data/storyTemplates';
import { FLOW_MODE_OPTIONS, WRITING_FORMAT_OPTIONS } from '../data/storyTemplates';
import { saveUserPreferences } from '../utils/userPreferences';

interface FlowGuideDrawerProps {
  open: boolean;
  template: StoryTemplate | null;
  onClose: () => void;
  onSaved?: () => void;
  onSkipped?: () => void;
  onQuickStart?: (template: StoryTemplate) => void;
}

export default function FlowGuideDrawer({ open, template, onClose, onSaved, onSkipped, onQuickStart }: FlowGuideDrawerProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [writingType, setWritingType] = useState(WRITING_FORMAT_OPTIONS[0].id);
  const [flowMode, setFlowMode] = useState<'outline' | 'draft' | 'hybrid'>('outline');
  const [tone, setTone] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const toneOptions = useMemo(() => template?.tones ?? [], [template]);

  const reset = () => {
    setStep(0);
    setFlowMode('outline');
    setTone(null);
    setWritingType(WRITING_FORMAT_OPTIONS[0].id);
    setCompleted(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSkip = () => {
    reset();
    onSkipped?.();
    onClose();
  };

  const handleNext = () => {
    if (step === 1) {
      if (!template) return;
      const preference = {
        templateId: template.id,
        templateTitle: template.title,
        genre: template.genre,
        preferredFormat: writingType,
        flowMode,
        tone: tone || 'Any tone',
        sampleIdea: template.sampleIdea,
        savedAt: Date.now()
      };
      saveUserPreferences(preference);
      setCompleted(true);
      onSaved?.();
    } else {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (step === 0) {
      handleClose();
    } else {
      setStep((prev) => prev - 1);
    }
  };

  const launchGenerator = (mode: 'outline' | 'draft') => {
    if (!template) return;
    const params = new URLSearchParams({
      entry: 'flow-guide',
      mode,
      genre: template.genre,
      idea: template.sampleIdea,
      template: template.id
    });
    navigate(`/generator?${params.toString()}`);
    handleClose();
  };

  if (!open || !template) {
    return null;
  }

  const steps = [
    {
      title: 'What format would you like to write?',
      description: 'Pick the closest format and we’ll adjust the workspace template accordingly.',
      content: (
        <div className="space-y-3">
          {WRITING_FORMAT_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setWritingType(option.id)}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                writingType === option.id ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">{option.label}</p>
              <p className="text-xs text-slate-500 mt-1">
                {option.id === 'screenplay'
                  ? 'Scene-based, camera-first structure'
                  : option.id === 'serial'
                  ? 'Perfect for long-form serials or outlines'
                  : 'Chapter-driven output'}
              </p>
            </button>
          ))}
        </div>
      )
    },
    {
      title: 'How should the AI assist you?',
      description: 'Choose your default flow. Add an optional tone so the draft feels closer to your vibe.',
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            {FLOW_MODE_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setFlowMode(option.id as 'outline' | 'draft' | 'hybrid')}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  flowMode === option.id ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                <p className="text-xs text-slate-500 mt-1">{option.description}</p>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Tone (optional)</p>
            <div className="flex flex-wrap gap-2">
              {toneOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setTone(option)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    tone === option ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {option}
                </button>
              ))}
              <button
                onClick={() => setTone(null)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  tone === null ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                Skip tone
              </button>
            </div>
          </div>
        </div>
      )
    }
  ];

  const progress = ((completed ? 3 : step) / 3) * 100;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-sm">
      <div className="h-full w-full max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-600">Personalize</p>
            <h3 className="text-lg font-semibold text-slate-900">{template.title}</h3>
            <p className="text-xs text-slate-500">{template.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSkip} className="text-xs text-slate-400 hover:text-slate-600">
              Skip for now
            </button>
            <button onClick={handleClose} className="text-sm text-slate-500 hover:text-slate-700">
              Close
            </button>
          </div>
        </div>

        <div className="px-6 pt-4">
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {!completed ? (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            <div>
              <h4 className="text-xl font-semibold text-slate-900">{steps[step].title}</h4>
              <p className="text-sm text-slate-500 mt-2">{steps[step].description}</p>
            </div>
            {steps[step].content}
            
            {/* Quick Start option at step 0 */}
            {step === 0 && onQuickStart && template && (
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    onQuickStart(template);
                    handleClose();
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white transition"
                >
                  Quick Start (Skip Setup)
                </button>
                <p className="text-xs text-slate-500 mt-2 text-center">
                  Jump straight to Generator with default settings
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            <div>
              <h4 className="text-xl font-semibold text-slate-900">All set!</h4>
              <p className="text-sm text-slate-500 mt-2">Your preferences have been saved—jump back in anytime.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm text-slate-600">
              <p>
                Template: <span className="font-semibold">{template.title}</span>
              </p>
              <p>
                Flow:{' '}
                <span className="font-semibold">
                  {flowMode === 'outline' ? 'Outline-first' : flowMode === 'draft' ? 'Draft-first' : 'Hybrid'}
                </span>
              </p>
              <p>
                Tone: <span className="font-semibold">{tone}</span>
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => launchGenerator(flowMode === 'outline' ? 'outline' : 'draft')}
                className="w-full rounded-2xl bg-indigo-600 text-white px-4 py-3 text-sm font-semibold hover:bg-indigo-500"
              >
                Start writing with these settings
              </button>
              <button
                onClick={() => launchGenerator('outline')}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Outline only
              </button>
            </div>
          </div>
        )}

        {!completed && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <button onClick={handleBack} className="text-sm text-slate-500 hover:text-slate-700">
              {step === 0 ? 'Cancel' : 'Back'}
            </button>
            <button
              onClick={handleNext}
              className="rounded-2xl bg-indigo-600 text-white px-6 py-2 text-sm font-semibold hover:bg-indigo-500"
            >
              {step === 1 ? 'Save preference' : 'Next'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

