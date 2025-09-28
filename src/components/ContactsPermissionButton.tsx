import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContacts } from "@/hooks/useContacts";
import { useToast } from "@/hooks/use-toast";

export const ContactsPermissionButton = () => {
  const { isNative, hasPermission, requestPermissions } = useContacts();
  const { toast } = useToast();

  // Debug logs
  console.log('🔍 ContactsPermissionButton render - isNative:', isNative, 'hasPermission:', hasPermission);

  const handleRequestPermission = async () => {
    console.log('👥 ContactsPermissionButton - demande directe de permissions');
    
    if (!isNative) {
      toast({
        title: "Fonction mobile uniquement",
        description: "L'accès aux contacts n'est disponible que sur l'application mobile",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('👥 Demande de permissions contacts...');
      const granted = await requestPermissions();
      
      if (granted) {
        toast({
          title: "Permissions accordées",
          description: "Vous pouvez maintenant accéder à vos contacts",
          variant: "default"
        });
      } else {
        toast({
          title: "Permissions refusées",
          description: "Allez dans Paramètres > Applications > RunConnect > Autorisations > Contacts pour les activer manuellement",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('👥❌ Erreur demande permissions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de demander les permissions. Vérifiez les paramètres de votre téléphone.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Smartphone className="h-4 w-4" />
        <div className="grid gap-1.5">
          <label className="text-sm font-medium leading-none">
            Accès aux contacts
          </label>
          <p className="text-xs text-muted-foreground">
            {isNative ? "Trouvez vos amis dans vos contacts" : "Disponible uniquement sur mobile"}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRequestPermission}
        disabled={!isNative}
      >
        {hasPermission ? 'Accordé ✓' : (isNative ? 'Autoriser' : 'Mobile uniquement')}
      </Button>
    </div>
  );
};