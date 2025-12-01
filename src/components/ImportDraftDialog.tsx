import { useState, useRef } from 'react';
import { importFile, SUPPORTED_FILE_TYPES, type ImportedContent } from '../utils/fileImport';

interface ImportDraftDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (content: ImportedContent) => void;
}

export default function ImportDraftDialog({ isOpen, onClose, onImport }: ImportDraftDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const content = await importFile(file);
      onImport(content);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Import draft</h3>
            <p className="text-sm text-slate-500 mt-1">Upload your existing manuscript to continue editing</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-slate-200 bg-slate-50 hover:border-slate-300'
          }`}
        >
          <div className="space-y-4">
            <div className="text-4xl">📄</div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
              </p>
              <p className="text-xs text-slate-500 mt-1">or</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
            >
              {isProcessing ? 'Processing...' : 'Browse files'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={SUPPORTED_FILE_TYPES.map(t => `.${t.extension}`).join(',')}
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Supported formats</p>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_FILE_TYPES.map((type) => (
              <span
                key={type.extension}
                className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-lg text-xs text-slate-700"
              >
                <span className="font-semibold">.{type.extension.toUpperCase()}</span>
                <span className="text-slate-500">{type.name}</span>
              </span>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            <p className="font-semibold">Import failed</p>
            <p className="mt-1">{error}</p>
            <p className="mt-2 text-xs text-red-600">
              Tip: For DOCX and PDF files, please convert to TXT or MD format first, or use our online converter.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}


