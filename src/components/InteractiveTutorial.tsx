import { useState, useEffect, ReactNode } from 'react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface InteractiveTutorialProps {
  steps: TutorialStep[];
  onComplete?: () => void;
  isOpen: boolean;
  onClose: () => void;
  children?: ReactNode;
}

const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({ 
  steps, 
  onComplete, 
  isOpen, 
  onClose,
  children 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetPosition, setTargetPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Get target element position
  const updateTargetPosition = () => {
    if (!isOpen || currentStep >= steps.length) return;
    
    const target = document.querySelector(steps[currentStep].targetSelector);
    if (target) {
      const rect = target.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      
      setTargetPosition({
        top: rect.top + scrollY,
        left: rect.left + scrollX,
        width: rect.width,
        height: rect.height
      });
    }
  };

  // Update position on step change or window resize
  useEffect(() => {
    updateTargetPosition();
    
    const handleResize = () => updateTargetPosition();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [currentStep, isOpen]);

  // Reset tutorial when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setIsPaused(false);
    }
  }, [isOpen]);

  // Navigate to next step
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
      onClose();
    }
  };

  // Navigate to previous step
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Skip tutorial
  const skipTutorial = () => {
    onClose();
  };

  if (!isOpen) {
    return <>{children}</>;
  }

  const step = steps[currentStep];
  const position = step.position || 'bottom';

  // Calculate tooltip position based on target and preferred position
  let tooltipStyle: React.CSSProperties = { top: 0, left: 0 };
  if (targetPosition) {
    switch (position) {
      case 'top':
        tooltipStyle = {
          top: targetPosition.top - 10,
          left: targetPosition.left + targetPosition.width / 2,
          transform: 'translate(-50%, -100%)'
        };
        break;
      case 'bottom':
        tooltipStyle = {
          top: targetPosition.top + targetPosition.height + 10,
          left: targetPosition.left + targetPosition.width / 2,
          transform: 'translate(-50%, 0)'
        };
        break;
      case 'left':
        tooltipStyle = {
          top: targetPosition.top + targetPosition.height / 2,
          left: targetPosition.left - 10,
          transform: 'translate(-100%, -50%)'
        };
        break;
      case 'right':
        tooltipStyle = {
          top: targetPosition.top + targetPosition.height / 2,
          left: targetPosition.left + targetPosition.width + 10,
          transform: 'translate(0, -50%)'
        };
        break;
    }
  }

  return (
    <>
      {children}
      
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={() => setIsPaused(!isPaused)}
      />
      
      {/* Highlight */}
      {targetPosition && !isPaused && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{
            top: targetPosition.top,
            left: targetPosition.left,
            width: targetPosition.width,
            height: targetPosition.height,
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
          }}
        />
      )}
      
      {/* Tooltip */}
      {!isPaused && (
        <div 
          className="fixed z-50 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg shadow-xl p-6 max-w-md"
          style={tooltipStyle}
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-semibold">{step.title}</h3>
            <button 
              onClick={skipTutorial}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <p className="text-slate-600 dark:text-slate-300 mb-6">{step.description}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {steps.map((_, index) => (
                <div 
                  key={index} 
                  className={`w-2 h-2 rounded-full transition-colors ${index === currentStep ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                />
              ))}
            </div>
            
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button 
                  onClick={prevStep}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Previous
                </button>
              )}
              
              <button 
                onClick={nextStep}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Pause overlay */}
      {isPaused && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 text-center max-w-md">
            <h3 className="text-xl font-semibold mb-4">Tutorial Paused</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">Click Resume to continue the tutorial.</p>
            <button 
              onClick={() => setIsPaused(false)}
              className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Resume
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InteractiveTutorial;