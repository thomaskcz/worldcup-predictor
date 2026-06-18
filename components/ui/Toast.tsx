"use client";

import { useEffect, useState } from "react";

type ToastVariant = "success" | "error";

type ToastProps = {
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onClose?: () => void;
};

export function Toast({
  message,
  variant = "success",
  duration = 3000,
  onClose,
}: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  const variantClasses = {
    success: "bg-emerald-600 text-white dark:bg-emerald-500",
    error: "bg-rose-600 text-white dark:bg-rose-500",
  };

  return (
    <div
      className={`fixed bottom-4 right-4 px-5 py-3 rounded-xl shadow-lg text-sm font-medium z-50 animate-in fade-in slide-in-from-bottom-4 ${variantClasses[variant]}`}
      role="alert"
    >
      {variant === "success" && <span className="mr-2">✓</span>}
      {variant === "error" && <span className="mr-2">✕</span>}
      {message}
    </div>
  );
}
