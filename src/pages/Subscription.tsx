import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Loader2, Heart, RefreshCw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DonationDialog } from '@/components/DonationDialog';
import { SubscriptionBadge } from '@/components/SubscriptionBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const Subscription = () => {
  const { user, session } = useAuth();
  const { 
    status, 
    tier, 
    expiresAt, 
    isExpiringSoon, 
    isPastDue, 
    cancelAtPeriodEnd,
    isSyncing, 
    isPremium,
    refreshSubscription,
    syncSubscription 
  } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const { toast } = useToast();

  // Check for success/cancel in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast({
        title: "🎉 Merci pour votre abonnement !",
        description: "Votre compte premium est maintenant actif.",
      });
    } else if (params.get('canceled') === 'true') {
      toast({
        title: "Paiement annulé",
        description: "Votre abonnement n'a pas été modifié.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleSubscribe = async (planType: 'monthly' | 'annual') => {
    if (!session) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { planType },
      });

      if (error) throw error;
      
      // Use Capacitor Browser for native apps, regular redirect for web
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: data.url, presentationStyle: 'popover' });
      } else {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la session de paiement.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!session) return;
    
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      // Use Capacitor Browser for native apps, window.open for web
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: data.url, presentationStyle: 'popover' });
      } else {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir le portail client.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Connectez-vous</CardTitle>
            <CardDescription>
              Vous devez être connecté pour voir vos options d'abonnement.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">RunConnect Premium</h1>
        <p className="text-muted-foreground">
          Accédez à toutes les fonctionnalités premium
        </p>
      </div>

      {/* Expiring Soon Warning */}
      {isExpiringSoon && (
        <Card className="border-orange-400 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <div>
              <p className="font-medium text-orange-700 dark:text-orange-400">
                Votre abonnement expire bientôt
              </p>
              <p className="text-sm text-orange-600 dark:text-orange-300">
                {expiresAt && `Expire le ${expiresAt.toLocaleDateString('fr-FR')}`}
                {cancelAtPeriodEnd && " • Ne sera pas renouvelé"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Votre Abonnement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span>Statut:</span>
                <SubscriptionBadge status={status} tier={tier} />
              </div>
              {tier && tier !== 'Admin' && (
                <div className="flex items-center justify-between">
                  <span>Plan:</span>
                  <Badge variant="outline">{tier}</Badge>
                </div>
              )}
              {expiresAt && (
                <div className="flex items-center justify-between">
                  <span>Expire le:</span>
                  <span className="text-sm text-muted-foreground">
                    {expiresAt.toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <Button 
                  onClick={syncSubscription} 
                  variant="outline" 
                  size="sm"
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Synchroniser
                </Button>
                {isPremium && (
                  <Button 
                    onClick={handleManageSubscription}
                    variant="outline" 
                    size="sm"
                    disabled={portalLoading}
                  >
                    {portalLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Gérer l'abonnement
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Monthly Plan */}
        <Card className={`relative ${tier === 'Mensuel' ? 'ring-2 ring-primary' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Plan Mensuel
              {tier === 'Mensuel' && <Badge>Actuel</Badge>}
            </CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold">2,99€</span>
              <span className="text-muted-foreground">/mois</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {['Messages illimités', 'Accès au classement', 'Sessions illimitées', 'Clubs privés'].map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button 
              onClick={() => handleSubscribe('monthly')}
              disabled={loading || tier === 'Mensuel'}
              className="w-full"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {tier === 'Mensuel' ? 'Plan actuel' : 'Choisir ce plan'}
            </Button>
          </CardContent>
        </Card>

        {/* Annual Plan */}
        <Card className={`relative ${tier === 'Annuel' ? 'ring-2 ring-primary' : ''}`}>
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-green-500 text-white">2 mois offerts</Badge>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Plan Annuel
              {tier === 'Annuel' && <Badge>Actuel</Badge>}
            </CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold">29,99€</span>
              <span className="text-muted-foreground">/an</span>
              <div className="text-sm text-green-600 font-medium">2,50€/mois</div>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {['Messages illimités', 'Accès au classement', 'Sessions illimitées', 'Clubs privés', '2 mois gratuits'].map((feature, i) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className={`h-4 w-4 ${i === 4 ? 'text-green-600' : 'text-green-500'}`} />
                  <span className={i === 4 ? 'text-green-600 font-medium' : ''}>{feature}</span>
                </li>
              ))}
            </ul>
            <Button 
              onClick={() => handleSubscribe('annual')}
              disabled={loading || tier === 'Annuel'}
              className="w-full"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {tier === 'Annuel' ? 'Plan actuel' : 'Choisir ce plan'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Donation Section */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Soutenez RunConnect
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <DonationDialog
            trigger={
              <Button className="bg-red-500 hover:bg-red-600 text-white">
                <Heart className="h-4 w-4 mr-2" />
                Faire un don
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Subscription;
