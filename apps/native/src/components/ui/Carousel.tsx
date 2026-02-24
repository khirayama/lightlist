import React, {
  Children,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { TouchableOpacity, View, ViewProps } from "react-native";
import PagerView, {
  type PagerViewOnPageSelectedEvent,
} from "react-native-pager-view";

interface CarouselProps extends ViewProps {
  children: ReactNode;
  index: number;
  onIndexChange: (index: number) => void;
  showIndicators?: boolean;
  indicatorPosition?: "top" | "bottom";
  indicatorInFlow?: boolean;
  getIndicatorLabel?: (index: number, total: number) => string;
  scrollEnabled?: boolean;
}

export function Carousel({
  children,
  index,
  onIndexChange,
  style,
  showIndicators = true,
  indicatorPosition = "bottom",
  indicatorInFlow = false,
  getIndicatorLabel,
  scrollEnabled = true,
  ...props
}: CarouselProps) {
  const pagerRef = useRef<PagerView | null>(null);
  const pagerIndexRef = useRef(0);
  const hasControlledSyncRef = useRef(false);
  const lastEmittedIndexRef = useRef<number | null>(null);

  const childrenArray = Children.toArray(children);
  const count = childrenArray.length;

  const clampIndex = useCallback(
    (value: number): number => {
      if (count === 0) return 0;
      return Math.max(0, Math.min(value, count - 1));
    },
    [count],
  );

  const emitIndexChange = useCallback(
    (nextIndex: number) => {
      if (lastEmittedIndexRef.current === nextIndex) return;
      lastEmittedIndexRef.current = nextIndex;
      onIndexChange(nextIndex);
    },
    [onIndexChange],
  );

  const syncPagerIndex = useCallback(
    (nextIndex: number, animated: boolean) => {
      if (count === 0) return;
      const targetIndex = clampIndex(nextIndex);
      if (pagerIndexRef.current === targetIndex) return;
      pagerIndexRef.current = targetIndex;
      requestAnimationFrame(() => {
        if (animated) {
          pagerRef.current?.setPage(targetIndex);
          return;
        }
        pagerRef.current?.setPageWithoutAnimation(targetIndex);
      });
    },
    [clampIndex, count],
  );

  const currentIndex = clampIndex(index);
  const initialPage = currentIndex;
  const activeIndicatorIndex = currentIndex;

  useEffect(() => {
    if (count !== 0) return;
    pagerIndexRef.current = 0;
    hasControlledSyncRef.current = false;
    lastEmittedIndexRef.current = null;
  }, [count]);

  useEffect(() => {
    if (count === 0) return;

    if (currentIndex !== index) {
      emitIndexChange(currentIndex);
    }

    lastEmittedIndexRef.current = currentIndex;
    const shouldAnimate = hasControlledSyncRef.current;
    hasControlledSyncRef.current = true;
    syncPagerIndex(currentIndex, shouldAnimate);
  }, [count, currentIndex, emitIndexChange, index, syncPagerIndex]);

  const handlePageSelected = useCallback(
    (event: PagerViewOnPageSelectedEvent) => {
      const nextIndex = clampIndex(event.nativeEvent.position);
      pagerIndexRef.current = nextIndex;
      emitIndexChange(nextIndex);
    },
    [clampIndex, emitIndexChange],
  );

  const handleIndicatorPress = useCallback(
    (idx: number) => {
      if (count === 0) return;
      const targetIndex = clampIndex(idx);
      emitIndexChange(targetIndex);
      syncPagerIndex(targetIndex, true);
    },
    [clampIndex, count, emitIndexChange, syncPagerIndex],
  );

  const indicator = (
    <View
      className={`flex-row justify-center items-center z-10 px-4 gap-0.5 ${
        indicatorInFlow
          ? indicatorPosition === "top"
            ? "mb-2"
            : "mt-2"
          : indicatorPosition === "top"
            ? "absolute left-0 right-0 top-4"
            : "absolute left-0 right-0 bottom-4"
      }`}
      pointerEvents={indicatorInFlow ? "auto" : "box-none"}
    >
      {Array.from({ length: count }).map((_, idx) => {
        const isActive = idx === activeIndicatorIndex;
        return (
          <TouchableOpacity
            key={idx}
            onPress={() => handleIndicatorPress(idx)}
            className="p-2"
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={
              getIndicatorLabel?.(idx, count) ?? `Go to slide ${idx + 1}`
            }
          >
            <View
              className={`w-2 h-2 rounded-full bg-text dark:bg-text-dark ${
                isActive ? "opacity-100" : "opacity-20"
              }`}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View className="flex-1 overflow-hidden relative" style={style} {...props}>
      {showIndicators &&
        count > 0 &&
        indicatorInFlow &&
        indicatorPosition === "top" &&
        indicator}

      {count > 0 ? (
        <PagerView
          ref={pagerRef}
          style={{ flex: 1 }}
          initialPage={initialPage}
          scrollEnabled={scrollEnabled}
          overScrollMode="never"
          overdrag={false}
          onPageSelected={handlePageSelected}
        >
          {childrenArray.map((item, idx) => (
            <View key={idx.toString()} className="flex-1" collapsable={false}>
              {item}
            </View>
          ))}
        </PagerView>
      ) : (
        <View className="flex-1" />
      )}

      {showIndicators &&
        count > 0 &&
        (!indicatorInFlow || indicatorPosition !== "top") &&
        indicator}
    </View>
  );
}
