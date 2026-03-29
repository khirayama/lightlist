import React, {
  useRef,
  useEffect,
  useCallback,
  ReactNode,
  Children,
} from "react";
import clsx from "clsx";

type CarouselDirection = "ltr" | "rtl";
type RtlScrollMode = "positive-ascending" | "positive-descending" | "negative";

let rtlScrollModeCache: RtlScrollMode | null = null;

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const detectRtlScrollMode = (): RtlScrollMode => {
  if (rtlScrollModeCache) {
    return rtlScrollModeCache;
  }
  if (typeof document === "undefined") {
    rtlScrollModeCache = "positive-ascending";
    return rtlScrollModeCache;
  }

  const container = document.createElement("div");
  const child = document.createElement("div");
  container.dir = "rtl";
  container.style.width = "4px";
  container.style.height = "1px";
  container.style.overflow = "scroll";
  container.style.position = "absolute";
  container.style.top = "-9999px";
  child.style.width = "8px";
  child.style.height = "1px";
  container.appendChild(child);
  document.body.appendChild(container);

  const initial = container.scrollLeft;
  if (initial > 0) {
    rtlScrollModeCache = "positive-descending";
    document.body.removeChild(container);
    return rtlScrollModeCache;
  }

  container.scrollLeft = 1;
  rtlScrollModeCache =
    container.scrollLeft === 0 ? "negative" : "positive-ascending";
  document.body.removeChild(container);
  return rtlScrollModeCache;
};

const getInlineOffsetFromScrollLeft = (
  scrollLeft: number,
  maxOffset: number,
  direction: CarouselDirection,
): number => {
  if (direction === "ltr") {
    return clamp(scrollLeft, 0, maxOffset);
  }

  const mode = detectRtlScrollMode();
  if (mode === "negative") {
    return clamp(-scrollLeft, 0, maxOffset);
  }
  if (mode === "positive-descending") {
    return clamp(maxOffset - scrollLeft, 0, maxOffset);
  }
  return clamp(scrollLeft, 0, maxOffset);
};

const getScrollLeftFromInlineOffset = (
  inlineOffset: number,
  maxOffset: number,
  direction: CarouselDirection,
): number => {
  const clamped = clamp(inlineOffset, 0, maxOffset);
  if (direction === "ltr") {
    return clamped;
  }

  const mode = detectRtlScrollMode();
  if (mode === "negative") {
    return -clamped;
  }
  if (mode === "positive-descending") {
    return maxOffset - clamped;
  }
  return clamped;
};

interface CarouselProps {
  children: ReactNode;
  index: number;
  onIndexChange: (index: number) => void;
  direction?: CarouselDirection;
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
  direction = "ltr",
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

    const maxOffset = Math.max(
      0,
      container.scrollWidth - container.clientWidth,
    );
    const targetInlineOffset = currentIndex * container.clientWidth;
    const targetScrollLeft = getScrollLeftFromInlineOffset(
      targetInlineOffset,
      maxOffset,
      direction,
    );
    if (!isScrollingRef.current) {
      if (Math.abs(container.scrollLeft - targetScrollLeft) > 2) {
        container.scrollTo({
          left: targetScrollLeft,
          behavior: skipSmoothSyncRef.current ? "auto" : "smooth",
        });
      }
      skipSmoothSyncRef.current = false;
    }
  }, [count, currentIndex, direction]);

  useEffect(() => {
    skipSmoothSyncRef.current = true;
  }, [direction]);

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

      const maxOffset = Math.max(
        0,
        container.scrollWidth - container.clientWidth,
      );
      const inlineOffset = getInlineOffsetFromScrollLeft(
        container.scrollLeft,
        maxOffset,
        direction,
      );
      const nextIndex = Math.round(inlineOffset / container.clientWidth);
      const clampedIndex = Math.max(0, Math.min(nextIndex, count - 1));

      if (clampedIndex !== currentIndexRef.current) {
        skipSmoothSyncRef.current = true;
        onIndexChange(clampedIndex);
      }
    }, 150);
  }, [count, direction, onIndexChange]);

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
            "hover:bg-primary/10 dark:hover:bg-primary-dark/10",
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
                ? "bg-primary dark:bg-primary-dark scale-110"
                : "bg-primary/20 dark:bg-primary-dark/20",
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
          direction,
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
