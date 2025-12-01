import { useState } from 'react';
import type { WritingStyle, StyleAnalysis } from '../types/style';
import { analyzeWritingStyle } from '../utils/styleAnalysis';

interface StyleDetailViewProps {
  style: WritingStyle;
  onUpdate: (updatedStyle: WritingStyle) => void;
  onClose: () => void;
}

export default function StyleDetailView({ style, onUpdate, onClose }: StyleDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [styleName, setStyleName] = useState(style.name || 'My Writing Style');
  const [adjustments, setAdjustments] = useState(style.adjustments || {
    toneAdjustment: 0,
    pacingAdjustment: 0,
    sentenceLengthAdjustment: 0,
    vocabularyAdjustment: 0
  });

  // Parse custom traits to get analysis
  const getAnalysis = (): StyleAnalysis | null => {
    if (!style.customTraits) return null;

    const traitMap: Record<string, string> = {};
    style.customTraits.forEach((trait: string) => {
      const [key, value] = trait.split(':').map(s => s.trim());
      if (key && value) traitMap[key.toLowerCase()] = value;
    });

    return {
      tone: (traitMap.tone as any) || 'neutral',
      pacing: (traitMap.pacing as any) || 'moderate',
      perspective: (traitMap.perspective as any) || 'third-person',
      sentenceLength: (traitMap['sentence length'] as any) || 'medium',
      vocabulary: (traitMap.vocabulary as any) || 'moderate'
    };
  };

  const analysis = getAnalysis();

  const handleSave = () => {
    const updatedStyle: WritingStyle = {
      ...style,
      name: styleName,
      adjustments,
      updatedAt: Date.now()
    };
    onUpdate(updatedStyle);
    setIsEditing(false);
  };

  const handleAdjustmentChange = (key: keyof typeof adjustments, value: number) => {
    setAdjustments(prev => ({
      ...prev,
      [key]: Math.max(-1, Math.min(1, value))
    }));
  };

  if (!analysis) {
    return (
      <div className="p-4 text-sm text-slate-500">
        No style analysis available. Please learn from your writing first.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">Style Details</h4>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setStyleName(style.name || 'My Writing Style');
                  setAdjustments(style.adjustments || {
                    toneAdjustment: 0,
                    pacingAdjustment: 0,
                    sentenceLengthAdjustment: 0,
                    vocabularyAdjustment: 0
                  });
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition"
            >
              Edit
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Style Name
            </label>
            <input
              type="text"
              value={styleName}
              onChange={(e) => setStyleName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400"
              placeholder="My Writing Style"
            />
          </div>

          <div className="space-y-3">
            <h5 className="text-xs font-semibold text-slate-700">Adjustments</h5>
            
            {(['toneAdjustment', 'pacingAdjustment', 'sentenceLengthAdjustment', 'vocabularyAdjustment'] as const).map((key) => {
              const label = key.replace('Adjustment', '').replace(/([A-Z])/g, ' $1').trim();
              const value = adjustments[key] || 0;
              
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-slate-600 capitalize">{label}</label>
                    <span className="text-xs text-slate-500">
                      {value > 0 ? '+' : ''}{value.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={value}
                    onChange={(e) => handleAdjustmentChange(key, parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-400 mt-0.5">
                    <span>Less</span>
                    <span>More</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-700 mb-2">Style Name</p>
            <p className="text-sm text-slate-900">{styleName}</p>
          </div>

          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-slate-700">Style Traits</h5>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Tone</p>
                <p className="text-sm font-medium text-slate-900 capitalize">{analysis.tone}</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Pacing</p>
                <p className="text-sm font-medium text-slate-900 capitalize">{analysis.pacing}</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Perspective</p>
                <p className="text-sm font-medium text-slate-900 capitalize">{analysis.perspective.replace('-', ' ')}</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Sentence Length</p>
                <p className="text-sm font-medium text-slate-900 capitalize">{analysis.sentenceLength}</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Vocabulary</p>
                <p className="text-sm font-medium text-slate-900 capitalize">{analysis.vocabulary}</p>
              </div>
            </div>
          </div>

          {style.learnedFrom && (
            <div>
              <p className="text-xs font-medium text-slate-700 mb-1">Learned From</p>
              <p className="text-xs text-slate-500 italic">{style.learnedFrom}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}




