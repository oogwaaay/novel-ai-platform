interface LoadingIndicatorProps {
  variant?: 'spinner' | 'progress' | 'dots';
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  progress?: number; // 0-100 for progress variant
  className?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  variant = 'spinner',
  size = 'md',
  text,
  progress,
  className
}) => {
  // Size mappings
  const sizeMap = {
    sm: {
      spinner: 'h-6 w-6',
      dots: 'h-4 w-4',
      progress: 'h-2',
      text: 'text-sm'
    },
    md: {
      spinner: 'h-10 w-10',
      dots: 'h-6 w-6',
      progress: 'h-3',
      text: 'text-base'
    },
    lg: {
      spinner: 'h-16 w-16',
      dots: 'h-8 w-8',
      progress: 'h-4',
      text: 'text-lg'
    }
  };

  const currentSize = sizeMap[size];

  const renderSpinner = () => (
    <div className={`flex flex-col items-center justify-center ${className || ''}`}>
      <div className={`inline-block animate-spin rounded-full border-4 border-current border-t-transparent ${currentSize.spinner}`} role="status">
        <span className="sr-only">Loading...</span>
      </div>
      {text && <p className={`mt-2 text-center text-slate-600 dark:text-slate-300 ${currentSize.text}`}>{text}</p>}
    </div>
  );

  const renderProgress = () => {
    const progressValue = Math.min(Math.max(progress || 0, 0), 100);
    
    return (
      <div className={`flex flex-col gap-2 ${className || ''}`}>
        <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden ${currentSize.progress}`}>
          <div 
            className="bg-slate-800 dark:bg-blue-500 h-full rounded-full transition-all duration-300 ease-out" 
            style={{ width: `${progressValue}%` }}
          />
        </div>
        {text && <p className={`text-center text-slate-600 dark:text-slate-300 ${currentSize.text}`}>{text}</p>}
      </div>
    );
  };

  const renderDots = () => (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <div className={`inline-block animate-bounce rounded-full bg-slate-800 dark:bg-slate-300 ${currentSize.dots}`}>
        <span className="sr-only">Loading...</span>
      </div>
      <div className={`inline-block animate-bounce rounded-full bg-slate-800 dark:bg-slate-300 ${currentSize.dots}`} style={{ animationDelay: '0.2s' }}>
        <span className="sr-only">Loading...</span>
      </div>
      <div className={`inline-block animate-bounce rounded-full bg-slate-800 dark:bg-slate-300 ${currentSize.dots}`} style={{ animationDelay: '0.4s' }}>
        <span className="sr-only">Loading...</span>
      </div>
      {text && <span className={`ml-2 text-slate-600 dark:text-slate-300 ${currentSize.text}`}>{text}</span>}
    </div>
  );

  switch (variant) {
    case 'spinner':
      return renderSpinner();
    case 'progress':
      return renderProgress();
    case 'dots':
      return renderDots();
    default:
      return renderSpinner();
  }
};

export default LoadingIndicator;