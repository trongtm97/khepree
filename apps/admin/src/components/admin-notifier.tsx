"use client";

import { cn } from "@khepree/ui";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "success" | "error";

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type Notifier = {
  notify: (message: string, variant: ToastVariant) => void;
};

const AdminNotifierContext = createContext<Notifier | null>(null);

function playUiTone(variant: ToastVariant) {
  try {
    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = variant === "success" ? 880 : 330;
    gain.gain.value = 0.06;
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18);
    oscillator.stop(audio.currentTime + 0.18);
    void audio.close();
  } catch {
    // ponytail: autoplay policy may block audio until user gesture — toast still shows
  }
}

export function AdminNotifierProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const idRef = useRef(0);

  const notify = useCallback((message: string, variant: ToastVariant) => {
    idRef.current += 1;
    setToast({ id: idRef.current, message, variant });
    playUiTone(variant);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <AdminNotifierContext.Provider value={{ notify }}>
      {children}
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "pointer-events-none fixed bottom-20 left-1/2 z-50 max-w-[min(92vw,28rem)] -translate-x-1/2 rounded-[var(--radius-control)] px-4 py-3 text-sm font-medium shadow-lg",
            toast.variant === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-red-200 bg-red-50 text-red-900",
          )}
        >
          {toast.message}
        </div>
      ) : null}
    </AdminNotifierContext.Provider>
  );
}

export function useAdminNotifier(): Notifier {
  const ctx = useContext(AdminNotifierContext);
  return ctx ?? { notify: () => {} };
}
