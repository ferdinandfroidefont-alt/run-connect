import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Crown, Check, Loader2, Heart, RefreshCw, AlertTriangle, Star, Calendar, ChevronRight, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DonationDialog } from '@/components/DonationDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';

const Subscription = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { 
    status, 
    tier, 
    expiresAt, 
    isExpiringSoon, 
    cancelAtPeriodEnd,
    isSyncing, 
    isPremium,
    syncSubscription 
  } = useSubscription();
  const [loading, setLoading] = useState<'monthly' | 'annual' | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const { toast } = useToast();

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
    
    setLoading(planType);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { planType },
      });

      if (error) throw error;
      
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
      setLoading(null);
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
      <div className="h-full bg-secondary flex items-center justify-center p-4 bg-pattern">
        <div className="bg-card rounded-[10px] p-6 text-center max-w-sm">
          <Crown className="h-12 w-12 text-[#FFCC00] mx-auto mb-4" />
          <h2 className="text-[17px] font-semibold mb-2">Connectez-vous</h2>
          <p className="text-[15px] text-muted-foreground">
            Vous devez être connecté pour voir vos options d'abonnement.
          </p>
        </div>
      </div>
    );
  }

  const features = ['Messages illimités', 'Accès au classement', 'Sessions illimitées', 'Clubs privés'];

  return (
    <div className="h-full bg-secondary bg-pattern overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col h-full"
      >
        {/* iOS Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="flex items-center justify-between px-4 h-[56px]">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-[17px] font-semibold">RunConnect Premium</h1>
            <div className="w-9" />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="py-6 space-y-6">
            {/* Expiring Soon Warning */}
            {isExpiringSoon && (
              <div className="bg-[#FF9500]/10 border border-[#FF9500]/30 rounded-[10px] p-4">
                <div className="flex items-center gap-3">
                  <div className="h-[30px] w-[30px] rounded-[7px] bg-[#FF9500] flex items-center justify-center">
                    <AlertTriangle className="h-[18px] w-[18px] text-white" />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-[#FF9500]">
                      Votre abonnement expire bientôt
                    </p>
                    <p className="text-[13px] text-[#FF9500]/80">
                      {expiresAt && `Expire le ${expiresAt.toLocaleDateString('fr-FR')}`}
                      {cancelAtPeriodEnd && " • Ne sera pas renouvelé"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Current Subscription Status */}
            <div className="space-y-2">
              <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
                Mon Abonnement
              </h3>
              <div className="bg-card overflow-hidden">
                {status === 'loading' ? (
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ) : (
                  <>
                    {/* Status */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="h-[30px] w-[30px] rounded-[7px] bg-[#FFCC00] flex items-center justify-center">
                        <Crown className="h-[18px] w-[18px] text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[15px] font-medium">Statut</p>
                      </div>
                      <span className={`text-[15px] font-medium ${isPremium ? 'text-[#34C759]' : 'text-muted-foreground'}`}>
                        {isPremium ? 'Premium' : 'Gratuit'}
                      </span>
                    </div>
                    <div className="h-px bg-border ml-[54px]" />

                    {/* Current Plan */}
                    {tier && tier !== 'Admin' && (
                      <>
                        <div className="flex items-center gap-3 px-4 py-3">
                          <div className="h-[30px] w-[30px] rounded-[7px] bg-[#5856D6] flex items-center justify-center">
                            <Star className="h-[18px] w-[18px] text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[15px] font-medium">Plan actuel</p>
                          </div>
                          <span className="text-[15px] text-muted-foreground">{tier}</span>
                        </div>
                        <div className="h-px bg-border ml-[54px]" />
                      </>
                    )}

                    {/* Expiration */}
                    {expiresAt && (
                      <>
                        <div className="flex items-center gap-3 px-4 py-3">
                          <div className="h-[30px] w-[30px] rounded-[7px] bg-[#FF9500] flex items-center justify-center">
                            <Calendar className="h-[18px] w-[18px] text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[15px] font-medium">Expire le</p>
                          </div>
                          <span className="text-[15px] text-muted-foreground">
                            {expiresAt.toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <div className="h-px bg-border ml-[54px]" />
                      </>
                    )}

                    {/* Sync */}
                    <button 
                      onClick={syncSubscription}
                      disabled={isSyncing}
                      className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50 transition-colors disabled:opacity-50"
                    >
                      <div className="h-[30px] w-[30px] rounded-[7px] bg-[#007AFF] flex items-center justify-center">
                        <RefreshCw className={`h-[18px] w-[18px] text-white ${isSyncing ? 'animate-spin' : ''}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-[15px] font-medium">Synchroniser</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
                    </button>

                    {/* Manage Subscription */}
                    {isPremium && (
                      <>
                        <div className="h-px bg-border ml-[54px]" />
                        <button 
                          onClick={handleManageSubscription}
                          disabled={portalLoading}
                          className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50 transition-colors disabled:opacity-50"
                        >
                          <div className="h-[30px] w-[30px] rounded-[7px] bg-[#8E8E93] flex items-center justify-center">
                            {portalLoading ? (
                              <Loader2 className="h-[18px] w-[18px] text-white animate-spin" />
                            ) : (
                              <Star className="h-[18px] w-[18px] text-white" />
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-[15px] font-medium">Gérer l'abonnement</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Plans */}
            <div className="space-y-2">
              <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
                Plans Disponibles
              </h3>
              <div className="bg-card overflow-hidden">
                {/* Monthly Plan */}
                <button 
                  onClick={() => handleSubscribe('monthly')}
                  disabled={loading !== null || tier === 'Mensuel'}
                  className="w-full flex items-center gap-3 px-4 py-4 active:bg-secondary/50 transition-colors disabled:opacity-50"
                >
                  <div className="h-[30px] w-[30px] rounded-[7px] bg-[#007AFF] flex items-center justify-center">
                    {loading === 'monthly' ? (
                      <Loader2 className="h-[18px] w-[18px] text-white animate-spin" />
                    ) : (
                      <Star className="h-[18px] w-[18px] text-white" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-medium">Plan Mensuel</p>
                      {tier === 'Mensuel' && (
                        <span className="text-[11px] bg-[#34C759] text-white px-2 py-0.5 rounded-full font-medium">
                          Actuel
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-muted-foreground">2,99€/mois</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
                </button>

                <div className="h-px bg-border ml-[54px]" />

                {/* Annual Plan */}
                <button 
                  onClick={() => handleSubscribe('annual')}
                  disabled={loading !== null || tier === 'Annuel'}
                  className="w-full flex items-center gap-3 px-4 py-4 active:bg-secondary/50 transition-colors disabled:opacity-50"
                >
                  <div className="h-[30px] w-[30px] rounded-[7px] bg-[#34C759] flex items-center justify-center">
                    {loading === 'annual' ? (
                      <Loader2 className="h-[18px] w-[18px] text-white animate-spin" />
                    ) : (
                      <Star className="h-[18px] w-[18px] text-white" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-medium">Plan Annuel</p>
                      {tier === 'Annuel' && (
                        <span className="text-[11px] bg-[#34C759] text-white px-2 py-0.5 rounded-full font-medium">
                          Actuel
                        </span>
                      )}
                      <span className="text-[11px] bg-[#34C759]/20 text-[#34C759] px-2 py-0.5 rounded-full font-medium">
                        2 mois offerts
                      </span>
                    </div>
                    <p className="text-[13px] text-muted-foreground">29,99€/an (2,50€/mois)</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
                Avantages Premium
              </h3>
              <div className="bg-card overflow-hidden">
                {features.map((feature, index) => (
                  <div key={feature}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="h-[30px] w-[30px] rounded-[7px] bg-[#34C759] flex items-center justify-center">
                        <Check className="h-[18px] w-[18px] text-white" />
                      </div>
                      <p className="text-[15px] font-medium">{feature}</p>
                    </div>
                    {index < features.length - 1 && <div className="h-px bg-border ml-[54px]" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Donation Section */}
            <div className="space-y-2">
              <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
                Soutenir RunConnect
              </h3>
              <div className="bg-card overflow-hidden">
                <DonationDialog
                  trigger={
                    <button className="w-full flex items-center gap-3 px-4 py-4 active:bg-secondary/50 transition-colors">
                      <div className="h-[30px] w-[30px] rounded-[7px] bg-[#FF3B30] flex items-center justify-center">
                        <Heart className="h-[18px] w-[18px] text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-[15px] font-medium">Faire un don</p>
                        <p className="text-[13px] text-muted-foreground">Soutenez le développement</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
                    </button>
                  }
                />
              </div>
            </div>
          </div>
        </ScrollArea>
      </motion.div>
    </div>
  );
};

export default Subscription;
