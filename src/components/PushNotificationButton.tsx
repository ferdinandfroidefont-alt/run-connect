import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/hooks/use-toast";

export const PushNotificationButton = () => {
  const { isRegistered, requestPermissions, isNative, permissionStatus } = usePushNotifications();
  const { toast } = useToast();

  const handleToggleNotifications = async () => {
    if (!isNative) return;
    
    try {
      console.log('🔔 Demande de permissions notifications...');
      const granted = await requestPermissions();
      
      if (granted) {
        toast({
          title: "Notifications activées !",
          description: "Vous recevrez les notifications de RunConnect",
        });
      }
    } catch (error) {
      console.error('❌ Erreur demande permissions notifications:', error);
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
      variant={permissionStatus.granted ? "default" : "outline"} 
      onClick={handleToggleNotifications}
      className="gap-2"
      disabled={!isNative}
    >
      <>
        {permissionStatus.granted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        {permissionStatus.granted ? "Notifications ON" : "Activer notifications"}
      </>
    </Button>
  );
};