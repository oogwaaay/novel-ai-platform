interface PublishModalProps {
  open: boolean;
  isExporting: boolean;
  onClose: () => void;
  onExportMarkdown: () => void;
  onExportPdf: () => void;
  onExportEpub: () => void;
  onExportAudio: () => void;
}

export default function PublishModal({
  open,
  isExporting,
  onClose,
  onExportMarkdown,
  onExportPdf,
  onExportEpub,
  onExportAudio
}: PublishModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Publish</p>
            <h3 className="text-2xl font-light text-slate-900">Choose your export</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
        <p className="text-sm text-slate-500">
          Each export is formatted with Apple-style typography. Audiobook script is optimized for voice actors or TTS tools.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={onExportPdf}
            disabled={isExporting}
            className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-left hover:border-slate-300 disabled:opacity-50"
          >
            <p className="text-sm font-semibold text-slate-900">PDF</p>
            <p className="text-xs text-slate-500">Typeset pages ready for print or sharing.</p>
          </button>

          <button
            onClick={onExportEpub}
            disabled={isExporting}
            className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-left hover:border-slate-300 disabled:opacity-50"
          >
            <p className="text-sm font-semibold text-slate-900">ePub</p>
            <p className="text-xs text-slate-500">Compatible with Apple Books, Kindle, Kobo.</p>
          </button>

          <button
            onClick={onExportMarkdown}
            disabled={isExporting}
            className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-left hover:border-slate-300 disabled:opacity-50"
          >
            <p className="text-sm font-semibold text-slate-900">Markdown</p>
            <p className="text-xs text-slate-500">Structured text for editors and collaboration.</p>
          </button>

          <button
            onClick={onExportAudio}
            disabled={isExporting}
            className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-left hover:border-slate-300 disabled:opacity-50"
          >
            <p className="text-sm font-semibold text-slate-900">Audiobook script</p>
            <p className="text-xs text-slate-500">Narration-ready script with pacing cues.</p>
          </button>
        </div>

        {isExporting && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Preparing export… This may take a moment for longer drafts.
          </div>
        )}
      </div>
    </div>
  );
}




