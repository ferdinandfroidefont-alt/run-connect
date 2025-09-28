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
      await requestPermissions();
      toast({
        title: "Notifications",
        description: "Permissions de notifications demandées",
      });
    } catch (error) {
      console.error('❌ Erreur demande permissions notifications:', error);
      toast({
        title: "Erreur",
        description: "Impossible de demander les permissions notifications",
        variant: "destructive",
      });
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