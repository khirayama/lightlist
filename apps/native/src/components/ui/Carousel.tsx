import type { ReactNode } from "react";
import {
  Children,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { LayoutChangeEvent, ViewProps } from "react-native";
import { View } from "react-native";
import CarouselBase, {
  type ICarouselInstance,
  type TCarouselProps,
} from "react-native-reanimated-carousel";

type CarouselApi = {
  scrollPrev: () => void;
  scrollNext: () => void;
  scrollTo: (index: number) => void;
  selectedIndex: number;
};

type CarouselOptions = Partial<
  Pick<
    TCarouselProps<ReactNode>,
    | "autoFillData"
    | "autoPlay"
    | "autoPlayInterval"
    | "autoPlayReverse"
    | "containerStyle"
    | "customAnimation"
    | "customConfig"
    | "enableSnap"
    | "enabled"
    | "fixedDirection"
    | "loop"
    | "maxScrollDistancePerSwipe"
    | "minScrollDistancePerSwipe"
    | "onConfigurePanGesture"
    | "onProgressChange"
    | "onScrollEnd"
    | "onScrollStart"
    | "overscrollEnabled"
    | "pagingEnabled"
    | "scrollAnimationDuration"
    | "snapEnabled"
    | "style"
    | "testID"
    | "windowSize"
    | "withAnimation"
  >
>;

type CarouselRootProps = ViewProps;

interface CarouselProps extends CarouselRootProps {
  opts?: CarouselOptions;
  setApi?: (api: CarouselApi) => void;
  onSelect?: (api: CarouselApi) => void;
}

interface CarouselContextValue {
  width: number;
  height: number;
  opts?: CarouselOptions;
  setCarouselRef: (instance: ICarouselInstance | null) => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  onSelect?: (api: CarouselApi) => void;
  api: CarouselApi;
}

const CarouselContext = createContext<CarouselContextValue | null>(null);

const useCarousel = () => {
  const context = useContext(CarouselContext);
  if (!context) {
    throw new Error("Carousel components must be used within <Carousel>");
  }
  return context;
};

export const Carousel = ({
  opts,
  setApi,
  onSelect,
  style,
  children,
  ...props
}: CarouselProps) => {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const carouselRef = useRef<ICarouselInstance | null>(null);
  const setCarouselRef = useCallback((instance: ICarouselInstance | null) => {
    carouselRef.current = instance;
  }, []);

  const scrollTo = useCallback((index: number) => {
    carouselRef.current?.scrollTo({ index, animated: true });
  }, []);

  const scrollPrev = useCallback(() => {
    carouselRef.current?.scrollTo({ count: -1, animated: true });
  }, []);

  const scrollNext = useCallback(() => {
    carouselRef.current?.scrollTo({ count: 1, animated: true });
  }, []);

  const api = useMemo(
    () => ({
      scrollPrev,
      scrollNext,
      scrollTo,
      selectedIndex,
    }),
    [scrollPrev, scrollNext, scrollTo, selectedIndex],
  );

  useEffect(() => {
    setApi?.(api);
  }, [api, setApi]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout((prev) => {
      if (prev.width === width && prev.height === height) {
        return prev;
      }
      return { width, height };
    });
  };

  return (
    <CarouselContext.Provider
      value={{
        width: layout.width,
        height: layout.height,
        opts,
        setCarouselRef,
        selectedIndex,
        setSelectedIndex,
        onSelect,
        api,
      }}
    >
      <View style={style} onLayout={handleLayout} {...props}>
        {children}
      </View>
    </CarouselContext.Provider>
  );
};

type CarouselContentProps = ViewProps;

export const CarouselContent = ({
  children,
  ...props
}: CarouselContentProps) => {
  const {
    width,
    height,
    opts,
    setCarouselRef,
    setSelectedIndex,
    onSelect,
    api,
  } = useCarousel();
  const items = useMemo(() => Children.toArray(children), [children]);

  if (width <= 0 || height <= 0) {
    return <View {...props} />;
  }

  return (
    <View {...props}>
      <CarouselBase
        ref={setCarouselRef}
        width={width}
        height={height}
        data={items}
        renderItem={({ item }) => <View style={{ width, height }}>{item}</View>}
        onSnapToItem={(index) => {
          setSelectedIndex(index);
          onSelect?.({ ...api, selectedIndex: index });
        }}
        {...opts}
      />
    </View>
  );
};

type CarouselItemProps = ViewProps & {
  children: ReactNode;
};

export const CarouselItem = forwardRef<View, CarouselItemProps>(
  ({ children, style, ...props }, ref) => (
    <View
      ref={ref}
      style={[{ width: "100%", height: "100%" }, style]}
      {...props}
    >
      {children}
    </View>
  ),
);

CarouselItem.displayName = "CarouselItem";

export type { CarouselApi };
