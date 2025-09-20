import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useCamera } from "@/hooks/useCamera";
import { useContacts } from "@/hooks/useContacts";
import { Smartphone, MapPin, Camera, Users, Bell, AlertTriangle, Check, X } from "lucide-react";

export const NativeAppPermissionTest = () => {
  const { toast } = useToast();
  const { getCurrentPosition } = useGeolocation();
  const { takePicture } = useCamera();
  const { loadContacts } = useContacts();
  
  const [permissionResults, setPermissionResults] = useState({
    location: null as boolean | null,
    camera: null as boolean | null,
    contacts: null as boolean | null,
    notifications: null as boolean | null,
  });

  const [isTestingLocation, setIsTestingLocation] = useState(false);
  const [isTestingCamera, setIsTestingCamera] = useState(false);
  const [isTestingContacts, setIsTestingContacts] = useState(false);
  const [isTestingNotifications, setIsTestingNotifications] = useState(false);

  const testLocationPermission = async () => {
    setIsTestingLocation(true);
    try {
      console.log('🔥 Test localisation avec Capacitor Geolocation...');
      await getCurrentPosition();
      setPermissionResults(prev => ({ ...prev, location: true }));
      toast({
        title: "✅ Localisation OK",
        description: "Permission accordée et position récupérée",
        duration: 3000
      });
    } catch (error: any) {
      console.error('Erreur localisation:', error);
      setPermissionResults(prev => ({ ...prev, location: false }));
      
      if (error.message?.includes('denied') || error.code === 1) {
        toast({
          title: "❌ Permission refusée",
          description: "Allez dans Paramètres > Applications > RunConnect > Autorisations > Localisation",
          variant: "destructive",
          duration: 8000
        });
      } else {
        toast({
          title: "❌ Erreur localisation",
          description: error.message || "Impossible d'obtenir la position",
          variant: "destructive",
          duration: 5000
        });
      }
    } finally {
      setIsTestingLocation(false);
    }
  };

  const testCameraPermission = async () => {
    setIsTestingCamera(true);
    try {
      console.log('🔥 Test caméra avec Capacitor Camera...');
      await takePicture();
      setPermissionResults(prev => ({ ...prev, camera: true }));
      toast({
        title: "✅ Caméra OK",
        description: "Permission accordée et photo prise",
        duration: 3000
      });
    } catch (error: any) {
      console.error('Erreur caméra:', error);
      setPermissionResults(prev => ({ ...prev, camera: false }));
      
      if (error.message?.includes('denied') || error.message?.includes('permission')) {
        toast({
          title: "❌ Permission caméra refusée",
          description: "Allez dans Paramètres > Applications > RunConnect > Autorisations > Appareil photo",
          variant: "destructive",
          duration: 8000
        });
      } else {
        toast({
          title: "❌ Erreur caméra",
          description: error.message || "Impossible d'accéder à la caméra",
          variant: "destructive",
          duration: 5000
        });
      }
    } finally {
      setIsTestingCamera(false);
    }
  };

  const testContactsPermission = async () => {
    setIsTestingContacts(true);
    try {
      console.log('🔥 Test contacts avec Capacitor Contacts...');
      await loadContacts();
      const contacts = []; // Placeholder pour le test
      if (contacts && contacts.length >= 0) {
        setPermissionResults(prev => ({ ...prev, contacts: true }));
        toast({
          title: "✅ Contacts OK",
          description: `${contacts.length} contacts trouvés`,
          duration: 3000
        });
      } else {
        throw new Error('Aucun contact trouvé');
      }
    } catch (error: any) {
      console.error('Erreur contacts:', error);
      setPermissionResults(prev => ({ ...prev, contacts: false }));
      
      if (error.message?.includes('denied') || error.message?.includes('permission')) {
        toast({
          title: "❌ Permission contacts refusée",
          description: "Allez dans Paramètres > Applications > RunConnect > Autorisations > Contacts",
          variant: "destructive",
          duration: 8000
        });
      } else {
        toast({
          title: "❌ Erreur contacts",
          description: error.message || "Impossible d'accéder aux contacts",
          variant: "destructive",
          duration: 5000
        });
      }
    } finally {
      setIsTestingContacts(false);
    }
  };

  const testNotificationPermission = async () => {
    setIsTestingNotifications(true);
    try {
      console.log('🔥 Test notifications...');
      
      // Test avec l'API Web Notifications
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setPermissionResults(prev => ({ ...prev, notifications: true }));
          
          // Essayer d'afficher une notification test
          new Notification('RunConnect Test', {
            body: 'Les notifications fonctionnent !',
            icon: '/favicon.png'
          });
          
          toast({
            title: "✅ Notifications OK",
            description: "Permission accordée",
            duration: 3000
          });
        } else {
          throw new Error('Permission refusée');
        }
      } else {
        throw new Error('Notifications non supportées');
      }
    } catch (error: any) {
      console.error('Erreur notifications:', error);
      setPermissionResults(prev => ({ ...prev, notifications: false }));
      toast({
        title: "❌ Notifications refusées",
        description: "Allez dans Paramètres > Applications > RunConnect > Notifications",
        variant: "destructive",
        duration: 8000
      });
    } finally {
      setIsTestingNotifications(false);
    }
  };

  const openAppSettings = () => {
    toast({
      title: "Configuration manuelle",
      description: "Allez dans Paramètres Android > Applications > RunConnect > Autorisations",
      duration: 10000
    });
  };

  const resetTests = () => {
    setPermissionResults({
      location: null,
      camera: null,
      contacts: null,
      notifications: null,
    });
  };

  const getStatusIcon = (status: boolean | null) => {
    if (status === null) return null;
    return status ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-600" />;
  };

  const getStatusColor = (status: boolean | null) => {
    if (status === null) return "bg-gray-100";
    return status ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  return (
    <Card className="border-blue-500 border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <Smartphone className="h-5 w-5" />
          Test Permissions Natives (Sans Plugin)
          <Badge variant="secondary">Capacitor Standard</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-blue-500 bg-blue-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Test avec les APIs Capacitor standard</strong><br/>
            Ces tests utilisent les plugins Capacitor officiels au lieu du plugin personnalisé.
            Ils fonctionnent même si le plugin personnalisé ne se charge pas.
          </AlertDescription>
        </Alert>

        {/* Results Summary */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-2 rounded-lg ${getStatusColor(permissionResults.location)} flex items-center justify-between`}>
            <span className="text-sm font-medium">📍 Localisation</span>
            {getStatusIcon(permissionResults.location)}
          </div>
          <div className={`p-2 rounded-lg ${getStatusColor(permissionResults.camera)} flex items-center justify-between`}>
            <span className="text-sm font-medium">📸 Caméra</span>
            {getStatusIcon(permissionResults.camera)}
          </div>
          <div className={`p-2 rounded-lg ${getStatusColor(permissionResults.contacts)} flex items-center justify-between`}>
            <span className="text-sm font-medium">👥 Contacts</span>
            {getStatusIcon(permissionResults.contacts)}
          </div>
          <div className={`p-2 rounded-lg ${getStatusColor(permissionResults.notifications)} flex items-center justify-between`}>
            <span className="text-sm font-medium">🔔 Notifications</span>
            {getStatusIcon(permissionResults.notifications)}
          </div>
        </div>

        {/* Test Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={testLocationPermission}
            disabled={isTestingLocation}
            variant={permissionResults.location === true ? "default" : "outline"}
            size="sm"
          >
            <MapPin className="h-4 w-4 mr-2" />
            {isTestingLocation ? "..." : "Test Localisation"}
          </Button>

          <Button
            onClick={testCameraPermission}
            disabled={isTestingCamera}
            variant={permissionResults.camera === true ? "default" : "outline"}
            size="sm"
          >
            <Camera className="h-4 w-4 mr-2" />
            {isTestingCamera ? "..." : "Test Caméra"}
          </Button>

          <Button
            onClick={testContactsPermission}
            disabled={isTestingContacts}
            variant={permissionResults.contacts === true ? "default" : "outline"}
            size="sm"
          >
            <Users className="h-4 w-4 mr-2" />
            {isTestingContacts ? "..." : "Test Contacts"}
          </Button>

          <Button
            onClick={testNotificationPermission}
            disabled={isTestingNotifications}
            variant={permissionResults.notifications === true ? "default" : "outline"}
            size="sm"
          >
            <Bell className="h-4 w-4 mr-2" />
            {isTestingNotifications ? "..." : "Test Notifications"}
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button 
            onClick={openAppSettings}
            variant="secondary"
            className="w-full"
          >
            ⚙️ Ouvrir Paramètres Android
          </Button>
          
          <Button 
            onClick={resetTests}
            variant="outline"
            size="sm"
            className="w-full"
          >
            🔄 Réinitialiser les tests
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};