"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ComponentPropsWithoutRef,
  ElementRef,
  ForwardedRef,
  ReactNode,
  forwardRef,
  useId,
} from "react";
import clsx from "clsx";

type DialogContentProps = ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> & {
  title: ReactNode;
  description?: ReactNode;
  titleId?: string;
  descriptionId?: string;
};

type DialogHeaderProps = {
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
};

type DialogFooterProps = {
  children: ReactNode;
};

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const DialogOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay(props, ref) {
  const { className, ...rest } = props;
  return (
    <DialogPrimitive.Overlay
      {...rest}
      ref={ref}
      className={clsx("fixed inset-0 bg-black/40 backdrop-blur-sm", className)}
    />
  );
});

const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(function DialogContent(
  { children, title, description, titleId, descriptionId, className, ...props },
  ref: ForwardedRef<ElementRef<typeof DialogPrimitive.Content>>,
) {
  const generatedTitleId = titleId ?? useId();
  const generatedDescriptionId =
    description !== undefined ? (descriptionId ?? useId()) : undefined;

  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        {...props}
        ref={ref}
        aria-labelledby={generatedTitleId}
        aria-describedby={generatedDescriptionId}
        className={clsx(
          "fixed left-1/2 top-1/2 z-50 min-w-[320px] max-w-[min(640px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--dialog-bg,#ffffff)] p-5 text-[var(--dialog-fg,#111111)] shadow-2xl",
          className,
        )}
      >
        <DialogHeader
          title={<DialogTitle id={generatedTitleId}>{title}</DialogTitle>}
          description={
            description !== undefined ? (
              <DialogDescription id={generatedDescriptionId}>
                {description}
              </DialogDescription>
            ) : undefined
          }
        />
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

function DialogHeader({ title, description, children }: DialogHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      {title}
      {description}
      {children}
    </div>
  );
}

function DialogTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <DialogPrimitive.Title id={id} className="m-0 text-lg font-semibold">
      {children}
    </DialogPrimitive.Title>
  );
}

function DialogDescription({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) {
  return (
    <DialogPrimitive.Description
      id={id}
      className="m-0 text-sm text-[var(--dialog-muted,#444444)]"
    >
      {children}
    </DialogPrimitive.Description>
  );
}

function DialogFooter({ children }: DialogFooterProps) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
      {children}
    </div>
  );
}

export {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
};
