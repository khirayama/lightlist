import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  ReactNode,
  Children,
} from "react";
import clsx from "clsx";

// Propsの型定義
export interface CarouselProps {
  /**
   * カルーセルに表示するスライド要素のリスト
   */
  children: ReactNode;
  /**
   * 現在のインデックス (Optional: 指定するとControlledモードになる)
   */
  index?: number;
  /**
   * インデックスが変更された時のコールバック
   * スクロール停止後、またはインジケータークリック時に発火
   */
  onIndexChange?: (index: number) => void;
  /**
   * コンテナの追加クラス名
   */
  className?: string;
  /**
   * インジケーターを表示するかどうか
   * @default true
   */
  showIndicators?: boolean;
  /**
   * インジケーターの表示位置
   * @default "bottom"
   */
  indicatorPosition?: "top" | "bottom";
  /**
   * インジケーターのARIAラベル (全体のナビゲーション用)
   */
  ariaLabel?: string;
  /**
   * 各インジケーターボタンのラベル生成関数
   */
  getIndicatorLabel?: (index: number, total: number) => string;
  /**
   * スクロール操作を許可するかどうか
   * @default true
   */
  scrollEnabled?: boolean;
  /**
   * インジケーターを通常レイアウトフローで表示するかどうか
   * @default false
   */
  indicatorInFlow?: boolean;
}

/**
 * Web用カルーセルコンポーネント
 */
export function Carousel({
  children,
  index: externalIndex,
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
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = useRef(0);
  const skipSmoothSyncRef = useRef(false);

  // 内部状態としてのindex (Uncontrolledモード用)
  const [internalIndex, setInternalIndex] = useState(0);

  // External index があればそれを優先 (Semi-controlled)
  const isControlled = externalIndex !== undefined;
  const currentIndex = isControlled ? externalIndex : internalIndex;
  currentIndexRef.current = currentIndex;

  const count = Children.count(children);

  // items.length が減って currentIndex が範囲外になった場合の補正
  useEffect(() => {
    if (currentIndex >= count && count > 0) {
      const newIndex = count - 1;
      // 内部状態も更新しておく
      if (!isControlled) {
        setInternalIndex(newIndex);
      }
      // 親に通知
      onIndexChange?.(newIndex);
    }
  }, [count, currentIndex, isControlled, onIndexChange]);

  // 外部から index が変わった場合は、スクロール位置を同期する
  useEffect(() => {
    const container = containerRef.current;
    if (!container || count === 0) return;

    // コンテナの幅に基づいてターゲット位置を計算
    const targetScrollLeft = currentIndex * container.clientWidth;

    // スクロール中以外で、かつ位置が大きくズレている場合のみ移動させる
    if (!isScrollingRef.current) {
      if (Math.abs(container.scrollLeft - targetScrollLeft) > 2) {
        container.scrollTo({
          left: targetScrollLeft,
          behavior: skipSmoothSyncRef.current ? "auto" : "smooth",
        });
      }
      skipSmoothSyncRef.current = false;
    }
  }, [currentIndex, count]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // スクロールイベントハンドラ
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // スクロール中はフラグを立てる (State更新を抑制するため)
    isScrollingRef.current = true;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // デバウンス処理: スクロール停止を検知
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      if (container.clientWidth === 0 || count === 0) return;

      // 現在のスクロール位置から最も近いスライドのインデックスを計算
      const newIndex = Math.round(container.scrollLeft / container.clientWidth);

      // 範囲外へのアクセス防止
      const clampedIndex = Math.max(0, Math.min(newIndex, count - 1));

      // インデックスが変わっていたら通知
      if (clampedIndex !== currentIndexRef.current) {
        skipSmoothSyncRef.current = true;
        if (!isControlled) {
          setInternalIndex(clampedIndex);
        }
        onIndexChange?.(clampedIndex);
      }
    }, 150); // 150ms静止でスクロール終了とみなす
  }, [count, isControlled, onIndexChange]);

  // インジケータークリック時の処理
  const handleIndicatorClick = (idx: number) => {
    if (idx === currentIndexRef.current) return;
    skipSmoothSyncRef.current = false;
    if (!isControlled) {
      setInternalIndex(idx);
    }
    onIndexChange?.(idx);
  };

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
          // スクロールバーを隠すスタイル
          scrollbarWidth: "none", // Firefox
          msOverflowStyle: "none", // IE/Edge
        }}
      >
        {Children.map(children, (child, idx) => (
          // 各スライド: コンテナ幅いっぱい、縮小なし、スナップ位置は開始位置
          <div
            key={idx}
            className="w-full h-full flex-shrink-0 snap-start snap-always"
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
