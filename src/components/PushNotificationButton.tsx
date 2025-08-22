import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export const PushNotificationButton = () => {
  const { isRegistered, requestPermissions, isNative } = usePushNotifications();

  const handleToggleNotifications = async () => {
    if (!isRegistered) {
      await requestPermissions();
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
      disabled={isRegistered}
    >
      {isRegistered ? (
        <>
          <Bell className="h-4 w-4" />
          Notifications activées
        </>
      ) : (
        <>
          <BellOff className="h-4 w-4" />
          Activer les notifications
        </>
      )}
    </Button>
  );
};