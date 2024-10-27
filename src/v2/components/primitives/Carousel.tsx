import {
  useState,
  createContext,
  useContext,
  ReactNode,
  Children,
  useEffect,
  useRef,
} from "react";

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
  const [{ index, length }, { setIndex }] = useContext(CarouselContext);
  const indicator = Array.from({ length }, (_, i) => i);

  return (
    <div>
      <ul>
        {indicator.map((i) => {
          return (
            <li key={i} onClick={() => setIndex(i)}>
              {i === index ? "●" : "○"}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CarouselSection(props: {
  children: ReactNode;
  onIndexChange: (index: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(Children.count(props.children));

  useEffect(() => {
    props.onIndexChange(index);
  }, [index]);

  return (
    <CarouselContext.Provider
      value={[
        { index, length },
        { setIndex, setLength },
      ]}
    >
      {props.children}
    </CarouselContext.Provider>
  );
}

export function Carousel(props: { children: ReactNode }) {
  const [{ index }, { setIndex, setLength }] = useContext(CarouselContext);
  const ref = useRef(null);

  useEffect(() => {
    setLength(Children.count(props.children));
  }, [props.children]);

  useEffect(() => {
    const el = ref.current.childNodes[index];
    el.scrollIntoView({ behavior: "smooth" });
  }, [index]);

  useEffect(() => {
    const handleScroll = () => {
      scrollDebounce(() => {
        const els = ref.current.childNodes;
        for (let i = 0; i < els.length; i++) {
          if (Math.abs(els[i].offsetLeft - ref.current.scrollLeft) < 10) {
            setIndex(i);
            break;
          }
        }
      }, 30);
    };

    handleScroll();
    ref.current?.addEventListener("scroll", handleScroll);
    return () => {
      ref.current?.removeEventListener("scroll", handleScroll);
    };
  }, [setIndex]);

  return (
    <section
      ref={ref}
      className="relative flex w-full flex-1 snap-x snap-mandatory flex-row flex-nowrap overflow-scroll"
    >
      {props.children}
    </section>
  );
}

export function CarouselItem(props: { children: ReactNode }) {
  return (
    <div className="relative w-full flex-none snap-start snap-always px-4 py-12">
      {props.children}
    </div>
  );
}
