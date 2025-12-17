import React, { useState, useEffect } from 'react';
import type { AiAction } from '../api/novelApi';
import AIActionMenu from './AIActionMenu';

interface AIAssistantDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedText?: string;
  onAction?: (action: AiAction) => void;
  canUseAssistant: boolean;
  requiredTier: string;
  currentTier?: string | null;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
  action?: AiAction;
}

export default function AIAssistantDrawer({ 
  open, 
  onClose, 
  selectedText, 
  onAction,
  canUseAssistant,
  requiredTier,
  currentTier
}: AIAssistantDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  // Check if it's first time using AI Assistant
  useEffect(() => {
    if (open) {
      const hasUsedAssistant = localStorage.getItem('hasUsedAIAssistant');
      if (!hasUsedAssistant) {
        setShowOnboarding(true);
      }
    }
  }, [open]);

  // Clear selected text when drawer opens
  useEffect(() => {
    if (open && selectedText) {
      setInputText(selectedText);
    }
  }, [open, selectedText]);

  const handleFinishOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('hasUsedAIAssistant', 'true');
  };

  const handleNextStep = () => {
    if (onboardingStep < 2) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      handleFinishOnboarding();
    }
  };

  const handleSkipOnboarding = () => {
    handleFinishOnboarding();
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    // Add user message
    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: `I've analyzed your request. Here's how I can help: ${inputText}`,
        sender: 'ai',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleAction = (action: AiAction) => {
    if (onAction) {
      onAction(action);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">AI Assistant</h2>
            <p className="text-sm text-slate-500">Get help with your writing</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message History */}
        <div className="flex-1 p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="py-6 text-slate-500">
              <div className="text-center mb-8">
                <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <h3 className="text-lg font-medium text-slate-700 mb-2">How can I help you today?</h3>
                <div className="text-sm space-y-2">
                  <p>Option 1: <strong>Select text</strong> in your document (click and drag with your mouse), then use the AI actions below.</p>
                  <p>Option 2: Type a direct request in the input field at the bottom.</p>
                </div>
              </div>
              
              {/* Usage Examples */}
              <div className="bg-slate-50 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Try these examples:</h4>
                <div className="space-y-3">
                  <button 
                    onClick={() => setInputText("Rewrite this paragraph to be more descriptive")}
                    className="w-full text-left px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    Rewrite paragraph
                  </button>
                  <button 
                    onClick={() => setInputText("Adjust the tone of this text to be more formal")}
                    className="w-full text-left px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    Adjust tone
                  </button>
                  <button 
                    onClick={() => setInputText("Suggest ways to improve this plot")}
                    className="w-full text-left px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    Suggest plot improvements
                  </button>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${message.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  <p className="text-sm">{message.text}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-lg p-3 max-w-[80%]">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Onboarding Overlay */}
        {showOnboarding && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-20">
            <div className="max-w-md w-full">
              {/* Step Indicators */}
              <div className="flex items-center justify-center mb-8">
                {[0, 1, 2].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${onboardingStep === step ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {step + 1}
                    </div>
                    {step < 2 && (
                      <div className={`h-0.5 flex-grow mx-2 ${onboardingStep > step ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
                    )}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              <div className="text-center mb-8">
                {onboardingStep === 0 && (
                  <>
                    <svg className="w-16 h-16 mx-auto mb-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    <h3 className="text-xl font-semibold mb-2">Welcome to AI Assistant!</h3>
                    <p className="text-slate-600">I can help you improve your writing with AI-powered suggestions. Let me show you how to use me.</p>
                  </>
                )}

                {onboardingStep === 1 && (
                  <>
                    <svg className="w-16 h-16 mx-auto mb-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <h3 className="text-xl font-semibold mb-2">Step 1: Select Text</h3>
                    <p className="text-slate-600">Select any text in your document to get AI suggestions. I'll help you rewrite, adjust tone, or get plot ideas.</p>
                  </>
                )}

                {onboardingStep === 2 && (
                  <>
                    <svg className="w-16 h-16 mx-auto mb-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    <h3 className="text-xl font-semibold mb-2">Step 2: Choose Action</h3>
                    <p className="text-slate-600">Use the buttons below to select an AI action, or type your request in the input field. I'll generate helpful suggestions for you.</p>
                  </>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleSkipOnboarding}
                  className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleNextStep}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  {onboardingStep < 2 ? 'Next' : 'Get Started'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-slate-100 p-4 bg-white sticky bottom-0">
          {/* Points Consumption Notice */}
          <div className="mb-3">
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>AI Assistant action costs for Free/Starter plans:</span>
            </p>
            <div className="mt-1 grid grid-cols-2 gap-1 text-xs text-slate-600 ml-5">
              <div>Rewrite: <strong>10 points</strong></div>
              <div>Adjust Tone: <strong>10 points</strong></div>
              <div>Plot Suggestions: <strong>15 points</strong></div>
              <div>Detect Issues: <strong>8 points</strong></div>
              <div>Story Structure: <strong>20 points</strong></div>
              <div>Scene Beats: <strong>18 points</strong></div>
              <div>Character Arcs: <strong>15 points</strong></div>
            </div>
            <p className="text-xs text-slate-500 ml-5 mt-1">Pro/Unlimited plans can use it for free.</p>
          </div>
          
          <div className="flex flex-col space-y-3">
            <div className="flex space-x-2">
              <button 
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => onAction?.('rewrite')}
              >
                Rewrite
              </button>
              <button 
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => onAction?.('tone')}
              >
                Adjust Tone
              </button>
              <button 
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => onAction?.('suggest')}
              >
                Suggest
              </button>
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask me anything about your writing..."
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isTyping}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
