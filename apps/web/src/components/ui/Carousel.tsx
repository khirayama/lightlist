import {
  EmblaCarouselType,
  EmblaOptionsType,
  EmblaPluginType,
} from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
import {
  WheelGesturesPlugin,
  WheelGesturesPluginOptions,
} from "embla-carousel-wheel-gestures";
import {
  ComponentProps,
  ReactNode,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import clsx from "clsx";

type CarouselApi = EmblaCarouselType;

type CarouselRootProps = Omit<ComponentProps<"div">, "onSelect">;

interface CarouselProps extends CarouselRootProps {
  opts?: EmblaOptionsType;
  plugins?: EmblaPluginType[];
  wheelGestures?: boolean | WheelGesturesPluginOptions;
  setApi?: (api: CarouselApi) => void;
  onSelect?: (api: CarouselApi) => void;
}

interface CarouselContextValue {
  emblaApi: CarouselApi | undefined;
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
  className,
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
      <div className={clsx("relative w-full", className)} {...props}>
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

type CarouselContentProps = ComponentProps<"div">;

export const CarouselContent = forwardRef<HTMLDivElement, CarouselContentProps>(
  ({ className, children, ...props }, ref) => {
    const { viewportRef } = useCarousel();

    return (
      <div ref={viewportRef} className="overflow-hidden h-full">
        <div
          ref={ref}
          className={clsx("flex items-stretch gap-0", className)}
          {...props}
        >
          {children}
        </div>
      </div>
    );
  },
);

CarouselContent.displayName = "CarouselContent";

interface CarouselItemProps extends ComponentProps<"div"> {
  children: ReactNode;
}

export const CarouselItem = forwardRef<HTMLDivElement, CarouselItemProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx("min-w-0 shrink-0 basis-full", className)}
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
>(({ className, ...props }, ref) => {
  const { scrollPrev } = useCarousel();

  return (
    <button
      type="button"
      ref={ref}
      onClick={scrollPrev}
      className={clsx(
        "absolute left-2 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-300 bg-white/80 text-lg font-semibold text-gray-900 shadow-sm backdrop-blur hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-50 dark:hover:bg-gray-800 dark:focus-visible:outline-gray-500",
        className,
      )}
      {...props}
    >
      ‹
    </button>
  );
});

CarouselPrevious.displayName = "CarouselPrevious";

export const CarouselNext = forwardRef<HTMLButtonElement, CarouselControlProps>(
  ({ className, ...props }, ref) => {
    const { scrollNext } = useCarousel();

    return (
      <button
        type="button"
        ref={ref}
        onClick={scrollNext}
        className={clsx(
          "absolute right-2 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-300 bg-white/80 text-lg font-semibold text-gray-900 shadow-sm backdrop-blur hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-50 dark:hover:bg-gray-800 dark:focus-visible:outline-gray-500",
          className,
        )}
        {...props}
      >
        ›
      </button>
    );
  },
);

CarouselNext.displayName = "CarouselNext";

export type { CarouselApi };
