import {
  useState,
  createContext,
  useContext,
  ReactNode,
  Children,
  useEffect,
  useRef,
} from "react";
import clsx from "clsx";

const createDebounce = () => {
  let timeoutId = null;
  return (fn: Function, t: number) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn();
    }, t);
  };
};

const scrollDebounce = createDebounce();

const CarouselContext = createContext(null);

export function CarouselIndicator() {
  const [{ index, length }, { onIndexChange }] = useContext(CarouselContext);
  const indicator = Array.from({ length }, (_, i) => i);

  return (
    <div className="flex items-center justify-center py-2">
      {indicator.map((i) => {
        return (
          <button
            key={i}
            className={clsx(
              "mx-1 h-1 w-1 rounded-full focus-visible:bg-gray-800 dark:focus-visible:bg-gray-200",
              i === index ? "bg-gray-200" : "bg-gray-500",
            )}
            onClick={() => {
              onIndexChange(i);
            }}
          />
        );
      })}
    </div>
  );
}

export function Carousel(props: {
  children: ReactNode;
  index: number;
  onIndexChange: (index: number) => void;
}) {
  const [length, setLength] = useState(Children.count(props.children));

  return (
    <CarouselContext.Provider
      value={[
        { index: props.index, length },
        { setLength, onIndexChange: props.onIndexChange },
      ]}
    >
      {props.children}
    </CarouselContext.Provider>
  );
}

export function CarouselList(props: { children: ReactNode }) {
  const [{ index }, { setLength, onIndexChange }] = useContext(CarouselContext);
  const ref = useRef(null);

  useEffect(() => {
    setLength(Children.count(props.children));
  }, [props.children]);

  useEffect(() => {
    const el = ref.current.childNodes[index];
    if (el) {
      el.parentNode.scrollLeft = el.offsetLeft;
    }
  }, []);

  useEffect(() => {
    const el = ref.current.childNodes[index];
    if (el) {
      el.parentNode.scrollTo({
        left: el.offsetLeft,
        behavior: "smooth",
      });
    }
  }, [index]);

  useEffect(() => {
    const handleScroll = () => {
      scrollDebounce(() => {
        const els = ref.current.childNodes;
        for (let i = 0; i < els.length; i++) {
          if (Math.abs(els[i].offsetLeft - ref.current.scrollLeft) < 10) {
            onIndexChange(i);
            break;
          }
        }
      }, 30);
    };

    ref.current?.addEventListener("scroll", handleScroll);
    return () => {
      ref.current?.removeEventListener("scroll", handleScroll);
    };
  }, [index]);

  return (
    <section
      ref={ref}
      className="relative flex h-full w-full flex-1 snap-x snap-mandatory flex-row flex-nowrap overflow-scroll"
    >
      {props.children}
    </section>
  );
}

export function CarouselItem(props: { children: ReactNode }) {
  return (
    <div className="relative w-full flex-none snap-start snap-always">
      {props.children}
    </div>
  );
}
