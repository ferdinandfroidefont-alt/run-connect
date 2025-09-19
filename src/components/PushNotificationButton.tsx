import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export const PushNotificationButton = () => {
  const { isRegistered, requestPermissions, isNative } = usePushNotifications();

  const handleToggleNotifications = async () => {
    if (!isNative) return;
    
    try {
      // Ouvrir directement les paramètres Android pour les notifications
      const { androidPermissions } = await import('@/lib/androidPermissions');
      const opened = await androidPermissions.openAppSettings();
      
      // On peut aussi utiliser le hook useToast ici si nécessaire
      console.log('Paramètres ouverts:', opened);
    } catch (error) {
      console.error('Erreur ouverture paramètres:', error);
    }
  };

  if (!isNative) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <BellOff className="h-4 w-4" />
        Mobile uniquement
      </Button>
    );
  }

  return (
    <Button 
      variant={isRegistered ? "default" : "outline"} 
      onClick={handleToggleNotifications}
      className="gap-2"
      disabled={!isNative}
    >
      <>
        <Bell className="h-4 w-4" />
        Paramètres notifications
      </>
    </Button>
  );
};