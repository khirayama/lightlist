import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getMessaging } from "firebase/messaging/sw";

declare const __LIGHTLIST_FIREBASE_CONFIG__: FirebaseOptions;

type WorkerWindowClient = {
  url: string;
  postMessage(message: unknown): void;
  focus(): Promise<WorkerWindowClient>;
};

type NotificationClickEvent = Event & {
  notification: Notification & {
    data?: {
      taskListId?: string;
      FCM_MSG?: { data?: { taskListId?: string } };
    };
  };
  waitUntil(promise: Promise<unknown>): void;
};

type MessagingServiceWorker = WorkerGlobalScope & {
  location: WorkerLocation;
  clients: {
    matchAll(options: { type: "window"; includeUncontrolled: boolean }): Promise<WorkerWindowClient[]>;
    openWindow(url: string): Promise<WorkerWindowClient | null>;
  };
  addEventListener(type: "notificationclick", listener: (event: NotificationClickEvent) => void): void;
};

const serviceWorker = globalThis as unknown as MessagingServiceWorker;

serviceWorker.addEventListener("notificationclick", (event) => {
  const data = event.notification.data;
  const taskListId = data?.FCM_MSG?.data?.taskListId ?? data?.taskListId;
  event.stopImmediatePropagation();
  event.notification.close();
  event.waitUntil(
    serviceWorker.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      (clients) => {
        const appClient = clients.find((client) => {
          const url = new URL(client.url);
          return url.origin === serviceWorker.location.origin && url.pathname.startsWith("/app/");
        });
        if (!appClient) {
          return serviceWorker.clients.openWindow(
            taskListId ? `/app/?taskListId=${encodeURIComponent(taskListId)}` : "/app/",
          );
        }
        if (taskListId) {
          appClient.postMessage({ type: "lightlist-open-task-list", taskListId });
        }
        return appClient.focus();
      },
    ),
  );
});

getMessaging(initializeApp(__LIGHTLIST_FIREBASE_CONFIG__));
