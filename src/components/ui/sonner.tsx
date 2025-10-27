import { useTheme } from "@/contexts/ThemeContext"
import { Toaster as Sonner, toast as sonnerToast } from "sonner"
import { isReallyNative } from "@/lib/nativeDetection"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

// 🔇 Wrapper pour désactiver les toasts non-error sur Android
const toast = {
  ...sonnerToast,
  success: (...args: Parameters<typeof sonnerToast.success>) => {
    if (isReallyNative()) {
      console.log('🔇 Toast success désactivé sur Android');
      return;
    }
    return sonnerToast.success(...args);
  },
  info: (...args: Parameters<typeof sonnerToast.info>) => {
    if (isReallyNative()) {
      console.log('🔇 Toast info désactivé sur Android');
      return;
    }
    return sonnerToast.info(...args);
  },
  warning: (...args: Parameters<typeof sonnerToast.warning>) => {
    if (isReallyNative()) {
      console.log('🔇 Toast warning désactivé sur Android');
      return;
    }
    return sonnerToast.warning(...args);
  },
  loading: (...args: Parameters<typeof sonnerToast.loading>) => {
    if (isReallyNative()) {
      console.log('🔇 Toast loading désactivé sur Android');
      return;
    }
    return sonnerToast.loading(...args);
  },
  // Garder les toasts error actifs (critiques)
  error: sonnerToast.error,
};

export { Toaster, toast }
