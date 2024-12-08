import { clsx } from "clsx";
import { useState, ReactNode } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";

export const ConfirmDialog = (props: {
  title: string;
  description: string;
  trueText: string;
  falseText: string;
  handleSelect: (val: boolean) => void;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger asChild>{props.children}</AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Overlay
          className={clsx(
            "fixed left-0 top-0 z-[500] h-full w-full bg-gray-900/50 dark:bg-gray-100/50",
            open &&
              `animate-[overlayshow_600ms_cubic-bezier(0.16,1,0.3,1)_forwards]`,
            !open &&
              `animate-[overlayhide_600ms_cubic-bezier(0.16,1,0.3,1)_forwards]`,
          )}
        />
        <AlertDialog.Content className="bg fixed left-[50%] top-[50%] z-[900] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded p-4">
          <AlertDialog.Title className="">{props.title}</AlertDialog.Title>
          <AlertDialog.Description className="">
            {props.description}
          </AlertDialog.Description>
          <div className="flex justify-end gap-[25px]">
            <AlertDialog.Cancel asChild>
              <button className="" onClick={() => props.handleSelect(false)}>
                {props.falseText}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button className="" onClick={() => props.handleSelect(true)}>
                {props.trueText}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};
