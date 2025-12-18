import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ElementRef, ComponentPropsWithoutRef, ForwardedRef } from "react";
import { forwardRef } from "react";
import clsx from "clsx";

export const Popover = PopoverPrimitive.Root;

export const PopoverTrigger = PopoverPrimitive.Trigger;

export const PopoverAnchor = PopoverPrimitive.Anchor;

export const PopoverContent = forwardRef(
  (
    {
      className,
      align = "center",
      sideOffset = 4,
      ...props
    }: ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>,
    ref: ForwardedRef<ElementRef<typeof PopoverPrimitive.Content>>,
  ) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={clsx(
          "z-50 w-auto rounded-xl border border-gray-200 bg-white p-2 text-gray-900 shadow-lg outline-none",
          "dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  ),
);
PopoverContent.displayName = "PopoverContent";
