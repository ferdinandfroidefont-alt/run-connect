import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Loader2, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DonationDialog } from '@/components/DonationDialog';

const Subscription = () => {
  const { user, session, subscriptionInfo, refreshSubscription } = useAuth();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const { toast } = useToast();

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

      if (error) {
        throw error;
      }

      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la session de paiement. Veuillez réessayer.",
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

      if (error) {
        throw error;
      }

      // Open customer portal in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir le portail client. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleRefreshSubscription = async () => {
    setLoading(true);
    await refreshSubscription();
    setLoading(false);
    toast({
      title: "Statut mis à jour",
      description: "Le statut de votre abonnement a été actualisé.",
    });
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
          Accédez à toutes les fonctionnalités premium de RunConnect
        </p>
      </div>

      {/* Current Subscription Status */}
      {subscriptionInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Votre Abonnement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Statut:</span>
              <Badge variant={subscriptionInfo.subscribed ? "default" : "secondary"}>
                {subscriptionInfo.subscribed ? "Actif" : "Inactif"}
              </Badge>
            </div>
            {subscriptionInfo.subscription_tier && (
              <div className="flex items-center justify-between">
                <span>Plan:</span>
                <Badge variant="outline">{subscriptionInfo.subscription_tier}</Badge>
              </div>
            )}
            {subscriptionInfo.subscription_end && (
              <div className="flex items-center justify-between">
                <span>Expire le:</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(subscriptionInfo.subscription_end).toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <Button 
                onClick={handleRefreshSubscription} 
                variant="outline" 
                size="sm"
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Actualiser le statut
              </Button>
              {subscriptionInfo.subscribed && (
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
          </CardContent>
        </Card>
      )}

      {/* Pricing Plans */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Monthly Plan */}
        <Card className={`relative ${subscriptionInfo?.subscription_tier === 'Mensuel' ? 'ring-2 ring-primary' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Plan Mensuel
              {subscriptionInfo?.subscription_tier === 'Mensuel' && (
                <Badge>Actuel</Badge>
              )}
            </CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold">2,99€</span>
              <span className="text-muted-foreground">/mois</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Messages illimités</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Accès au classement</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Sessions illimitées</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Clubs privés</span>
              </li>
            </ul>
            <Button 
              onClick={() => handleSubscribe('monthly')}
              disabled={loading || subscriptionInfo?.subscription_tier === 'Mensuel'}
              className="w-full"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {subscriptionInfo?.subscription_tier === 'Mensuel' ? 'Plan actuel' : 'Choisir ce plan'}
            </Button>
          </CardContent>
        </Card>

        {/* Annual Plan */}
        <Card className={`relative ${subscriptionInfo?.subscription_tier === 'Annuel' ? 'ring-2 ring-primary' : ''}`}>
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-green-500 text-white">2 mois offerts</Badge>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Plan Annuel
              {subscriptionInfo?.subscription_tier === 'Annuel' && (
                <Badge>Actuel</Badge>
              )}
            </CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold">29,99€</span>
              <span className="text-muted-foreground">/an</span>
              <div className="text-sm text-green-600 font-medium">
                Économisez 16% (2,50€/mois)
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Messages illimités</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Accès au classement</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Sessions illimitées</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Clubs privés</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-green-600 font-medium">2 mois gratuits</span>
              </li>
            </ul>
            <Button 
              onClick={() => handleSubscribe('annual')}
              disabled={loading || subscriptionInfo?.subscription_tier === 'Annuel'}
              className="w-full"
              variant={subscriptionInfo?.subscription_tier === 'Annuel' ? 'secondary' : 'default'}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {subscriptionInfo?.subscription_tier === 'Annuel' ? 'Plan actuel' : 'Choisir ce plan'}
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
          <CardDescription>
            Vous aimez RunConnect ? Soutenez-nous avec un don pour nous aider à améliorer l'expérience pour tous
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Votre soutien nous aide à maintenir et développer de nouvelles fonctionnalités pour la communauté des coureurs.
            </p>
          </div>
          <div className="flex justify-center">
            <DonationDialog
              trigger={
                <Button className="bg-red-500 hover:bg-red-600 text-white">
                  <Heart className="h-4 w-4 mr-2" />
                  Faire un don
                </Button>
              }
            />
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Don sécurisé via Stripe • Aucune inscription requise • Montant libre
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Fonctionnalités Premium</CardTitle>
          <CardDescription>
            Tout ce que vous obtenez avec RunConnect Premium
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Messages illimités</h4>
              <p className="text-sm text-muted-foreground">
                Échangez sans limite (3 messages/jour pour les utilisateurs gratuits)
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Accès au classement</h4>
              <p className="text-sm text-muted-foreground">
                Consultez votre rang et comparez-vous avec vos amis
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Sessions illimitées</h4>
              <p className="text-sm text-muted-foreground">
                Créez et participez à un nombre illimité de sessions de course
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Clubs privés</h4>
              <p className="text-sm text-muted-foreground">
                Créez des clubs privés pour courir avec vos amis
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Subscription;