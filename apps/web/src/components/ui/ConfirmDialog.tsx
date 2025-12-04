export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  additionalInfo?: string;
  confirmText: string;
  cancelText: string;
  isDestructive?: boolean;
  disabled?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  additionalInfo,
  confirmText,
  cancelText,
  isDestructive = false,
  disabled = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="max-w-sm w-full rounded-2xl border border-white/10 bg-[var(--bg-panel-strong)] shadow-[0_30px_120px_rgba(15,23,42,0.55)] px-6 py-7">
        <h2 className="text-xl font-semibold text-white mb-2 tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-slate-200/80 mb-6 leading-relaxed">
          {message}
        </p>
        {additionalInfo && (
          <p className="text-sm text-white mb-6 font-semibold">
            {additionalInfo}
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={disabled}
            className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white border border-white/10 hover:border-white/30 transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={disabled}
            className={`flex-1 px-4 py-3 rounded-xl text-white font-semibold transition-all shadow-[0_12px_40px_rgba(56,189,248,0.35)] disabled:opacity-50 ${
              isDestructive
                ? "bg-gradient-to-r from-rose-500 to-amber-500 hover:opacity-90"
                : "bg-gradient-to-r from-cyan-500 via-emerald-500 to-lime-400 hover:opacity-90"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
