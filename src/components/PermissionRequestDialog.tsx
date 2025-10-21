import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, MapPin, Camera, Users } from 'lucide-react';
import { useMultiplatformPermissions } from '@/hooks/useMultiplatformPermissions';
import { Capacitor } from '@capacitor/core';

export const PermissionRequestDialog = () => {
  const [open, setOpen] = useState(false);
  const { 
    requestAllPermissions, 
    openSettings, 
    permissionStatus, 
    isRequesting,
    isNative,
    platform 
  } = useMultiplatformPermissions();
  
  useEffect(() => {
    // ✅ AJOUT LOGS DEBUG
    console.log('🔍 PermissionRequestDialog - État:', {
      isNative,
      platform,
      'window.CapacitorForceNative': (window as any).CapacitorForceNative,
      'Capacitor.isNativePlatform()': Capacitor.isNativePlatform(),
      hasSeenPermissions: localStorage.getItem('hasSeenPermissions')
    });
    
    // Vérifier si premier lancement (uniquement sur mobile)
    if (!isNative) {
      console.log('❌ Dialog non affiché car isNative = false');
      return;
    }
    
    const hasSeenPermissions = localStorage.getItem('hasSeenPermissions');
    if (!hasSeenPermissions) {
      console.log('✅ Premier lancement détecté, ouverture dialog...');
      setOpen(true);
    } else {
      console.log('ℹ️ Permissions déjà vues, dialog non affiché');
    }
  }, [isNative, platform]);
  
  const handleRequestPermissions = async () => {
    await requestAllPermissions();
    localStorage.setItem('hasSeenPermissions', 'true');
    
    // Fermer le dialog après un court délai pour que l'utilisateur voie le résultat
    setTimeout(() => {
      setOpen(false);
    }, 1000);
  };
  
  const handleOpenSettings = async () => {
    await openSettings();
  };

  if (!isNative) return null;
  
  const platformEmoji = platform === 'ios' ? '🍎' : '🤖';
  const isIOS = platform === 'ios';
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {platformEmoji} Autorisations nécessaires
          </DialogTitle>
          <DialogDescription>
            RunConnect a besoin de ces permissions pour fonctionner correctement
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Bell className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium">Notifications</p>
              <p className="text-xs text-muted-foreground">Recevoir les alertes de sessions</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <MapPin className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium">Localisation</p>
              <p className="text-xs text-muted-foreground">Trouver des sessions près de vous</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Camera className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium">Appareil photo</p>
              <p className="text-xs text-muted-foreground">Ajouter des photos de profil</p>
            </div>
          </div>
          
          {!isIOS && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Users className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium">Contacts</p>
                <p className="text-xs text-muted-foreground">Inviter vos amis</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleRequestPermissions}
            disabled={isRequesting}
            className="w-full"
          >
            {isRequesting ? 'Demande en cours...' : 'Autoriser les permissions'}
          </Button>
          
          {permissionStatus.hasRefused && (
            <Button 
              variant="outline" 
              onClick={handleOpenSettings}
              className="w-full"
            >
              Ouvrir les paramètres
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            onClick={() => {
              localStorage.setItem('hasSeenPermissions', 'true');
              setOpen(false);
            }}
            className="w-full text-xs"
          >
            Plus tard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
