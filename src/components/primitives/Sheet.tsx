import clsx from "clsx";
import { useEffect, useState, useRef } from "react";

interface SheetProps {
  open: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({ open, onClose, children }) => {
  const DRAG_THRESHOLD = 60;

  const ref = useRef<HTMLDialogElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (dragging) {
        const deltaY = e.clientY - offset.y;
        setPosition((prev) => ({
          x: prev.x,
          y: Math.max(prev.y + deltaY, 0),
        }));
        setOffset((prev) => ({ ...prev, y: Math.max(e.clientY, prev.y) }));
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
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

  useEffect(() => {
    const shouldOpen = open || isClosing;
    if (shouldOpen) {
      ref.current?.showModal();
    } else {
      ref.current?.close();
    }
  }, [open, isClosing]);

  useEffect(() => {
    if (!open) {
      setIsClosing(true);
      setTimeout(() => {
        setIsClosing(false);
      }, 200);
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={clsx(
        "fixed top-0 left-0 flex h-full min-h-full w-full min-w-full items-center justify-center overflow-hidden bg-black/50 duration-0",
        { "z-1000": open },
        { "pointer-events-none z-1000": isClosing },
        { "z-[-1]": !open && !isClosing },
        { "pointer-events-none": dragging },
      )}
      onClick={onClose}
    >
      <div
        className={clsx(
          "bg-primary absolute bottom-0 w-full max-w-4xl transform overflow-scroll rounded-lg transition-transform duration-200",
        )}
        style={
          {
            // transform: open ? "translateY(0)" : "translateY(100%)",
            // transition: "transform 200 ease-in-out",
            // transform: dragging
            //   ? `translateY(${position.y}px)`
            //   : open
            //     ? "translateY(0)"
            //     : "translateY(100%)",
            // transition: dragging ? "transform 0s" : "transform 200 ease-in-out",
          }
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 flex justify-center py-2"
          onPointerDown={handlePointerDown}
        >
          <div className="h-1 w-12 cursor-move rounded-full bg-gray-400" />
        </div>
        <div className="px-4 pb-8">{children}</div>
      </div>
    </dialog>
  );
};
