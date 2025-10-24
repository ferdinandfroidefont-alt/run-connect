import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const TestLocalNotificationButton = () => {
  const { toast } = useToast();

  const sendTestNotification = () => {
    if (typeof (window as any).AndroidBridge?.sendTestNotification === 'function') {
      console.log('🔔 [TEST] Envoi notification test...');
      
      // Écouter le résultat
      const handler = (event: any) => {
        window.removeEventListener('testNotificationSent', handler);
        
        if (event.detail?.success) {
          toast({
            title: "Notification envoyée !",
            description: "Vérifiez votre barre de notification"
          });
        } else {
          toast({
            title: "Erreur",
            description: "Impossible d'envoyer la notification",
            variant: "destructive"
          });
        }
      };
      
      window.addEventListener('testNotificationSent', handler);
      
      // Envoyer la notification test
      (window as any).AndroidBridge.sendTestNotification(
        "Test RunConnect",
        "Ceci est une notification test locale. Si vous la voyez, les notifications fonctionnent correctement !"
      );
    } else {
      toast({
        title: "Fonction non disponible",
        description: "Cette fonction nécessite l'application native Android",
        variant: "destructive"
      });
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={sendTestNotification}
      className="gap-2"
    >
      <Bell className="h-4 w-4" />
      Test notification locale
    </Button>
  );
};
