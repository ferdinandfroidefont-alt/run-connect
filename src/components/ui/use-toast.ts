import { useToast as useToastOriginal, toast as toastOriginal } from "@/hooks/use-toast";
import { isReallyNative } from "@/lib/nativeDetection";

// Wrapper pour désactiver les toasts non-destructive sur Android
const toast: typeof toastOriginal = (props) => {
  // Garder uniquement les toasts destructive (erreurs) sur Android
  if (isReallyNative() && props.variant !== "destructive") {
    console.log('🔇 Toast non-destructive désactivé sur Android');
    return { id: "", dismiss: () => {}, update: () => {} };
  }
  return toastOriginal(props);
};

const useToast = () => {
  const original = useToastOriginal();
  return {
    ...original,
    toast,
  };
};

export { useToast, toast };
