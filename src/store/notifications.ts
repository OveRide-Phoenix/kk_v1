import { create } from "zustand";

type NotificationSeverity = "info" | "success" | "warning" | "error";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  severity: NotificationSeverity;
  href?: string;
};

type CreateNotificationInput = {
  id?: string;
  title: string;
  message: string;
  severity?: NotificationSeverity;
  href?: string;
};

type NotificationStore = {
  notifications: NotificationItem[];
  addNotification: (notification: CreateNotificationInput) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
};

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const MAX_NOTIFICATIONS = 50;

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  addNotification: (notification) =>
    set((state) => {
      const id = notification.id ?? generateId();
      const created: NotificationItem = {
        id,
        title: notification.title,
        message: notification.message,
        severity: notification.severity ?? "info",
        timestamp: Date.now(),
        read: false,
        href: notification.href,
      };
      const withoutDuplicate = state.notifications.filter((item) => item.id !== id);
      return {
        notifications: [created, ...withoutDuplicate].slice(0, MAX_NOTIFICATIONS),
      };
    }),
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    })),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    })),
  clearNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id),
    })),
  clearAll: () => set({ notifications: [] }),
}));
