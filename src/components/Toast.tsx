"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { IoCheckmarkCircle, IoCloseCircle, IoClose } from "react-icons/io5";

type ToastType = "success" | "error";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
              t.type === "success"
                ? "bg-green-900/90 text-green-100"
                : "bg-red-900/90 text-red-100"
            }`}
          >
            {t.type === "success" ? (
              <IoCheckmarkCircle className="h-5 w-5 shrink-0" />
            ) : (
              <IoCloseCircle className="h-5 w-5 shrink-0" />
            )}
            <span>{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="ml-2 shrink-0 hover:opacity-70">
              <IoClose className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
