import type { ReactElement, ReactNode } from "react";
import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { styles } from "../../styles/appStyles";

type DrawerContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  direction: "left" | "right";
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

const useDrawerContext = (componentName: string) => {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error(`${componentName} must be used within Drawer`);
  }
  return context;
};

type DrawerProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  direction?: "left" | "right";
  handleOnly?: boolean;
  children: ReactNode;
};

export const Drawer = ({
  open,
  defaultOpen = false,
  onOpenChange,
  direction = "left",
  children,
}: DrawerProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open : uncontrolledOpen;

  const setOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <DrawerContext.Provider value={{ open: currentOpen, setOpen, direction }}>
      {children}
    </DrawerContext.Provider>
  );
};

type DrawerPortalProps = {
  children: ReactNode;
};

export const DrawerPortal = ({ children }: DrawerPortalProps) => {
  return <>{children}</>;
};

type DrawerTriggerProps = PressableProps & {
  asChild?: boolean;
  children: ReactNode;
};

const composePress =
  (handler: PressableProps["onPress"], next: () => void) =>
  (event: Parameters<NonNullable<PressableProps["onPress"]>>[0]) => {
    handler?.(event);
    next();
  };

export const DrawerTrigger = ({
  asChild,
  children,
  onPress,
  ...props
}: DrawerTriggerProps) => {
  const { setOpen } = useDrawerContext("DrawerTrigger");
  const handlePress = composePress(onPress, () => setOpen(true));

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{
      onPress?: PressableProps["onPress"];
    }>;
    return cloneElement(child, {
      ...props,
      onPress: composePress(child.props.onPress, () => setOpen(true)),
    });
  }

  return (
    <Pressable {...props} onPress={handlePress}>
      {children}
    </Pressable>
  );
};

type DrawerCloseProps = PressableProps & {
  asChild?: boolean;
  children: ReactNode;
};

export const DrawerClose = ({
  asChild,
  children,
  onPress,
  ...props
}: DrawerCloseProps) => {
  const { setOpen } = useDrawerContext("DrawerClose");
  const handlePress = composePress(onPress, () => setOpen(false));

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{
      onPress?: PressableProps["onPress"];
    }>;
    return cloneElement(child, {
      ...props,
      onPress: composePress(child.props.onPress, () => setOpen(false)),
    });
  }

  return (
    <Pressable {...props} onPress={handlePress}>
      {children}
    </Pressable>
  );
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type DrawerOverlayProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
};

export const DrawerOverlay = ({ style, ...props }: DrawerOverlayProps) => {
  return (
    <AnimatedPressable
      accessibilityRole="button"
      style={[styles.drawerOverlay, style]}
      {...props}
    />
  );
};

type DrawerContentProps = ViewProps & {
  children: ReactNode;
  maxWidth?: number;
  widthRatio?: number;
  overlayProps?: DrawerOverlayProps;
};

export const DrawerContent = ({
  children,
  maxWidth = 360,
  widthRatio = 0.85,
  overlayProps,
  style,
  ...props
}: DrawerContentProps) => {
  const { open, setOpen, direction } = useDrawerContext("DrawerContent");
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * widthRatio, maxWidth);
  const openProgress = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(openProgress, {
      toValue: open ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [open, openProgress]);

  const translateX = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [direction === "left" ? -drawerWidth : drawerWidth, 0],
  });

  const overlayOpacity = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  const panelSideStyle =
    direction === "left"
      ? { left: 0, borderRightWidth: 1 }
      : { right: 0, borderLeftWidth: 1 };

  const {
    style: overlayStyle,
    onPress: onOverlayPress,
    ...overlayRest
  } = overlayProps ?? {};

  const handleOverlayPress: PressableProps["onPress"] = (event) => {
    onOverlayPress?.(event);
    setOpen(false);
  };

  return (
    <DrawerPortal>
      <DrawerOverlay
        pointerEvents={open ? "auto" : "none"}
        style={[{ opacity: overlayOpacity }, overlayStyle]}
        onPress={handleOverlayPress}
        {...overlayRest}
      />
      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        style={[
          styles.drawerPanel,
          panelSideStyle,
          {
            width: drawerWidth,
            transform: [{ translateX }],
          },
          style,
        ]}
        {...props}
      >
        {children}
      </Animated.View>
    </DrawerPortal>
  );
};

type DrawerHeaderProps = ViewProps;

export const DrawerHeader = ({ style, ...props }: DrawerHeaderProps) => {
  return <View style={[styles.drawerHeader, style]} {...props} />;
};

type DrawerFooterProps = ViewProps;

export const DrawerFooter = ({ style, ...props }: DrawerFooterProps) => {
  return <View style={style} {...props} />;
};

type DrawerTitleProps = TextProps;

export const DrawerTitle = ({ style, ...props }: DrawerTitleProps) => {
  return <Text style={[styles.drawerTitle, style]} {...props} />;
};

type DrawerDescriptionProps = TextProps;

export const DrawerDescription = ({
  style,
  ...props
}: DrawerDescriptionProps) => {
  return <Text style={[styles.drawerSubtitle, style]} {...props} />;
};
