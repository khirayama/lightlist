import clsx from "clsx";
import { useEffect, useState } from "react";

interface SheetProps {
  open: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({ open, onClose, children }) => {
  const DRAG_THRESHOLD = 60;

  const [isClosing, setIsClosing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!open) {
      setIsClosing(true);
      setTimeout(() => {
        setIsClosing(false);
      }, 600);
    }
  }, [open]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (dragging) {
        const deltaY = e.clientY - offset.y;
        console.log(deltaY, position, offset);
        setPosition((prev) => ({
          x: prev.x,
          y: Math.max(prev.y + deltaY, 0),
        }));
        setOffset((prev) => ({ ...prev, y: Math.max(e.clientY, prev.y) }));
      }
    };

    const handlePointerUp = () => {
      if (dragging && position.y >= DRAG_THRESHOLD) {
        if (onClose) {
          onClose();
        }
      }
      setPosition({ x: 0, y: 0 });
      setOffset({ x: 0, y: 0 });
      setDragging(false);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragging, offset, position.y, onClose]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    setOffset({
      x: e.clientX,
      y: e.clientY,
    });
  };

  return (
    <dialog
      open={open || isClosing}
      className={clsx(
        "fixed inset-0 flex h-full w-full items-center justify-center bg-black/50 opacity-0 transition-opacity duration-600",
        { "z-1000 opacity-100": open },
        { "pointer-events-none z-1000 opacity-0": isClosing },
        { "z-[-1]": !open && !isClosing },
      )}
      onClick={onClose}
    >
      <div
        className={clsx(
          "absolute bottom-0 min-h-[80%] w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg transition-transform duration-400",
        )}
        style={{
          transform: dragging
            ? `translateY(${position.y}px)`
            : open
              ? "translateY(0)"
              : "translateY(100%)",
          transition: dragging ? "transform 0s" : "transform 0.3s ease-in-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="h-[12px] w-[80%] cursor-move bg-red-400"
          onPointerDown={handlePointerDown}
        >
          handle
        </div>
        {children}
      </div>
    </dialog>
  );
};
