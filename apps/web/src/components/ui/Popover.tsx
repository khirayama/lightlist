import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ElementRef, ComponentPropsWithoutRef, ForwardedRef } from "react";
import { forwardRef } from "react";
import clsx from "clsx";

export const Popover = PopoverPrimitive.Root;

export const PopoverTrigger = PopoverPrimitive.Trigger;

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
          "z-50 w-auto rounded-xl border border-border bg-surface p-2 text-text shadow-lg outline-none",
          "dark:border-border-dark dark:bg-surface-dark dark:text-text-dark",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  ),
);
PopoverContent.displayName = "PopoverContent";
