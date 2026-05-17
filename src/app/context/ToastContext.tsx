import { createContext, useContext, useState, useCallback } from "react";
import { ToastMessage, ToastPriority, ToastType } from "../components/ui/Toast";

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (
    message: string,
    type?: ToastType,
    duration?: number,
    options?: { priority?: ToastPriority; dedupeKey?: string }
  ) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((
    message: string,
    type: ToastType = "info",
    duration?: number,
    options?: { priority?: ToastPriority; dedupeKey?: string }
  ) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const priority = options?.priority ?? "normal";
    const newToast: ToastMessage = {
      id,
      message,
      type,
      duration,
      priority,
      dedupeKey: options?.dedupeKey,
      createdAt: Date.now(),
    };

    setToasts((prev) => {
      if (options?.dedupeKey && prev.some((toast) => toast.dedupeKey === options.dedupeKey)) {
        return prev;
      }

      const priorityRank: Record<ToastPriority, number> = { high: 0, normal: 1, low: 2 };
      return [...prev, newToast]
        .sort((a, b) => priorityRank[a.priority ?? "normal"] - priorityRank[b.priority ?? "normal"])
        .slice(0, 5);
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
