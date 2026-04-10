import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Crown, Check, Loader2, Heart, RefreshCw, AlertTriangle,
  Star, Calendar, ChevronRight, Map, Trophy, Palette,
  Repeat, BarChart3, FileDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DonationDialog } from '@/components/DonationDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { IOSListGroup, IOSListItem } from '@/components/ui/ios-list-item';
import { IosFixedPageHeaderShell } from '@/components/layout/IosFixedPageHeaderShell';
import { CoachingFullscreenHeader } from '@/components/coaching/CoachingFullscreenHeader';

const PREMIUM_FEATURES = [
  {
    icon: BarChart3,
    color: 'bg-[#FF2D55]',
    title: 'Heatmap d\'activité',
    subtitle: 'Visualisez votre régularité style GitHub / Strava',
  },
  {
    icon: FileDown,
    color: 'bg-[#5856D6]',
    title: 'Export GPX / KML',
    subtitle: 'Exportez vos itinéraires dans tous les formats',
  },
  {
    icon: Trophy,
    color: 'bg-[#FF9500]',
    title: 'Classement avancé',
    subtitle: 'Filtres par sport, région et cercle d\'amis',
  },
  {
    icon: Palette,
    color: 'bg-[#AF52DE]',
    title: 'Personnalisation du profil',
    subtitle: 'Thèmes exclusifs et badges premium',
  },
  {
    icon: Repeat,
    color: 'bg-[#34C759]',
    title: 'Sessions récurrentes',
    subtitle: 'Automatisez vos séances club et coaching',
  },
  {
    icon: Map,
    color: 'bg-[#007AFF]',
    title: 'Itinéraires illimités',
    subtitle: 'Créez et sauvegardez sans limite',
  },
];

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
    syncSubscription,
  } = useSubscription();
  const [loading, setLoading] = useState<'monthly' | 'annual' | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast({
        title: '🎉 Merci pour votre abonnement !',
        description: 'Votre compte premium est maintenant actif.',
      });
    } else if (params.get('canceled') === 'true') {
      toast({
        title: 'Paiement annulé',
        description: "Votre abonnement n'a pas été modifié.",
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleSubscribe = async (planType: 'monthly' | 'annual') => {
    if (!session) return;
    setLoading(planType);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: { Authorization: `Bearer ${session.access_token}` },
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
      toast({ title: 'Erreur', description: 'Impossible de créer la session de paiement.', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!session) return;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: data.url, presentationStyle: 'popover' });
      } else {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({ title: 'Erreur', description: "Impossible d'ouvrir le portail client.", variant: 'destructive' });
    } finally {
      setPortalLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-secondary px-4">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-[#FFCC00]/15 flex items-center justify-center">
            <Crown className="h-10 w-10 text-[#FFCC00]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-ios-title2 font-bold text-foreground">Connectez-vous</h2>
            <p className="text-ios-subheadline text-muted-foreground">
              Vous devez être connecté pour accéder à Premium.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <IosFixedPageHeaderShell
      className="min-h-0 flex-1 bg-secondary"
      header={
        <CoachingFullscreenHeader
          title="Premium"
          onBack={() => navigate(-1)}
        />
      }
      scrollClassName="bg-secondary"
      contentScroll
    >
      {/* Hero */}
      <div className="flex flex-col items-center py-6 px-4">
        <div className="h-[72px] w-[72px] rounded-[22px] bg-gradient-to-br from-[#FFCC00] to-[#FF9500] flex items-center justify-center shadow-lg shadow-[#FFCC00]/20">
          <Crown className="h-9 w-9 text-white" />
        </div>
        <h2 className="mt-3 text-[22px] font-bold text-foreground">RunConnect Premium</h2>
        <p className="mt-1 text-[15px] text-muted-foreground text-center max-w-[280px]">
          Débloquez toutes les fonctionnalités pour booster votre entraînement.
        </p>
      </div>

      {/* Expiring Soon Warning */}
      {isExpiringSoon && (
        <div className="mx-4 mb-3 rounded-xl bg-[#FF9500]/10 border border-[#FF9500]/30 p-3.5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#FF9500] flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[#FF9500]">Expire bientôt</p>
              <p className="text-[13px] text-[#FF9500]/80 truncate">
                {expiresAt && `Le ${expiresAt.toLocaleDateString('fr-FR')}`}
                {cancelAtPeriodEnd && ' • Non renouvelé'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mon Abonnement */}
      <IOSListGroup header="MON ABONNEMENT">
        {status === 'loading' ? (
          <div className="bg-card px-4 py-4 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : (
          <>
            <IOSListItem
              icon={Crown}
              iconBgColor="bg-[#FFCC00]"
              title="Statut"
              value={isPremium ? 'Premium ✨' : 'Gratuit'}
              showChevron={false}
            />
            {tier && tier !== 'Admin' && (
              <IOSListItem
                icon={Star}
                iconBgColor="bg-[#5856D6]"
                title="Plan actuel"
                value={tier}
                showChevron={false}
              />
            )}
            {expiresAt && (
              <IOSListItem
                icon={Calendar}
                iconBgColor="bg-[#FF9500]"
                title="Expire le"
                value={expiresAt.toLocaleDateString('fr-FR')}
                showChevron={false}
              />
            )}
            <IOSListItem
              icon={RefreshCw}
              iconBgColor="bg-[#007AFF]"
              title="Synchroniser"
              onClick={syncSubscription}
              rightElement={
                isSyncing ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : undefined
              }
            />
            {isPremium && (
              <IOSListItem
                icon={Star}
                iconBgColor="bg-[#8E8E93]"
                title="Gérer l'abonnement"
                onClick={handleManageSubscription}
                rightElement={
                  portalLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : undefined
                }
              />
            )}
          </>
        )}
      </IOSListGroup>

      {/* Plans */}
      <IOSListGroup header="CHOISIR UN PLAN">
        <button
          onClick={() => handleSubscribe('monthly')}
          disabled={loading !== null || tier === 'Mensuel'}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-card active:bg-secondary/60 transition-colors disabled:opacity-50 border-b border-border/40"
        >
          <div className="h-[30px] w-[30px] rounded-lg bg-[#007AFF] flex items-center justify-center shrink-0">
            {loading === 'monthly' ? (
              <Loader2 className="h-[16px] w-[16px] text-white animate-spin" />
            ) : (
              <Star className="h-[16px] w-[16px] text-white" />
            )}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[16px] font-medium text-foreground">Mensuel</p>
              {tier === 'Mensuel' && (
                <span className="text-[11px] bg-[#34C759] text-white px-2 py-0.5 rounded-full font-medium">
                  Actuel
                </span>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground">2,99 €/mois</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground/40 shrink-0" />
        </button>

        <button
          onClick={() => handleSubscribe('annual')}
          disabled={loading !== null || tier === 'Annuel'}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-card active:bg-secondary/60 transition-colors disabled:opacity-50"
        >
          <div className="h-[30px] w-[30px] rounded-lg bg-[#34C759] flex items-center justify-center shrink-0">
            {loading === 'annual' ? (
              <Loader2 className="h-[16px] w-[16px] text-white animate-spin" />
            ) : (
              <Star className="h-[16px] w-[16px] text-white" />
            )}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[16px] font-medium text-foreground">Annuel</p>
              {tier === 'Annuel' && (
                <span className="text-[11px] bg-[#34C759] text-white px-2 py-0.5 rounded-full font-medium">
                  Actuel
                </span>
              )}
              <span className="text-[11px] bg-[#34C759]/15 text-[#34C759] px-2 py-0.5 rounded-full font-semibold">
                −17%
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground">29,99 €/an · soit 2,50 €/mois</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground/40 shrink-0" />
        </button>
      </IOSListGroup>

      {/* Features Premium */}
      <IOSListGroup header="AVANTAGES PREMIUM">
        {PREMIUM_FEATURES.map((f, i) => (
          <IOSListItem
            key={i}
            icon={f.icon}
            iconBgColor={f.color}
            title={f.title}
            subtitle={f.subtitle}
            showChevron={false}
            showSeparator={i < PREMIUM_FEATURES.length - 1}
          />
        ))}
      </IOSListGroup>

      {/* Soutenir */}
      <IOSListGroup header="SOUTENIR RUNCONNECT">
        <DonationDialog
          trigger={
            <button className="w-full flex items-center gap-3 px-4 py-3.5 bg-card active:bg-secondary/60 transition-colors">
              <div className="h-[30px] w-[30px] rounded-lg bg-[#FF3B30] flex items-center justify-center shrink-0">
                <Heart className="h-[16px] w-[16px] text-white" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[16px] font-medium text-foreground">Faire un don</p>
                <p className="text-[13px] text-muted-foreground">Soutenez le développement de l'app</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/40 shrink-0" />
            </button>
          }
        />
      </IOSListGroup>

      {/* Bottom spacing */}
      <div className="h-8" />
    </IosFixedPageHeaderShell>
  );
};

export default Subscription;
