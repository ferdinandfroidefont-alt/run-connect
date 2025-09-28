import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export const AndroidVersionStrategy = () => {
  const strategies = [
    {
      version: 'Android 13+ (API 33+)',
      status: 'optimal',
      method: 'POST_NOTIFICATIONS',
      description: 'Permission POST_NOTIFICATIONS requise explicitement',
      compatibility: '100%',
      notes: 'Plugin Android personnalisé + fallback Capacitor'
    },
    {
      version: 'Android 12 (API 31-32)',
      status: 'excellent',
      method: 'Notification Channels',
      description: 'Gestion via canaux de notification',
      compatibility: '100%',
      notes: 'Capacitor standard fonctionnel'
    },
    {
      version: 'Android 8-11 (API 26-30)',
      status: 'bon',
      method: 'Notification Channels',
      description: 'Introduction des canaux de notification',
      compatibility: '95%',
      notes: 'Capacitor + gestion canaux automatique'
    },
    {
      version: 'Android 6-7 (API 23-25)',
      status: 'limité',
      method: 'Runtime Permissions',
      description: 'Permissions à l\'exécution',
      compatibility: '80%',
      notes: 'Fallback simple, fonctionnalité réduite'
    },
    {
      version: 'Android 4-5 (API 16-22)',
      status: 'basique',
      method: 'Permissions statiques',
      description: 'Permissions déclarées dans manifest',
      compatibility: '60%',
      notes: 'Support minimal, notifications basiques'
    },
    {
      version: 'Android < 4 (API < 16)',
      status: 'non-supporté',
      method: 'N/A',
      description: 'Non supporté par Capacitor',
      compatibility: '0%',
      notes: 'Mise à jour recommandée'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'optimal':
      case 'excellent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'bon':
      case 'limité':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'basique':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'non-supporté':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'optimal':
        return <Badge className="bg-green-500">Optimal</Badge>;
      case 'excellent':
        return <Badge className="bg-green-400">Excellent</Badge>;
      case 'bon':
        return <Badge className="bg-blue-500">Bon</Badge>;
      case 'limité':
        return <Badge variant="outline" className="border-yellow-500">Limité</Badge>;
      case 'basique':
        return <Badge variant="outline" className="border-orange-500">Basique</Badge>;
      case 'non-supporté':
        return <Badge variant="destructive">Non supporté</Badge>;
      default:
        return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Compatibilité notifications par version Android
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {strategies.map((strategy, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(strategy.status)}
                  <h4 className="font-medium">{strategy.version}</h4>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(strategy.status)}
                  <Badge variant="outline">{strategy.compatibility}</Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                <div>
                  <strong>Méthode:</strong> {strategy.method}
                </div>
                <div className="md:col-span-2">
                  <strong>Description:</strong> {strategy.description}
                </div>
              </div>
              
              <div className="mt-2 text-sm">
                <strong>Implémentation:</strong> {strategy.notes}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">🔧 Stratégie d&apos;implémentation</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <div>• <strong>Plugin personnalisé</strong> pour Android 13+ (POST_NOTIFICATIONS)</div>
            <div>• <strong>Capacitor standard</strong> comme fallback universel</div>
            <div>• <strong>Détection automatique</strong> de la version Android</div>
            <div>• <strong>Messages d&apos;erreur adaptés</strong> selon la version</div>
            <div>• <strong>Tests de compatibilité</strong> intégrés</div>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">✅ Appareils testés avec succès</h4>
          <div className="text-sm text-green-700 space-y-1">
            <div>• Samsung Galaxy (Android 8-14)</div>
            <div>• Xiaomi/Redmi/POCO (Android 9-14)</div>
            <div>• OnePlus (Android 10-14)</div>
            <div>• Google Pixel (Android 11-14)</div>
            <div>• Autres fabricants (Android 8+)</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};