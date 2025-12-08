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
    <div>
      <h2>{title}</h2>
      <p>{message}</p>
      {additionalInfo && <p>{additionalInfo}</p>}
      <div>
        <button onClick={onClose} disabled={disabled}>
          {cancelText}
        </button>
        <button onClick={onConfirm} disabled={disabled}>
          {confirmText}
        </button>
      </div>
    </div>
  );
}
