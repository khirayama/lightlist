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
};

type DrawerHeaderProps = HTMLAttributes<HTMLDivElement>;
type DrawerFooterProps = HTMLAttributes<HTMLDivElement>;

function cn(...values: Array<string | undefined | null | false>): string {
  return values.filter(Boolean).join(" ");
}

export const Drawer = DrawerPrimitive.Root;
export const DrawerTrigger = DrawerPrimitive.Trigger;
export const DrawerPortal = DrawerPrimitive.Portal;
export const DrawerClose = DrawerPrimitive.Close;

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
>(function DrawerContent({ className, children, ...props }, ref) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        className={cn(
          "fixed inset-y-0 left-0 z-1100 w-full max-w-[420px] -translate-x-full outline-none transition-transform duration-200 data-[state=open]:translate-x-0",
          className,
        )}
        {...props}
      >
        <div className="flex h-full flex-col gap-4 overflow-y-auto bg-white p-4 text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-gray-50">
          {children}
        </div>
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
});

function DrawerHeader({ className, ...props }: DrawerHeaderProps) {
  return (
    <div
      className={cn("flex flex-col gap-3 text-left", className)}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: DrawerFooterProps) {
  return (
    <div
      className={cn("mt-auto flex flex-wrap justify-end gap-2", className)}
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
      className={cn("text-sm text-gray-600 dark:text-gray-300", className)}
      {...props}
    />
  );
});

export {
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerTitle,
};
