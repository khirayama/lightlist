"use client";

import { Drawer as DrawerPrimitive } from "vaul";
import {
  ComponentPropsWithoutRef,
  ElementRef,
  HTMLAttributes,
  forwardRef,
} from "react";

type DrawerContentProps = ComponentPropsWithoutRef<
  typeof DrawerPrimitive.Content
> & {
  className?: string;
  overlayClassName?: string;
};

type DrawerHeaderProps = HTMLAttributes<HTMLDivElement>;

function cn(...values: Array<string | undefined | null | false>): string {
  return values.filter(Boolean).join(" ");
}

export const Drawer = DrawerPrimitive.Root;
export const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerPortal = DrawerPrimitive.Portal;

const DrawerOverlay = forwardRef<
  ElementRef<typeof DrawerPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(function DrawerOverlay({ className, ...props }, ref) {
  return (
    <DrawerPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-1000 bg-black/50 backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
});

const DrawerContent = forwardRef<
  ElementRef<typeof DrawerPrimitive.Content>,
  DrawerContentProps
>(function DrawerContent(
  { className, children, overlayClassName, style, ...props },
  ref,
) {
  return (
    <DrawerPortal>
      <DrawerOverlay className={overlayClassName} />
      <DrawerPrimitive.Content
        ref={ref}
        className={cn(
          "fixed inset-y-0 z-1100 w-full max-w-[460px] outline-none",
          className,
        )}
        style={{ insetInlineStart: 0, ...style }}
        {...props}
      >
        <div className="flex h-full flex-col gap-4 overflow-y-auto bg-surface p-4 text-text shadow-2xl dark:bg-surface-dark dark:text-text-dark">
          {children}
        </div>
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
});

function DrawerHeader({ className, ...props }: DrawerHeaderProps) {
  return (
    <div
      className={cn("flex flex-col gap-3 text-start", className)}
      {...props}
    />
  );
}

const DrawerTitle = forwardRef<
  ElementRef<typeof DrawerPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(function DrawerTitle({ className, ...props }, ref) {
  return (
    <DrawerPrimitive.Title
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className,
      )}
      {...props}
    />
  );
});

const DrawerDescription = forwardRef<
  ElementRef<typeof DrawerPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(function DrawerDescription({ className, ...props }, ref) {
  return (
    <DrawerPrimitive.Description
      ref={ref}
      className={cn("text-sm text-muted dark:text-muted-dark", className)}
      {...props}
    />
  );
});

export { DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle };
