import { useState, useEffect, ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { clsx } from "clsx";
import { useRouter } from "next/router";
import qs from "query-string";

import { Icon } from "components/Icon";

export function ParamsSheet(props: {
  children: ReactNode;
  title: string;
  open: (q?: Query) => boolean;
}) {
  const router = useRouter();
  const query = qs.parse(window.location.search);
  const [isOpen, setIsOpen] = useState<boolean>(props.open(query));
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [trigger, setTrigger] = useState<string>(
    (query.trigger as string) || "",
  );

  useEffect(() => {
    const handleRouteChange = () => {
      const query = qs.parse(window.location.search);

      if (!props.open(query)) {
        setTimeout(() => {
          setIsOpen(false);
          setIsClosing(false);
          if (trigger) {
            const el = document.querySelector<
              HTMLAnchorElement | HTMLButtonElement
            >(`[data-trigger=${trigger}]`);
            setTimeout(() => {
              el.focus();
              setTrigger("");
            }, 0);
          }
        }, 600);
      } else {
        setTrigger((query.trigger as string) || "");
        setIsOpen(true);
      }
    };

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router]);

  return (
    <RadixDialog.Root
      open={isOpen}
      onOpenChange={(o) => {
        if (!o && !isClosing) {
          setIsClosing(true);
          router.back();
        }
      }}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className={clsx(
            "fixed left-0 top-0 z-[100] h-full w-full bg-gray-900/50 dark:bg-gray-100/50",
            props.open(query) &&
              `animate-[overlayshow_600ms_cubic-bezier(0.16,1,0.3,1)_forwards]`,
            !props.open(query) &&
              `animate-[overlayhide_600ms_cubic-bezier(0.16,1,0.3,1)_forwards]`,
          )}
        />
        <RadixDialog.Content
          className={clsx(
            "bg fixed bottom-0 left-1/2 z-[400] mx-auto flex max-h-[95%] min-h-[80%] w-full max-w-2xl translate-x-[-50%] flex-col overflow-hidden rounded-t-lg shadow-lg",
            props.open(query) &&
              `animate-[contentshow_600ms_cubic-bezier(0.16,1,0.3,1)_forwards]`,
            !props.open(query) &&
              `animate-[contenthide_600ms_cubic-bezier(0.16,1,0.3,1)_forwards]`,
          )}
        >
          <header className="sticky top-0 flex w-full items-center justify-center p-4">
            <RadixDialog.Title className="flex-1 text-center font-bold">
              {props.title}
            </RadixDialog.Title>
            <div className="absolute right-0 top-0 p-2">
              <RadixDialog.Close className="rounded p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700">
                <Icon text="close" />
              </RadixDialog.Close>
            </div>
          </header>
          <div className="bg h-full w-full flex-1 overflow-scroll">
            {props.children}
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
