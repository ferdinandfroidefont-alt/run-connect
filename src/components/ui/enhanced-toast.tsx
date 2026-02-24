import { toast as sonnerToast } from "sonner";
import { CheckCircle, XCircle, AlertCircle, Info, Loader2 } from "lucide-react";
import { isReallyNative } from "@/lib/nativeDetection";

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

interface EnhancedToastOptions {
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const getToastIcon = (type: ToastType) => {
  switch (type) {
    case "success":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "error":
      return <XCircle className="h-5 w-5 text-red-500" />;
    case "warning":
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    case "info":
      return <Info className="h-5 w-5 text-blue-500" />;
    case "loading":
      return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
    default:
      return null;
  }
};

const getToastStyles = (type: ToastType) => {
  const baseStyles = "flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm";
  
  switch (type) {
    case "success":
      return `${baseStyles} bg-green-50/90 border-green-200`;
    case "error":
      return `${baseStyles} bg-red-50/90 border-red-200`;
    case "warning":
      return `${baseStyles} bg-yellow-50/90 border-yellow-200`;
    case "info":
      return `${baseStyles} bg-blue-50/90 border-blue-200`;
    case "loading":
      return `${baseStyles} bg-background/90 border-border`;
    default:
      return `${baseStyles} bg-background/90 border-border`;
  }
};

export const enhancedToast = {
  success: (options: EnhancedToastOptions) => {
    // 🔇 Désactiver les toasts de succès sur Android
    if (isReallyNative()) {
      console.log('🔇 Toast success désactivé sur Android:', options.title);
      return null;
    }
    
    return sonnerToast.custom((t) => (
      <div className={getToastStyles("success")}>
        {getToastIcon("success")}
        <div className="flex-1">
          <div className="font-semibold text-green-900">
            {options.title}
          </div>
          {options.description && (
            <div className="text-sm text-green-700 mt-1">
              {options.description}
            </div>
          )}
        </div>
        {options.action && (
          <button
            onClick={() => {
              options.action?.onClick();
              sonnerToast.dismiss(t);
            }}
            className="text-sm font-medium text-green-700 hover:text-green-800"
          >
            {options.action.label}
          </button>
        )}
      </div>
    ), { duration: options.duration || 4000 });
  },

  error: (options: EnhancedToastOptions) => {
    return sonnerToast.custom((t) => (
      <div className={getToastStyles("error")}>
        {getToastIcon("error")}
        <div className="flex-1">
          <div className="font-semibold text-red-900">
            {options.title}
          </div>
          {options.description && (
            <div className="text-sm text-red-700 mt-1">
              {options.description}
            </div>
          )}
        </div>
        {options.action && (
          <button
            onClick={() => {
              options.action?.onClick();
              sonnerToast.dismiss(t);
            }}
            className="text-sm font-medium text-red-700 hover:text-red-800"
          >
            {options.action.label}
          </button>
        )}
      </div>
    ), { duration: options.duration || 5000 });
  },

  warning: (options: EnhancedToastOptions) => {
    // 🔇 Désactiver les toasts warning sur Android
    if (isReallyNative()) {
      console.log('🔇 Toast warning désactivé sur Android:', options.title);
      return null;
    }
    
    return sonnerToast.custom((t) => (
      <div className={getToastStyles("warning")}>
        {getToastIcon("warning")}
        <div className="flex-1">
          <div className="font-semibold text-yellow-900">
            {options.title}
          </div>
          {options.description && (
            <div className="text-sm text-yellow-700 mt-1">
              {options.description}
            </div>
          )}
        </div>
        {options.action && (
          <button
            onClick={() => {
              options.action?.onClick();
              sonnerToast.dismiss(t);
            }}
            className="text-sm font-medium text-yellow-700 hover:text-yellow-800"
          >
            {options.action.label}
          </button>
        )}
      </div>
    ), { duration: options.duration || 4000 });
  },

  info: (options: EnhancedToastOptions) => {
    // 🔇 Désactiver les toasts info sur Android
    if (isReallyNative()) {
      console.log('🔇 Toast info désactivé sur Android:', options.title);
      return null;
    }
    
    return sonnerToast.custom((t) => (
      <div className={getToastStyles("info")}>
        {getToastIcon("info")}
        <div className="flex-1">
          <div className="font-semibold text-blue-900">
            {options.title}
          </div>
          {options.description && (
            <div className="text-sm text-blue-700 mt-1">
              {options.description}
            </div>
          )}
        </div>
        {options.action && (
          <button
            onClick={() => {
              options.action?.onClick();
              sonnerToast.dismiss(t);
            }}
            className="text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            {options.action.label}
          </button>
        )}
      </div>
    ), { duration: options.duration || 4000 });
  },

  loading: (options: EnhancedToastOptions) => {
    // 🔇 Désactiver les toasts loading sur Android
    if (isReallyNative()) {
      console.log('🔇 Toast loading désactivé sur Android:', options.title);
      return null;
    }
    
    return sonnerToast.custom((t) => (
      <div className={getToastStyles("loading")}>
        {getToastIcon("loading")}
        <div className="flex-1">
          <div className="font-semibold">
            {options.title}
          </div>
          {options.description && (
            <div className="text-sm text-muted-foreground mt-1">
              {options.description}
            </div>
          )}
        </div>
      </div>
    ), { duration: options.duration || Infinity });
  },

  promise: <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: EnhancedToastOptions;
      success: (data: T) => EnhancedToastOptions;
      error: (error: any) => EnhancedToastOptions;
    }
  ) => {
    const toastId = enhancedToast.loading(loading);
    
    return promise
      .then((data) => {
        sonnerToast.dismiss(toastId);
        enhancedToast.success(success(data));
        return data;
      })
      .catch((err) => {
        sonnerToast.dismiss(toastId);
        enhancedToast.error(error(err));
        throw err;
      });
  },
};