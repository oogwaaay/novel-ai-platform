import { useState } from 'react';
import { GlassCard } from './ui/GlassCard';
import { PrimaryButton } from './ui/PrimaryButton';
import { SecondaryButton } from './ui/SecondaryButton';
import { useSubscription } from '../hooks/useSubscription';
import { useCapabilities } from '../hooks/useCapabilities';
import { showToast } from '../utils/toast';
import { generateNovel } from '../api/novelApi';

const GENRE_OPTIONS = [
  { value: 'general-fiction', label: 'General Fiction' },
  { value: 'literary-fiction', label: 'Literary Fiction' },
  { value: 'historical-fiction', label: 'Historical Fiction' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'thriller', label: 'Thriller' },
  { value: 'horror', label: 'Horror / Suspense' },
  { value: 'romance', label: 'Romance' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'science-fiction', label: 'Science Fiction' },
  { value: 'dystopian', label: 'Dystopian' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'young-adult', label: 'Young Adult (YA)' },
  { value: 'comedy', label: 'Comedy / Humor' },
  { value: 'ai-themed', label: 'AI Themed / Novels About AI' },
  { value: 'fan-fiction', label: 'Fan Fiction' }
];

const LANGUAGE_CHOICES = [
  { value: 'english', label: 'English' },
  { value: 'spanish', label: 'Español' },
  { value: 'chinese', label: '中文' },
  { value: 'japanese', label: '日本語' },
  { value: 'auto', label: 'Auto' }
];

interface ProjectCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    genre: string;
    length: number;
    language: string;
    idea?: string;
  }) => Promise<void>;
}

export default function ProjectCreationWizard({
  isOpen,
  onClose,
  onCreate
}: ProjectCreationWizardProps) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('general-fiction');
  const [length, setLength] = useState(30);
  const [language, setLanguage] = useState('english');
  const [idea, setIdea] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  
  // Subscription and capabilities
  const subscription = useSubscription();
  const { hasFeature } = useCapabilities();
  const canUseAIAssistant = hasFeature('aiAssistant');

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 1 && title.trim()) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Expand idea using AI
  const handleExpandIdea = async () => {
    if (!idea.trim()) {
      showToast('Please enter a story idea first', 'error');
      return;
    }
    
    if (!canUseAIAssistant) {
      showToast('This feature is only available for Pro and Unlimited users', 'error');
      return;
    }
    
    setIsExpanding(true);
    try {
      // Call AI to expand the idea
      const expandedIdea = await generateNovel({
        genre: 'general-fiction',
        idea: idea.trim(),
        length: 1,
        type: 'outline'
      });
      
      setIdea(expandedIdea.content || idea);
      showToast('Idea expanded successfully!', 'success');
    } catch (error) {
      console.error('[ProjectCreationWizard] Failed to expand idea:', error);
      showToast('Failed to expand idea. Please try again.', 'error');
    } finally {
      setIsExpanding(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setIsCreating(true);
    try {
      console.log('[ProjectCreationWizard] Creating project with data:', {
        title: title.trim(),
        genre,
        length,
        language,
        idea: idea.trim() || undefined
      });
      
      await onCreate({
        title: title.trim(),
        genre,
        length,
        language,
        idea: idea.trim() || undefined
      });
      
      console.log('[ProjectCreationWizard] Project created successfully, closing wizard');
      
      // Reset form and close wizard
      setStep(1);
      setTitle('');
      setGenre('general-fiction');
      setLength(30);
      setLanguage('english');
      setIdea('');
      onClose();
    } catch (error) {
      console.error('[ProjectCreationWizard] Failed to create project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to create project: ${errorMessage}. Please check the console for details.`);
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setStep(1);
      setTitle('');
      setGenre('general-fiction');
      setLength(30);
      setLanguage('english');
      setIdea('');
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <GlassCard
        className="w-full max-w-2xl mx-4 p-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Create New Project</h2>
              <p className="text-sm text-slate-500 mt-1">
                Step {step} of 3
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isCreating}
              className="p-2 text-slate-400 hover:text-slate-600 transition disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-slate-900 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Project Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My Amazing Novel"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Genre
                </label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                >
                  {GENRE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Story Details */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Story Idea (Optional)
                </label>
                <div className="space-y-2">
                  <textarea
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="Describe your story idea, characters, or plot..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 min-h-[120px] resize-none"
                  />
                  {canUseAIAssistant && (
                    <SecondaryButton 
                      onClick={handleExpandIdea} 
                      disabled={isCreating || !idea.trim() || isExpanding}
                      className="w-full text-sm"
                    >
                      {isExpanding ? 'Expanding idea...' : '✨ Expand Idea with AI'}
                    </SecondaryButton>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Target Length (pages)
                  </label>
                  <input
                    type="number"
                    value={length}
                    onChange={(e) => setLength(Math.max(1, parseInt(e.target.value) || 30))}
                    min={1}
                    max={1000}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                  >
                    {LANGUAGE_CHOICES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-6 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Title
                  </p>
                  <p className="text-base text-slate-900">{title}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Genre
                  </p>
                  <p className="text-base text-slate-900">
                    {GENRE_OPTIONS.find((g) => g.value === genre)?.label || genre}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Target Length
                  </p>
                  <p className="text-base text-slate-900">{length} pages</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Language
                  </p>
                  <p className="text-base text-slate-900">
                    {LANGUAGE_CHOICES.find((l) => l.value === language)?.label || language}
                  </p>
                </div>
                {idea.trim() && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Story Idea
                    </p>
                    <p className="text-base text-slate-900">{idea}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div>
              {step > 1 && (
                <SecondaryButton onClick={handleBack} disabled={isCreating}>
                  Back
                </SecondaryButton>
              )}
            </div>
            <div className="flex items-center gap-3">
              <SecondaryButton onClick={handleClose} disabled={isCreating}>
                Cancel
              </SecondaryButton>
              {step < 3 ? (
                <PrimaryButton onClick={handleNext} disabled={step === 1 && !title.trim()}>
                  Next
                </PrimaryButton>
              ) : (
                <PrimaryButton onClick={handleCreate} disabled={isCreating || !title.trim()}>
                  {isCreating ? 'Creating...' : 'Create Project'}
                </PrimaryButton>
              )}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

