import { Toaster as Sonner, toast as sonnerToast } from "sonner"
import { isReallyNative } from "@/lib/nativeDetection"
import { useTheme } from "@/contexts/ThemeContext"

type ToasterProps = React.ComponentProps<typeof Sonner>

const ToasterInner = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()
  const sonnerTheme = resolvedTheme === "dark" ? "dark" : "light"

  return (
    <Sonner
      theme={sonnerTheme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background/88 group-[.toaster]:dark:bg-background/82 group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border/55 group-[.toaster]:rounded-2xl group-[.toaster]:shadow-xl group-[.toaster]:ring-1 group-[.toaster]:ring-black/[0.04] dark:group-[.toaster]:ring-white/[0.06]",
          title: "group-[.toast]:text-[15px] group-[.toast]:font-semibold group-[.toast]:tracking-tight",
          description:
            "group-[.toast]:text-muted-foreground group-[.toast]:text-[13px] group-[.toast]:leading-snug",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-xl group-[.toast]:font-semibold",
          cancelButton:
            "group-[.toast]:bg-muted/90 group-[.toast]:text-muted-foreground group-[.toast]:rounded-xl",
        },
      }}
      {...props}
    />
  )
}

const Toaster = (props: ToasterProps) => {
  return <ToasterInner {...props} />
}

// 🔇 Wrapper pour désactiver les toasts non-error sur natif (iOS + Android)
const toast = {
  ...sonnerToast,
  success: (...args: Parameters<typeof sonnerToast.success>) => {
    if (isReallyNative()) {
      console.log('🔇 Toast success désactivé sur natif');
      return;
    }
    return sonnerToast.success(...args);
  },
  info: (...args: Parameters<typeof sonnerToast.info>) => {
    if (isReallyNative()) {
      console.log('🔇 Toast info désactivé sur natif');
      return;
    }
    return sonnerToast.info(...args);
  },
  warning: (...args: Parameters<typeof sonnerToast.warning>) => {
    if (isReallyNative()) {
      console.log('🔇 Toast warning désactivé sur natif');
      return;
    }
    return sonnerToast.warning(...args);
  },
  loading: (...args: Parameters<typeof sonnerToast.loading>) => {
    if (isReallyNative()) {
      console.log('🔇 Toast loading désactivé sur natif');
      return;
    }
    return sonnerToast.loading(...args);
  },
  error: sonnerToast.error,
};

export { Toaster, toast }
