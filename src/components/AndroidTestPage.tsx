import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    // Contacts - Vérifier à la fois Android bridge ET Capacitor
    if (hasAndroidContacts()) {
      try {
        const androidOk = !!(window as any).AndroidContacts.hasContactsPermission();
        addLog(`Android bridge permission: ${androidOk}`);
        
        // Aussi vérifier Capacitor si disponible
        try {
          const { Contacts } = await import('@capacitor-community/contacts');
          const capacitorResult = await Contacts.checkPermissions();
          const capacitorOk = capacitorResult.contacts === 'granted';
          addLog(`Capacitor permission: ${capacitorOk}`);
          
          // Synchroniser si différent
          if (androidOk !== capacitorOk) {
            addLog('⚠️ Désynchronisation détectée entre Android et Capacitor');
          }
          
          setContactsState(androidOk ? 'autorisé ✅' : 'non autorisé ❌');
        } catch (capError) {
          addLog('Capacitor contacts non disponible');
          setContactsState(androidOk ? 'autorisé ✅' : 'non autorisé ❌');
        }
      } catch (e) {
        setContactsState('inconnu —');
      }
    } else if ((navigator as any).contacts) {
      setContactsState('web (beta) ⚠️');
    } else {
      setContactsState('non disponible');
    }

    // Notifications
    if (hasAndroidNotifs()) {
      try {
        // Note: requestPermissions() returns true if already granted, false if denied
        const ok = !!(window as any).AndroidNotifications.requestPermissions();
        setNotifsState(ok ? 'autorisé ✅' : 'non autorisé ❌');
      } catch (e) {
        setNotifsState('inconnu —');
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
        // D'abord vérifier les permissions système
        const hasAndroidPerm = !!(window as any).AndroidContacts.hasContactsPermission();
        addLog(`Permission Android système: ${hasAndroidPerm}`);
        
        // Si pas de permission, demander via Capacitor pour sync
        if (!hasAndroidPerm) {
          addLog('Tentative de synchronisation des permissions...');
          try {
            const { Contacts } = await import('@capacitor-community/contacts');
            const result = await Contacts.requestPermissions();
            addLog(`Résultat demande Capacitor: ${result.contacts}`);
            
            // Re-vérifier après demande
            const hasAndroidPermAfter = !!(window as any).AndroidContacts.hasContactsPermission();
            addLog(`Permission Android après sync: ${hasAndroidPermAfter}`);
            
            if (!hasAndroidPermAfter) {
              addLog('❌ Permissions toujours refusées. Ouvre les réglages.');
              return openAppSettings();
            }
          } catch (syncError) {
            addLog('❌ Erreur sync permissions: ' + syncError);
            return openAppSettings();
          }
        }
        
        const raw = (window as any).AndroidContacts.getContacts();
        const contacts = JSON.parse(raw || '[]');
        addLog(`✅ Contacts synchronisés : ${contacts.length}`);
      } else if ((navigator as any).contacts && (navigator as any).contacts.select) {
        const picked = await (navigator as any).contacts.select(['name', 'tel'], {multiple: true});
        addLog(`Contacts (web) : ${picked.length}`);
      } else {
        addLog('Contacts non disponibles dans ce navigateur.');
      }
    } catch (e: any) {
      console.error(e);
      addLog('Erreur synchro contacts : ' + e.message);
    } finally {
      refreshStates();
    }
  };

  const requestAndroidNotifications = async () => {
    try {
      if (hasAndroidNotifs()) {
        const ok = !!(window as any).AndroidNotifications.requestPermissions();
        if (ok) {
          addLog('Notifications autorisées ✅');
        } else {
          addLog('Notifications refusées ou désactivées ❌ — ouvre les réglages.');
          openAppSettings();
        }
      } else if ("Notification" in window) {
        const res = await Notification.requestPermission();
        addLog('Permission notifications (web) : ' + res);
      } else {
        addLog('Notifications non disponibles.');
      }
    } catch (e: any) {
      console.error(e);
      addLog('Erreur notifications : ' + e.message);
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