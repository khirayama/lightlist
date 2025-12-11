import {
  EmblaCarouselType,
  EmblaOptionsType,
  EmblaPluginType,
} from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
import {
  WheelGesturesPlugin,
  WheelGesturesOptions,
} from "embla-carousel-wheel-gestures";
import {
  ComponentProps,
  HTMLAttributes,
  ReactNode,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type CarouselApi = EmblaCarouselType;

interface CarouselProps extends HTMLAttributes<HTMLDivElement> {
  opts?: EmblaOptionsType;
  plugins?: EmblaPluginType[];
  wheelGestures?: boolean | WheelGesturesOptions;
  setApi?: (api: CarouselApi) => void;
  onSelect?: (api: CarouselApi) => void;
}

interface CarouselContextValue {
  emblaApi: CarouselApi | null;
  viewportRef: (element: HTMLDivElement | null) => void;
  scrollPrev: () => void;
  scrollNext: () => void;
  scrollTo: (index: number) => void;
  selectedIndex: number;
}

const CarouselContext = createContext<CarouselContextValue | null>(null);

function useCarousel() {
  const context = useContext(CarouselContext);
  if (!context) {
    throw new Error("Carousel components must be used within <Carousel>");
  }
  return context;
}

export function Carousel({
  opts,
  plugins,
  wheelGestures = false,
  setApi,
  onSelect,
  style,
  children,
  ...props
}: CarouselProps) {
  const wheelPlugin = useMemo(() => {
    if (!wheelGestures) return null;
    if (typeof wheelGestures === "boolean") return WheelGesturesPlugin();
    return WheelGesturesPlugin(wheelGestures);
  }, [wheelGestures]);

  const mergedPlugins = useMemo(() => {
    if (wheelPlugin) return [...(plugins ?? []), wheelPlugin];
    return plugins ?? [];
  }, [plugins, wheelPlugin]);

  const [viewportRef, emblaApi] = useEmblaCarousel(opts, mergedPlugins);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index);
    },
    [emblaApi],
  );

  useEffect(() => {
    if (!emblaApi) return;
    setApi?.(emblaApi);

    const handleSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
      onSelect?.(emblaApi);
    };

    emblaApi.on("select", handleSelect);
    handleSelect();

    return () => {
      emblaApi.off("select", handleSelect);
    };
  }, [emblaApi, onSelect, setApi]);

  return (
    <CarouselContext.Provider
      value={{
        emblaApi,
        viewportRef,
        scrollPrev,
        scrollNext,
        scrollTo,
        selectedIndex,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

type CarouselContentProps = HTMLAttributes<HTMLDivElement>;

export const CarouselContent = forwardRef<HTMLDivElement, CarouselContentProps>(
  ({ style, children, ...props }, ref) => {
    const { viewportRef } = useCarousel();

    return (
      <div ref={viewportRef} style={{ overflow: "hidden" }}>
        <div
          ref={ref}
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: "0px",
            ...style,
          }}
          {...props}
        >
          {children}
        </div>
      </div>
    );
  },
);

CarouselContent.displayName = "CarouselContent";

interface CarouselItemProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CarouselItem = forwardRef<HTMLDivElement, CarouselItemProps>(
  ({ style, children, ...props }, ref) => (
    <div
      ref={ref}
      style={{
        flex: "0 0 100%",
        minWidth: 0,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  ),
);

CarouselItem.displayName = "CarouselItem";

type CarouselControlProps = ComponentProps<"button">;

export const CarouselPrevious = forwardRef<
  HTMLButtonElement,
  CarouselControlProps
>(({ style, ...props }, ref) => {
  const { scrollPrev } = useCarousel();

  return (
    <button
      type="button"
      ref={ref}
      onClick={scrollPrev}
      style={{ position: "absolute", top: "50%", left: "8px", ...style }}
      {...props}
    >
      ‹
    </button>
  );
});

CarouselPrevious.displayName = "CarouselPrevious";

export const CarouselNext = forwardRef<HTMLButtonElement, CarouselControlProps>(
  ({ style, ...props }, ref) => {
    const { scrollNext } = useCarousel();

    return (
      <button
        type="button"
        ref={ref}
        onClick={scrollNext}
        style={{ position: "absolute", top: "50%", right: "8px", ...style }}
        {...props}
      >
        ›
      </button>
    );
  },
);

CarouselNext.displayName = "CarouselNext";

export type { CarouselApi };
