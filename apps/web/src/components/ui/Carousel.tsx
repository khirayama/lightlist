import React, {
  useRef,
  useEffect,
  useCallback,
  ReactNode,
  Children,
} from "react";
import clsx from "clsx";

export interface CarouselProps {
  children: ReactNode;
  index: number;
  onIndexChange: (index: number) => void;
  className?: string;
  showIndicators?: boolean;
  indicatorPosition?: "top" | "bottom";
  ariaLabel?: string;
  getIndicatorLabel?: (index: number, total: number) => string;
  scrollEnabled?: boolean;
  indicatorInFlow?: boolean;
}

export function Carousel({
  children,
  index,
  onIndexChange,
  className,
  showIndicators = true,
  indicatorPosition = "bottom",
  ariaLabel,
  getIndicatorLabel,
  scrollEnabled = true,
  indicatorInFlow = false,
}: CarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentIndexRef = useRef(0);
  const skipSmoothSyncRef = useRef(false);

  const count = Children.count(children);
  const currentIndex =
    count === 0 ? 0 : Math.max(0, Math.min(index, count - 1));
  currentIndexRef.current = currentIndex;

  useEffect(() => {
    if (count === 0) return;
    if (index === currentIndex) return;
    onIndexChange(currentIndex);
  }, [count, currentIndex, index, onIndexChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || count === 0) return;

    const targetScrollLeft = currentIndex * container.clientWidth;
    if (!isScrollingRef.current) {
      if (Math.abs(container.scrollLeft - targetScrollLeft) > 2) {
        container.scrollTo({
          left: targetScrollLeft,
          behavior: skipSmoothSyncRef.current ? "auto" : "smooth",
        });
      }
      skipSmoothSyncRef.current = false;
    }
  }, [count, currentIndex]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    isScrollingRef.current = true;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      if (container.clientWidth === 0 || count === 0) return;

      const nextIndex = Math.round(
        container.scrollLeft / container.clientWidth,
      );
      const clampedIndex = Math.max(0, Math.min(nextIndex, count - 1));

      if (clampedIndex !== currentIndexRef.current) {
        skipSmoothSyncRef.current = true;
        onIndexChange(clampedIndex);
      }
    }, 150);
  }, [count, onIndexChange]);

  const handleIndicatorClick = useCallback(
    (idx: number) => {
      if (idx === currentIndexRef.current) return;
      skipSmoothSyncRef.current = false;
      onIndexChange(idx);
    },
    [onIndexChange],
  );

  const indicatorNav = (
    <nav
      aria-label={ariaLabel}
      className={clsx(
        indicatorInFlow
          ? "flex justify-center gap-0.5"
          : "absolute left-0 right-0 flex justify-center gap-0.5 pointer-events-none z-30",
        indicatorInFlow
          ? indicatorPosition === "top"
            ? "mb-2"
            : "mt-2"
          : indicatorPosition === "top"
            ? "top-14"
            : "bottom-4",
      )}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => handleIndicatorClick(idx)}
          className={clsx(
            "inline-flex items-center justify-center p-2 rounded-full transition-all",
            !indicatorInFlow && "pointer-events-auto",
            "hover:bg-gray-900/10 dark:hover:bg-gray-50/10",
          )}
          aria-label={
            getIndicatorLabel?.(idx, count) ?? `Go to slide ${idx + 1}`
          }
          aria-current={idx === currentIndex ? "true" : undefined}
        >
          <span
            className={clsx(
              "h-2 w-2 rounded-full transition-all",
              idx === currentIndex
                ? "bg-gray-900 dark:bg-gray-50 scale-110"
                : "bg-gray-900/20 dark:bg-gray-50/20",
            )}
          />
        </button>
      ))}
    </nav>
  );

  return (
    <div className={clsx("relative w-full overflow-hidden", className)}>
      {showIndicators &&
        count > 0 &&
        indicatorInFlow &&
        indicatorPosition === "top" &&
        indicatorNav}
      <div
        ref={containerRef}
        onScroll={scrollEnabled ? handleScroll : undefined}
        className={clsx(
          "flex w-full h-full snap-x snap-mandatory no-scrollbar",
          scrollEnabled ? "overflow-x-auto" : "overflow-hidden",
        )}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {Children.map(children, (child, idx) => (
          <div
            key={idx}
            className="w-full h-full flex-shrink-0 snap-start snap-always"
            aria-hidden={idx === currentIndex ? undefined : true}
          >
            {child}
          </div>
        ))}
      </div>

      {showIndicators &&
        count > 0 &&
        (!indicatorInFlow || indicatorPosition !== "top") &&
        indicatorNav}
    </div>
  );
}
