import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  ReactNode,
  Children,
} from "react";
import {
  View,
  FlatList,
  StyleSheet,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
  ViewProps,
} from "react-native";
import { useTheme } from "../../styles/theme";

// Web版のProps定義に準拠しつつ、Native用に調整
export interface CarouselProps extends ViewProps {
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
   * スクロール停止後、またはインジケータータップ時に発火
   */
  onIndexChange?: (index: number) => void;
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
   * 各インジケーターボタンのアクセシビリティラベル生成関数
   */
  getIndicatorLabel?: (index: number, total: number) => string;
}

/**
 * Native用カルーセルコンポーネント
 * Web版 (apps/web/src/components/ui/Carousel.tsx) と挙動・APIを一致させています。
 *
 * 設計意図:
 * - FlatList + pagingEnabled を使用して、ネイティブの1スライドごとのスナップ動作を実現。
 * - index管理はSemi-controlledパターンを採用 (props.index優先、内部stateフォールバック)。
 * - onMomentumScrollEnd でのみindexを確定させ、スクロール中の過剰な更新を防ぐ。
 * - 連続スワイプ時の競合（巻き戻り）を防ぐため、スクロール中の外部index同期を抑制する。
 */
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
  const flatListRef = useRef<FlatList>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // 内部状態としてのindex (Uncontrolledモード用)
  const [internalIndex, setInternalIndex] = useState(0);

  // スクロール中かどうかを判定するフラグ (Refで管理して再レンダリングを防ぐ)
  const isScrollingRef = useRef(false);

  // 現在のスクロール位置を追跡 (Refで管理)
  const currentScrollX = useRef(0);

  // External index があればそれを優先 (Semi-controlled)
  const isControlled = externalIndex !== undefined;
  const currentIndex = isControlled ? externalIndex : internalIndex;

  const childrenArray = Children.toArray(children);
  const count = childrenArray.length;

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
    // コンテナ幅が決まっていない、または要素がない場合はスキップ
    if (containerWidth === 0 || count === 0) return;

    // ユーザーがスワイプ操作中、または慣性スクロール中の場合は
    // 外部からのindex変更（onIndexChangeの結果として戻ってきたものを含む）による
    // 強制的なスクロール位置の書き戻しを防ぐ。
    if (isScrollingRef.current) return;

    // 範囲外チェック
    const targetIndex = Math.max(0, Math.min(currentIndex, count - 1));
    const targetOffset = targetIndex * containerWidth;

    // すでにターゲット位置（またはその近傍）にいる場合はスクロールしない
    // これにより、onMomentumScrollEnd 直後の不要な scrollToIndex を防ぐ
    if (Math.abs(currentScrollX.current - targetOffset) < 1) return;

    // index変更時に必ずスクロールさせる
    try {
      flatListRef.current?.scrollToIndex({
        index: targetIndex,
        animated: true,
      });
    } catch (e) {
      console.warn("Carousel scrollToIndex failed", e);
    }
  }, [currentIndex, containerWidth, count]);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const width = e.nativeEvent.layout.width;
      // 幅が変わった場合のみ更新
      if (Math.abs(containerWidth - width) > 1) {
        setContainerWidth(width);
      }
    },
    [containerWidth],
  );

  // スクロール位置の追跡
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    currentScrollX.current = e.nativeEvent.contentOffset.x;
  }, []);

  // スクロール開始 (手動スワイプ)
  const onScrollBeginDrag = useCallback(() => {
    isScrollingRef.current = true;
  }, []);

  // 慣性スクロール開始
  const onMomentumScrollBegin = useCallback(() => {
    isScrollingRef.current = true;
  }, []);

  // スクロール完了 (慣性スクロール終了) -> ここでindex確定
  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isScrollingRef.current = false;

      if (containerWidth === 0) return;

      const offsetX = e.nativeEvent.contentOffset.x;
      // 現在のページ計算
      const newIndex = Math.round(offsetX / containerWidth);
      const clampedIndex = Math.max(0, Math.min(newIndex, count - 1));

      // インデックスが変わっていたら通知
      if (clampedIndex !== currentIndex) {
        if (!isControlled) {
          setInternalIndex(clampedIndex);
        }
        onIndexChange?.(clampedIndex);
      }
    },
    [containerWidth, count, currentIndex, isControlled, onIndexChange],
  );

  // インジケータータップ時の処理
  const handleIndicatorPress = (idx: number) => {
    if (!isControlled) {
      setInternalIndex(idx);
    }
    onIndexChange?.(idx);
  };

  // FlatListの最適化設定
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: containerWidth,
      offset: containerWidth * index,
      index,
    }),
    [containerWidth],
  );

  // レンダリング
  return (
    <View style={[styles.container, style]} onLayout={onLayout} {...props}>
      {/* コンテナ幅が確定してからリストを表示しないと、初期位置がずれる可能性がある */}
      {containerWidth > 0 && count > 0 ? (
        <FlatList
          ref={flatListRef}
          data={childrenArray}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={true} // 端でのバウンスを許可
          keyExtractor={(_, idx) => idx.toString()}
          renderItem={({ item }) => (
            <View style={{ width: containerWidth, height: "100%" }}>
              {item}
            </View>
          )}
          getItemLayout={getItemLayout}
          onScroll={onScroll}
          scrollEventThrottle={16} // onScrollの頻度設定 (16ms = 60fps)
          onScrollBeginDrag={onScrollBeginDrag}
          onMomentumScrollBegin={onMomentumScrollBegin}
          onMomentumScrollEnd={onMomentumScrollEnd}
          // Androidでのスナップ挙動を安定させる
          decelerationRate="fast"
          snapToInterval={containerWidth}
          disableIntervalMomentum={true}
          // 初期位置設定 (マウント時)
          initialScrollIndex={currentIndex < count ? currentIndex : 0}
          onScrollToIndexFailed={(info) => {
            // レイアウト計算遅延等で失敗した場合のリトライ
            // ユーザー操作中はリトライしない
            if (isScrollingRef.current) return;

            setTimeout(() => {
              if (isScrollingRef.current) return;
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: false,
              });
            }, 100);
          }}
        />
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {/* インジケーター */}
      {showIndicators && count > 0 && (
        <View
          style={[
            styles.indicatorContainer,
            indicatorPosition === "top"
              ? styles.indicatorTop
              : styles.indicatorBottom,
          ]}
          pointerEvents="box-none" // コンテナ自体はタッチ透過
        >
          {Array.from({ length: count }).map((_, idx) => {
            const isActive = idx === currentIndex;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => handleIndicatorPress(idx)}
                style={styles.indicatorButton}
                accessibilityLabel={
                  getIndicatorLabel?.(idx, count) ?? `Go to slide ${idx + 1}`
                }
                accessibilityState={{ selected: isActive }}
              >
                <View
                  style={[
                    styles.indicatorDot,
                    {
                      backgroundColor: theme.text,
                      opacity: isActive ? 1 : 0.2,
                      transform: [{ scale: isActive ? 1.2 : 1 }],
                    },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // 親コンテナのサイズに合わせる
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
    padding: 8, // タップ領域確保
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
