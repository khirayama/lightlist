import { Dialog, DialogClose, DialogContent, DialogFooter } from "./Dialog";

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

  const primaryButtonClass =
    "inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:bg-gray-400 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-white dark:focus-visible:outline-gray-500 dark:disabled:bg-gray-600 dark:disabled:text-gray-200";
  const destructiveButtonClass =
    "inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:bg-red-300 dark:bg-red-500 dark:hover:bg-red-400 dark:focus-visible:outline-red-700 dark:disabled:bg-red-800";
  const secondaryButtonClass =
    "inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:hover:bg-gray-800 dark:focus-visible:outline-gray-500";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent title={title} description={message}>
        {additionalInfo ? (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {additionalInfo}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <button
              type="button"
              onClick={onClose}
              disabled={disabled}
              className={secondaryButtonClass}
            >
              {cancelText}
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled}
            className={
              isDestructive ? destructiveButtonClass : primaryButtonClass
            }
          >
            {confirmText}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
