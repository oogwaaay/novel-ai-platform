import { useState, useRef, useEffect } from 'react';
import type { WritingStyle, WritingStylePreset } from '../types/style';
import { analyzeWritingStyle } from '../utils/styleAnalysis';
import { analyzeStyleWithLLM } from '../api/novelApi';
import StyleDetailView from './StyleDetailView';

interface StyleMemoryPanelProps {
  style: WritingStyle | null;
  onStyleChange: (style: WritingStyle | null) => void;
  existingContent?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Simple dialog - Completely rewritten, following ImportDraftDialog pattern
function LearnFromTextDialog({ 
  open, 
  onClose, 
  onConfirm 
}: { 
  open: boolean; 
  onClose: () => void; 
  onConfirm: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 当对话框关闭时，重置状态
  useEffect(() => {
    if (!open) {
      setText('');
      setShowTextInput(false);
      setIsDragging(false);
    }
  }, [open]);

  if (!open) return null;

  const handleFileUpload = async (file: File) => {
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const content = await file.text();
      setText(content);
      setShowTextInput(true); // 自动展开文本输入区域，让用户看到内容
    } else {
      alert('Please upload a .txt file');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleConfirm = () => {
    if (text.trim().length >= 200) {
      const contentToConfirm = text.trim();
      setText('');
      onConfirm(contentToConfirm);
      onClose();
    } else {
      alert('Please enter at least 200 characters');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-8 space-y-6 my-8">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-semibold text-slate-900">Learn Your Writing Voice</h3>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 text-2xl leading-none"
            aria-label="Close dialog"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-5">
          {/* 文件上传区域 - 视觉焦点 */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition ${
              isDragging
                ? 'border-slate-400 bg-slate-50'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300'
            }`}
          >
            <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-base font-semibold text-slate-900 mb-2">
              {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
            </p>
            <p className="text-sm text-slate-500 mb-4">or</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition"
            >
              Browse files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/plain"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* 文本粘贴选项 - 默认隐藏，点击后展开 */}
          {!showTextInput ? (
            <div className="text-center py-2">
              <button
                onClick={() => setShowTextInput(true)}
                className="text-sm text-slate-500 hover:text-slate-700 transition inline-flex items-center gap-1.5"
              >
                <span>Or paste your text directly</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">
                  Paste your text directly
                </label>
                <button
                  onClick={() => {
                    setShowTextInput(false);
                    setText('');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 transition"
                >
                  Hide
                </button>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your existing writing here..."
                className="w-full h-32 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 resize-none hide-scrollbar text-sm"
              />
              <p className="text-xs text-slate-500">
                {text.length} characters {text.length >= 200 ? '✓ Ready to analyze' : '(at least 200 characters required)'}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={text.trim().length < 200}
            className="px-6 py-2 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Analyze & Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// Reference styles - Hidden by default, shown on demand
const REFERENCE_STYLES: { value: WritingStylePreset; label: string }[] = [
  { value: 'literary', label: 'Literary' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'experimental', label: 'Experimental' }
];

export default function StyleMemoryPanel({
  style,
  onStyleChange,
  existingContent,
  isCollapsed = false,
  onToggleCollapse
}: StyleMemoryPanelProps) {
  const [isLearning, setIsLearning] = useState(false);
  const [showLearnDialog, setShowLearnDialog] = useState(false);
  const [showReferenceStyles, setShowReferenceStyles] = useState(false);
  const [showStyleDetail, setShowStyleDetail] = useState(false);

  const handleLearnFromContent = () => {
    if (existingContent && existingContent.length >= 200) {
      performLearning(existingContent);
    } else {
      setShowLearnDialog(true);
    }
  };

  const performLearning = async (content: string) => {
    setIsLearning(true);
    try {
      const llmAnalysis = await analyzeStyleWithLLM(content);
      
      // Multi-document learning: merge with existing style if present
      const existingSamples = style?.learningSamples || [];
      const newSample = {
        text: content.slice(0, 200) + '...',
        analyzedAt: Date.now(),
        traits: llmAnalysis.traits
      };
      
      // Merge traits from multiple samples (weighted average)
      const allSamples = [...existingSamples, newSample];
      const mergedTraits = mergeStyleTraits(allSamples.map(s => s.traits));
      
      // Calculate confidence based on number of samples
      const confidence = Math.min(0.5 + (allSamples.length * 0.1), 0.95);
      
      const newStyle: WritingStyle = {
        ...style,
        preset: 'custom',
        customTraits: mergedTraits,
        learnedFrom: allSamples.length === 1 ? newSample.text : `${allSamples.length} samples`,
        learningSamples: allSamples.slice(-10), // Keep last 10 samples
        updatedAt: Date.now(),
        generatedBy: 'LLM',
        confidence
      };
      onStyleChange(newStyle);
    } catch (error) {
      console.error('Failed to analyze style with LLM, falling back to local analysis:', error);
      // Fallback to local analysis
      const analysis = analyzeWritingStyle(content);
      const existingSamples = style?.learningSamples || [];
      const newSample = {
        text: content.slice(0, 200) + '...',
        analyzedAt: Date.now(),
        traits: [
          `Tone: ${analysis.tone}`,
          `Pacing: ${analysis.pacing}`,
          `Perspective: ${analysis.perspective}`,
          `Sentence length: ${analysis.sentenceLength}`,
          `Vocabulary: ${analysis.vocabulary}`
        ]
      };
      const allSamples = [...existingSamples, newSample];
      const mergedTraits = mergeStyleTraits(allSamples.map(s => s.traits));
      const confidence = Math.min(0.5 + (allSamples.length * 0.1), 0.95);
      
      const newStyle: WritingStyle = {
        ...style,
        preset: 'custom',
        customTraits: mergedTraits,
        learnedFrom: allSamples.length === 1 ? newSample.text : `${allSamples.length} samples`,
        learningSamples: allSamples.slice(-10),
        updatedAt: Date.now(),
        generatedBy: 'local',
        confidence
      };
      onStyleChange(newStyle);
    } finally {
      setIsLearning(false);
    }
  };
  
  // Helper function to merge style traits from multiple samples
  const mergeStyleTraits = (traitArrays: string[][]): string[] => {
    if (traitArrays.length === 0) return [];
    if (traitArrays.length === 1) return traitArrays[0];
    
    // Group traits by key (e.g., "Tone:", "Pacing:")
    const traitMap = new Map<string, string[]>();
    
    traitArrays.forEach(traits => {
      traits.forEach(trait => {
        const colonIndex = trait.indexOf(':');
        if (colonIndex > 0) {
          const key = trait.substring(0, colonIndex + 1).trim();
          const value = trait.substring(colonIndex + 1).trim();
          if (!traitMap.has(key)) {
            traitMap.set(key, []);
          }
          traitMap.get(key)!.push(value);
        }
      });
    });
    
    // For each key, take the most common value or merge intelligently
    const merged: string[] = [];
    traitMap.forEach((values, key) => {
      // Count frequency of each value
      const valueCounts = new Map<string, number>();
      values.forEach(v => {
        valueCounts.set(v, (valueCounts.get(v) || 0) + 1);
      });
      
      // Get most common value
      let mostCommon = values[0];
      let maxCount = 0;
      valueCounts.forEach((count, value) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommon = value;
        }
      });
      
      merged.push(`${key} ${mostCommon}`);
    });
    
    return merged.length > 0 ? merged : traitArrays[0];
  };

  const handleDialogConfirm = (text: string) => {
    setShowLearnDialog(false);
    performLearning(text);
  };

  const handlePresetSelect = (preset: WritingStylePreset) => {
    const newStyle: WritingStyle = {
      preset,
      updatedAt: Date.now()
    };
    onStyleChange(newStyle);
  };

  const handleClear = () => {
    onStyleChange(null);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Your writing voice</p>
          <p className="text-sm text-slate-500">
            {style ? (
              <span>
                <span className="font-semibold text-slate-700 capitalize">
                  {style.preset === 'custom' ? 'Custom' : style.preset || 'Active'}
                </span>
                {style.confidence && (
                  <span className="text-slate-400"> · {Math.round(style.confidence * 100)}%</span>
                )}
              </span>
            ) : (
              'Not learned yet'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLearnFromContent}
            disabled={isLearning}
            className={`rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold transition ${
              isLearning
                ? 'text-slate-400 cursor-not-allowed'
                : 'text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            {isLearning ? 'Learning…' : 'Learn'}
          </button>
          {onToggleCollapse && (
              <button
              type="button"
              onClick={onToggleCollapse}
              className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900"
              aria-label={isCollapsed ? 'Expand writing voice panel' : 'Collapse writing voice panel'}
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
          )}
        </div>
        </div>

      {!isCollapsed && (
        <div className="p-4">
        {/* Unlearned state: Single primary action button */}
        {!style || style.preset !== 'custom' ? (
          <>
            <button
              onClick={handleLearnFromContent}
              disabled={isLearning}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold rounded-lg transition ${
                isLearning
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {isLearning ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Learning...</span>
                </>
              ) : (
                <span>Learn from your writing</span>
              )}
            </button>

            {/* Reference styles - Hidden by default, shown on demand */}
            <button
              onClick={() => setShowReferenceStyles(!showReferenceStyles)}
              className="w-full mt-3 text-xs text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1 transition"
            >
              <span>Or use a reference style</span>
              <svg 
                className={`w-3 h-3 transition-transform ${showReferenceStyles ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
            </button>

            {showReferenceStyles && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                {REFERENCE_STYLES.map(preset => {
                  const isSelected = style?.preset === preset.value;
                  return (
                    <button
                      key={preset.value}
                      onClick={() => handlePresetSelect(preset.value)}
                      className={`w-full text-left p-2.5 rounded-lg border transition ${
                        isSelected
                          ? 'border-slate-700 bg-slate-100'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? 'border-slate-900 bg-slate-900'
                              : 'border-slate-300'
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <span className={`text-sm font-medium ${
                          isSelected ? 'text-slate-900' : 'text-slate-700'
                        }`}>{preset.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Learned state: Active card with detail view */
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <span className="text-sm font-medium text-slate-900">Active</span>
                  {style.name && (
                    <p className="text-xs text-slate-500">{style.name}</p>
                  )}
                </div>
          </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowStyleDetail(true)}
                  className="text-xs text-slate-500 hover:text-slate-700 transition"
                  title="View details"
                >
                  Details
                </button>
          <button
            onClick={handleClear}
                  className="text-xs text-slate-500 hover:text-slate-700 transition"
          >
                  Clear
          </button>
              </div>
            </div>
            
            {showStyleDetail && (
              <div className="border border-slate-200 rounded-lg bg-white">
                <StyleDetailView
                  style={style}
                  onUpdate={(updated) => {
                    onStyleChange(updated);
                    setShowStyleDetail(false);
                  }}
                  onClose={() => setShowStyleDetail(false)}
                />
              </div>
            )}
          </div>
        )}
      </div>
      )}

      <LearnFromTextDialog
        open={showLearnDialog}
        onClose={() => setShowLearnDialog(false)}
        onConfirm={handleDialogConfirm}
      />
    </section>
  );
}
