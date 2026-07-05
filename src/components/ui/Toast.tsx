import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  exiting?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type: ToastType, duration?: number) => string;
  updateToast: (id: string, updates: Partial<Pick<Toast, 'message' | 'type' | 'duration'>>) => void;
  toastPromise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string | ((value: T) => string); error: string | ((error: unknown) => string) }
  ) => Promise<T>;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);
const TOAST_LIMIT = 4;
const EXIT_ANIMATION_MS = 220;

const getDefaultDuration = (type: ToastType) => (type === 'loading' ? 0 : 4000);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const finalizeRemove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((toast) => (
      toast.id === id ? { ...toast, exiting: true } : toast
    )));
    window.setTimeout(() => finalizeRemove(id), EXIT_ANIMATION_MS);
  }, [finalizeRemove]);

  const showToast = useCallback((message: string, type: ToastType, duration = getDefaultDuration(type)) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { id, message, type, duration };

    setToasts((prev) => [...prev, newToast].slice(-TOAST_LIMIT));
    return id;
  }, []);

  const updateToast = useCallback((
    id: string,
    updates: Partial<Pick<Toast, 'message' | 'type' | 'duration'>>
  ) => {
    setToasts((prev) => prev.map((toast) => {
      if (toast.id !== id) return toast;
      const nextType = updates.type ?? toast.type;
      return {
        ...toast,
        ...updates,
        type: nextType,
        duration: updates.duration ?? getDefaultDuration(nextType),
        exiting: false,
      };
    }));
  }, []);

  const toastPromise = useCallback(async <T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string | ((value: T) => string); error: string | ((error: unknown) => string) }
  ) => {
    const id = showToast(messages.loading, 'loading', 0);
    try {
      const value = await promise;
      updateToast(id, {
        type: 'success',
        message: typeof messages.success === 'function' ? messages.success(value) : messages.success,
      });
      return value;
    } catch (error) {
      updateToast(id, {
        type: 'error',
        message: typeof messages.error === 'function' ? messages.error(error) : messages.error,
      });
      throw error;
    }
  }, [showToast, updateToast]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (document.querySelector('[data-confirm-dialog="true"]')) return;
      setToasts((prev) => {
        const latest = [...prev].reverse().find((toast) => !toast.exiting);
        if (!latest) return prev;
        window.setTimeout(() => finalizeRemove(latest.id), EXIT_ANIMATION_MS);
        return prev.map((toast) => (
          toast.id === latest.id ? { ...toast, exiting: true } : toast
        ));
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [finalizeRemove]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, updateToast, toastPromise, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef(0);
  const remainingRef = useRef(toast.duration);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startTimer = useCallback((duration: number) => {
    clearTimer();
    if (duration <= 0 || toast.exiting) return;
    remainingRef.current = duration;
    startedAtRef.current = Date.now();
    timeoutRef.current = setTimeout(() => onRemove(toast.id), duration);
  }, [clearTimer, onRemove, toast.exiting, toast.id]);

  useEffect(() => {
    startTimer(toast.duration);
    return clearTimer;
  }, [clearTimer, startTimer, toast.duration, toast.type, toast.message]);

  const pauseTimer = () => {
    if (!timeoutRef.current) return;
    const elapsed = Date.now() - startedAtRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    clearTimer();
  };

  const resumeTimer = () => {
    startTimer(remainingRef.current);
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
    }
  };

  const getBgColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'loading':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className={`
      flex items-center gap-3 p-4 rounded-lg border shadow-lg
      ${toast.exiting ? 'toast-slide-out' : 'toast-slide-in'}
      ${getBgColor()}
    `}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
    >
      {getIcon()}
      <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
        {toast.message}
      </span>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
