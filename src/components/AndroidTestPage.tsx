import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ForcePermissionsButton } from '@/components/ForcePermissionsButton';
import { LocationTestButton } from '@/components/LocationTestButton';
import { GalleryTestButton } from '@/components/GalleryTestButton';
import { NotificationManager } from '@/components/NotificationManager';
import { CompatibilityTestSuite } from '@/components/CompatibilityTestSuite';
import { DeviceSpecificGuide } from '@/components/DeviceSpecificGuide';
import { MobileCompatibilityTest } from '@/components/MobileCompatibilityTest';
import { PlayStoreDiagnostic } from '@/components/PlayStoreDiagnostic';
import { ForceAndroidPermissions } from '@/components/ForceAndroidPermissions';
import { UltraSimpleAndroidTest } from '@/components/UltraSimpleAndroidTest';
import { MIUIPermissionsHelper } from '@/components/MIUIPermissionsHelper';
import { Android10MIUIFix } from '@/components/Android10MIUIFix';
import { NativeAppPermissionTest } from '@/components/NativeAppPermissionTest';

export const AndroidTestPage = () => {
  const [contactsState, setContactsState] = useState<string>('—');
  const [notifsState, setNotifsState] = useState<string>('—');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  const hasAndroidContacts = () => typeof (window as any).AndroidContacts === 'object';
  const hasAndroidNotifs = () => typeof (window as any).AndroidNotifications === 'object';
  const hasAndroidSettings = () => typeof (window as any).AndroidSettings === 'object';

  const refreshStates = async () => {
    // Contacts - Utiliser UNIQUEMENT le bridge Android
    if (hasAndroidContacts()) {
      try {
        const ok = !!(window as any).AndroidContacts.hasContactsPermission();
        setContactsState(ok ? 'autorisé ✅' : 'non autorisé ❌');
        addLog(`État contacts Android: ${ok ? 'autorisé' : 'refusé'}`);
      } catch (e) {
        setContactsState('erreur ❌');
        addLog('Erreur vérification contacts: ' + e);
      }
    } else if ((navigator as any).contacts) {
      setContactsState('web (beta) ⚠️');
    } else {
      setContactsState('non disponible');
    }

    // Notifications - Utiliser UNIQUEMENT le bridge Android
    if (hasAndroidNotifs()) {
      try {
        // Attention: cette méthode ne doit PAS demander, juste vérifier
        const ok = !!(window as any).AndroidNotifications.hasPermission();
        setNotifsState(ok ? 'autorisé ✅' : 'non autorisé ❌');
        addLog(`État notifications Android: ${ok ? 'autorisé' : 'refusé'}`);
      } catch (e) {
        // Fallback si hasPermission() n'existe pas
        setNotifsState('inconnu —');
        addLog('Impossible de vérifier les notifications Android');
      }
    } else if ("Notification" in window) {
      setNotifsState(
        Notification.permission === 'granted' ? 'autorisé ✅' :
        Notification.permission === 'denied' ? 'refusé ❌' : 'à demander…'
      );
    } else {
      setNotifsState('non disponible');
    }
  };

  const syncContacts = async () => {
    try {
      if (hasAndroidContacts()) {
        addLog('📇 Vérification des permissions contacts...');
        const hasPermissionNow = !!(window as any).AndroidContacts.hasContactsPermission();
        addLog(`Permission actuelle: ${hasPermissionNow}`);
        
        if (!hasPermissionNow) {
          addLog('❌ Pas de permission contacts - va dans les réglages Android');
          addLog('Réglages > Applications > RunConnect > Autorisations > Contacts');
          return openAppSettings();
        }
        
        addLog('📱 Récupération des contacts...');
        const raw = (window as any).AndroidContacts.getContacts();
        const contacts = JSON.parse(raw || '[]');
        addLog(`✅ ${contacts.length} contacts récupérés avec succès`);
        
        // Log quelques exemples (sans données sensibles)
        if (contacts.length > 0) {
          addLog(`Premier contact: ${contacts[0].displayName ? 'avec nom' : 'sans nom'}`);
        }
      } else if ((navigator as any).contacts && (navigator as any).contacts.select) {
        const picked = await (navigator as any).contacts.select(['name', 'tel'], {multiple: true});
        addLog(`Contacts (web) : ${picked.length}`);
      } else {
        addLog('❌ Bridge Android contacts non disponible');
      }
    } catch (e: any) {
      console.error(e);
      addLog('❌ Erreur contacts : ' + e.message);
    } finally {
      refreshStates();
    }
  };

  const requestAndroidNotifications = async () => {
    try {
      if (hasAndroidNotifs()) {
        addLog('🔔 Demande de permission notifications via Android...');
        const ok = !!(window as any).AndroidNotifications.requestPermissions();
        if (ok) {
          addLog('✅ Notifications autorisées');
        } else {
          addLog('❌ Notifications refusées - ouvre les réglages manuellement');
          openAppSettings();
        }
      } else if ("Notification" in window) {
        addLog('🔔 Demande de permission notifications web...');
        const res = await Notification.requestPermission();
        addLog('Permission notifications (web) : ' + res);
      } else {
        addLog('❌ Notifications non disponibles.');
      }
    } catch (e: any) {
      console.error(e);
      addLog('❌ Erreur notifications : ' + e.message);
    } finally {
      refreshStates();
    }
  };

  const testLocalNotification = () => {
    try {
      if (hasAndroidNotifs()) {
        (window as any).AndroidNotifications.showNotification('RunConnect ✅', 'Test de notification réussi');
        addLog('Notification locale envoyée (Android).');
      } else if ("Notification" in window && Notification.permission === 'granted') {
        new Notification('RunConnect ✅', { body: 'Test de notification (web)' });
        addLog('Notification web envoyée.');
      } else {
        addLog('Autorise d\'abord les notifications.');
      }
    } catch (e: any) {
      console.error(e);
      addLog('Erreur test notification : ' + e.message);
    }
  };

  const openAppSettings = () => {
    try {
      if (hasAndroidSettings() && typeof (window as any).AndroidSettings.openAppSettings === 'function') {
        (window as any).AndroidSettings.openAppSettings();
        addLog('Ouverture des réglages Android…');
      } else {
        alert("Va dans Réglages > Applications > RunConnect > Autorisations, puis active Contacts et Notifications.");
      }
    } catch (e: any) {
      console.error(e);
      addLog('Erreur ouverture réglages : ' + e.message);
    }
  };

  useEffect(() => {
    refreshStates();
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Paramètres du téléphone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* États */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span>📇 Contacts :</span>
              <Badge variant="outline">{contactsState}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span>🔔 Notifications :</span>
              <Badge variant="outline">{notifsState}</Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={syncContacts} className="bg-blue-600 hover:bg-blue-700">
              Synchroniser mes contacts
            </Button>
            <Button onClick={requestAndroidNotifications} className="bg-green-600 hover:bg-green-700">
              Autoriser les notifications
            </Button>
            <Button onClick={testLocalNotification} variant="secondary">
              Tester une notification
            </Button>
            <Button onClick={openAppSettings} variant="outline">
              Ouvrir les réglages Android
            </Button>
          </div>

          {/* TEST PERMISSIONS NATIVES (SANS PLUGIN) */}
          <div className="mt-6 p-4 border-4 border-blue-500 rounded-lg bg-blue-50">
            <h3 className="text-xl font-bold text-blue-700 mb-4">🔧 TEST PERMISSIONS NATIVES</h3>
            <NativeAppPermissionTest />
          </div>

          {/* FIX SPÉCIAL ANDROID 10 + MIUI */}
          <div className="mt-6 p-4 border-4 border-red-600 rounded-lg bg-red-100">
            <h3 className="text-xl font-bold text-red-800 mb-4">🚨 FIX ANDROID 10 + MIUI</h3>
            <Android10MIUIFix />
          </div>

          {/* DIAGNOSTIC SPÉCIAL MIUI/XIAOMI */}
          <div className="mt-6 p-4 border-4 border-red-500 rounded-lg bg-red-50">
            <h3 className="text-xl font-bold text-red-700 mb-4">🔥 DIAGNOSTIC SPÉCIAL XIAOMI/REDMI</h3>
            <MIUIPermissionsHelper />
          </div>

          {/* DIAGNOSTIC ULTRA SIMPLE */}
          <div className="mt-6 p-4 border-4 border-yellow-500 rounded-lg bg-yellow-50">
            <h3 className="text-xl font-bold text-yellow-700 mb-4">🔥 DIAGNOSTIC ULTRA SIMPLE</h3>
            <UltraSimpleAndroidTest />
          </div>
          
          {/* Plugin Android natif FORCÉ - NOUVEAU SYSTÈME */}
          <div className="mt-6 p-4 border-2 border-red-500 rounded-lg bg-red-50">
            <h3 className="text-lg font-bold text-red-700 mb-4">🔥 NOUVEAU - Force Android Permissions</h3>
            <ForceAndroidPermissions />
          </div>
          
          {/* Plugin Android natif FORCÉ - ANCIEN SYSTÈME */}
          <PlayStoreDiagnostic />
          <ForcePermissionsButton />
          <LocationTestButton />
          <GalleryTestButton />
          <NotificationManager />
          
          {/* Test compatibilité complète avec tous les téléphones */}
          <CompatibilityTestSuite />
          
          {/* Test de compatibilité mobile avancé */}
          <MobileCompatibilityTest />
          
          {/* Guide spécifique par marque de téléphone */}
          <DeviceSpecificGuide />
          {/* Logs */}
          <div className="space-y-2">
            <h4 className="font-medium">Logs :</h4>
            <ScrollArea className="h-40 w-full border rounded-md p-2 bg-muted/50">
              {logs.map((log, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {log}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-sm text-muted-foreground">Aucun log pour le moment...</div>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};