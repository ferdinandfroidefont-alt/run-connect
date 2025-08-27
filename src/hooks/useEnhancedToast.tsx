import { enhancedToast } from "@/components/ui/enhanced-toast";

export const useEnhancedToast = () => {
  return {
    success: (title: string, description?: string) => {
      enhancedToast.success({ title, description });
    },
    
    error: (title: string, description?: string) => {
      enhancedToast.error({ title, description });
    },
    
    warning: (title: string, description?: string) => {
      enhancedToast.warning({ title, description });
    },
    
    info: (title: string, description?: string) => {
      enhancedToast.info({ title, description });
    },
    
    loading: (title: string, description?: string) => {
      return enhancedToast.loading({ title, description });
    },
    
    promise: enhancedToast.promise,
    
    // Specific app toasts with predefined messages
    sessionCreated: () => {
      enhancedToast.success({ 
        title: "Session créée !",
        description: "Votre session a été créée avec succès"
      });
    },
    
    followRequestSent: () => {
      enhancedToast.success({ 
        title: "Demande envoyée !",
        description: "Votre demande de suivi a été envoyée"
      });
    },
    
    profileUpdated: () => {
      enhancedToast.success({ 
        title: "Profil mis à jour !",
        description: "Vos modifications ont été sauvegardées"
      });
    },
    
    locationDetected: () => {
      enhancedToast.success({ 
        title: "Position détectée !",
        description: "La carte a été centrée sur votre position"
      });
    },
    
    connectionError: () => {
      enhancedToast.error({ 
        title: "Erreur de connexion",
        description: "Vérifiez votre connexion internet"
      });
    }
  };
};