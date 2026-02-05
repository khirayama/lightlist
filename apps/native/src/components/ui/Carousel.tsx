import React, {
  useCallback,
  useEffect,
  useState,
  Children,
  ReactNode,
} from "react";
import {
  View,
  LayoutChangeEvent,
  TouchableOpacity,
  ViewProps,
} from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  useAnimatedRef,
} from "react-native-reanimated";

export interface CarouselProps extends ViewProps {
  children: ReactNode;
  index?: number;
  onIndexChange?: (index: number) => void;
  showIndicators?: boolean;
  indicatorPosition?: "top" | "bottom";
  getIndicatorLabel?: (index: number, total: number) => string;
}

export function Carousel({
  children,
  index: externalIndex,
  onIndexChange,
  style,
  showIndicators = true,
  indicatorPosition = "bottom",
  getIndicatorLabel,
  ...props
}: CarouselProps) {
  const animatedRef = useAnimatedRef<Animated.FlatList<any>>();
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const scrollX = useSharedValue(0);
  const [internalIndex, setInternalIndex] = useState(0);
  const isControlled = externalIndex !== undefined;
  const currentIndex = isControlled ? externalIndex : internalIndex;

  const childrenArray = Children.toArray(children);
  const count = childrenArray.length;

  const handleIndexChange = useCallback(
    (newIndex: number) => {
      if (newIndex !== currentIndex) {
        if (!isControlled) {
          setInternalIndex(newIndex);
        }
        onIndexChange?.(newIndex);
      }
    },
    [currentIndex, isControlled, onIndexChange],
  );

  // Sync external index
  useEffect(() => {
    if (!isControlled || containerWidth === 0 || count === 0) return;
    const targetIndex = Math.max(0, Math.min(currentIndex, count - 1));
    const targetOffset = targetIndex * containerWidth;

    if (animatedRef.current) {
      animatedRef.current.scrollToOffset({
        offset: targetOffset,
        animated: true,
      });
    }
  }, [currentIndex, containerWidth, count, isControlled]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
    onMomentumEnd: (event) => {
      if (containerWidth === 0) return;
      const newIndex = Math.round(event.contentOffset.x / containerWidth);
      runOnJS(handleIndexChange)(newIndex);
    },
  });

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const width = e.nativeEvent.layout.width;
      if (Math.abs(containerWidth - width) > 1) {
        setContainerWidth(width);
      }
    },
    [containerWidth],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: containerWidth,
      offset: containerWidth * index,
      index,
    }),
    [containerWidth],
  );

  const Indicator = ({ index }: { index: number }) => {
    const animatedStyle = useAnimatedStyle(() => {
      if (containerWidth === 0) return {};
      const page = scrollX.value / containerWidth;
      const distanceFromIndex = Math.abs(page - index);
      const opacity = distanceFromIndex < 1 ? 1 - distanceFromIndex * 0.8 : 0.2;
      const scale = distanceFromIndex < 1 ? 1.2 - distanceFromIndex * 0.2 : 1;

      return {
        opacity: opacity,
        transform: [{ scale }],
      };
    });

    return (
      <Animated.View
        className="w-2 h-2 rounded-full bg-text dark:bg-text-dark"
        style={animatedStyle}
      />
    );
  };

  const handleIndicatorPress = (idx: number) => {
    if (!isControlled) {
      setInternalIndex(idx);
    }
    onIndexChange?.(idx);
    if (animatedRef.current && containerWidth > 0) {
      animatedRef.current.scrollToOffset({
        offset: idx * containerWidth,
        animated: true,
      });
    }
  };

  return (
    <View
      className="flex-1 overflow-hidden relative"
      style={style}
      onLayout={onLayout}
      {...props}
    >
      {containerWidth > 0 && count > 0 ? (
        <Animated.FlatList
          ref={animatedRef}
          data={childrenArray}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={true}
          keyExtractor={(_, idx) => idx.toString()}
          renderItem={({ item }) => (
            <View style={{ width: containerWidth, height: "100%" }}>
              {item}
            </View>
          )}
          getItemLayout={getItemLayout}
          onScroll={onScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={containerWidth}
          disableIntervalMomentum={true}
          initialScrollIndex={currentIndex < count ? currentIndex : 0}
          onScrollToIndexFailed={() => {}}
        />
      ) : (
        <View className="flex-1" />
      )}

      {showIndicators && count > 0 && (
        <View
          className={`absolute left-0 right-0 flex-row justify-center items-center z-10 px-4 gap-1.5 ${
            indicatorPosition === "top" ? "top-4" : "bottom-4"
          }`}
          pointerEvents="box-none"
        >
          {Array.from({ length: count }).map((_, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => handleIndicatorPress(idx)}
              className="p-2"
              accessibilityLabel={
                getIndicatorLabel?.(idx, count) ?? `Go to slide ${idx + 1}`
              }
            >
              <Indicator index={idx} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
