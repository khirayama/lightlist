import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  Children,
  ReactNode,
} from "react";
import {
  View,
  StyleSheet,
  LayoutChangeEvent,
  TouchableOpacity,
  ViewProps,
  Platform,
} from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  scrollTo,
  useDerivedValue,
  useAnimatedRef,
} from "react-native-reanimated";
import { useTheme } from "../../styles/theme";

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
  const theme = useTheme();
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

    // Use scrollTo from reanimated if possible, or standard scrollToOffset
    // Since we are not inside a worklet, we use the standard method via ref?
    // Actually reanimated scrollTo needs to be called from UI thread or we can use ref.current.scrollToOffset
    // But we should be careful about interfering with user interaction.
    // Here we use a simple ref call.
    if (animatedRef.current) {
      animatedRef.current.scrollToOffset({
        offset: targetOffset,
        animated: true,
      });
    }
  }, [currentIndex, containerWidth, count, isControlled]); // Added animatedRef to deps if needed, but it's a ref.

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
      const isActive = Math.abs(page - index) < 0.5; // Simple threshold
      // Or interpolate for smooth transition
      // Let's keep it simple: opacity and scale
      // But since we want to animate based on scroll position:
      const distanceFromIndex = Math.abs(page - index);
      const opacity = distanceFromIndex < 1 ? 1 - distanceFromIndex * 0.8 : 0.2;
      const scale = distanceFromIndex < 1 ? 1.2 - distanceFromIndex * 0.2 : 1;

      return {
        opacity: opacity, // interpolate can be used but this is fine
        transform: [{ scale }],
        backgroundColor: theme.text,
      };
    });

    return <Animated.View style={[styles.indicatorDot, animatedStyle]} />;
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
    <View style={[styles.container, style]} onLayout={onLayout} {...props}>
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
          onScrollToIndexFailed={() => {}} // Silent fail or retry
        />
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {showIndicators && count > 0 && (
        <View
          style={[
            styles.indicatorContainer,
            indicatorPosition === "top"
              ? styles.indicatorTop
              : styles.indicatorBottom,
          ]}
          pointerEvents="box-none"
        >
          {Array.from({ length: count }).map((_, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => handleIndicatorPress(idx)}
              style={styles.indicatorButton}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  indicatorContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  indicatorTop: {
    top: 16,
  },
  indicatorBottom: {
    bottom: 16,
  },
  indicatorButton: {
    padding: 8,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
