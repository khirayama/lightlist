"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  CSSProperties,
  ComponentPropsWithoutRef,
  ElementRef,
  ForwardedRef,
  ReactNode,
  forwardRef,
} from "react";

type DialogContentProps = ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> & {
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

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.4)",
  backdropFilter: "blur(2px)",
};

const contentStyle: CSSProperties = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  background: "var(--dialog-bg, #ffffff)",
  color: "var(--dialog-fg, #111111)",
  minWidth: "320px",
  maxWidth: "min(640px, 90vw)",
  borderRadius: "12px",
  boxShadow: "0 16px 48px rgba(0, 0, 0, 0.18)",
  padding: "20px",
  zIndex: 50,
};

const sectionSpacing: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const footerStyle: CSSProperties = {
  marginTop: "16px",
  display: "flex",
  justifyContent: "flex-end",
  gap: "8px",
  flexWrap: "wrap",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 600,
};

const descriptionStyle: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  color: "var(--dialog-muted, #444444)",
};

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const DialogOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay(props, ref) {
  return (
    <DialogPrimitive.Overlay
      {...props}
      ref={ref}
      style={{ ...overlayStyle, ...props.style }}
    />
  );
});

const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(function DialogContent(
  { children, titleId, descriptionId, ...props },
  ref: ForwardedRef<ElementRef<typeof DialogPrimitive.Content>>,
) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        {...props}
        ref={ref}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        style={{ ...contentStyle, ...props.style }}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

function DialogHeader({ title, description, children }: DialogHeaderProps) {
  return (
    <div style={sectionSpacing}>
      {title}
      {description}
      {children}
    </div>
  );
}

function DialogTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <DialogPrimitive.Title id={id} style={titleStyle}>
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
    <DialogPrimitive.Description id={id} style={descriptionStyle}>
      {children}
    </DialogPrimitive.Description>
  );
}

function DialogFooter({ children }: DialogFooterProps) {
  return <div style={footerStyle}>{children}</div>;
}

export {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
};
