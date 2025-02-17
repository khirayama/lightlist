import clsx from "clsx";
import { useEffect, useState } from "react";

interface SheetProps {
  open: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({ open, onClose, children }) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setIsClosing(false);
    } else {
      setIsClosing(true);
      setTimeout(() => {
        setIsClosing(false);
      }, 2000);
    }
  }, [open]);

  return (
    <dialog
      open={open || isClosing}
      className={clsx(
        "fixed inset-0 flex items-center justify-center bg-black/50 p-4 opacity-0 transition-opacity duration-2000",
        { "z-1000 opacity-100": open },
        { "z-1000 opacity-0": isClosing },
        { "z-[-1]": !open && !isClosing },
      )}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </dialog>
  );
};
