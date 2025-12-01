import { GlassCard } from './ui/GlassCard';
import { PrimaryButton } from './ui/PrimaryButton';

interface EmptyProjectGuideProps {
  projectTitle?: string;
  onStartWriting: () => void;
}

export default function EmptyProjectGuide({ projectTitle, onStartWriting }: EmptyProjectGuideProps) {
  return (
    <GlassCard className="p-8 text-center max-w-2xl mx-auto">
      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-semibold text-slate-900 mb-2">
            {projectTitle ? `Welcome to "${projectTitle}"` : 'Start Your Writing Journey'}
          </h3>
          <p className="text-slate-600">
            This is a new project. Follow these steps to get started:
          </p>
        </div>
        
        <ol className="text-left max-w-md mx-auto space-y-4">
          <li className="flex items-start gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-medium">1</span>
            <div>
              <p className="font-medium text-slate-900 mb-1">Describe your story idea</p>
              <p className="text-sm text-slate-600">In the "Story Brief" panel, describe your story idea (at least 20 words)</p>
            </div>
          </li>
          <li className="flex items-start gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-medium">2</span>
            <div>
              <p className="font-medium text-slate-900 mb-1">Configure project settings</p>
              <p className="text-sm text-slate-600">Choose genre, target length, and language</p>
            </div>
          </li>
          <li className="flex items-start gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-medium">3</span>
            <div>
              <p className="font-medium text-slate-900 mb-1">Start generating</p>
              <p className="text-sm text-slate-600">Click "Generate" and AI will create your story</p>
            </div>
          </li>
        </ol>
        
        <div className="pt-4">
          <PrimaryButton onClick={onStartWriting}>
            Start Writing Your Story
          </PrimaryButton>
        </div>
      </div>
    </GlassCard>
  );
}


