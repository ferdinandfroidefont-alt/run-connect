import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Share2, Gift, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ReferralDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReferralStats {
  referral_code: string;
  total_referrals: number;
  total_rewards: number;
}

export const ReferralDialog = ({ isOpen, onClose }: ReferralDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadReferralStats();
    }
  }, [isOpen, user]);

  const loadReferralStats = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_referral_stats', {
        user_id_param: user.id
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error: any) {
      console.error('Error loading referral stats:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques de parrainage",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = async () => {
    if (!stats?.referral_code) return;

    try {
      await navigator.clipboard.writeText(stats.referral_code);
      toast({
        title: "Copié !",
        description: "Code de parrainage copié dans le presse-papiers",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le code",
        variant: "destructive",
      });
    }
  };

  const shareReferralCode = async () => {
    if (!stats?.referral_code) return;

    const shareText = `Rejoins-moi sur l'app avec mon code de parrainage: ${stats.referral_code} et obtiens des avantages premium !`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Code de parrainage',
          text: shareText,
        });
      } catch (error) {
        // Fallback to clipboard
        copyReferralCode();
      }
    } else {
      copyReferralCode();
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center p-6">
            <div className="text-center">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Parrainage
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Code de parrainage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Votre code de parrainage</CardTitle>
              <CardDescription>
                Partagez ce code avec vos amis. Ils obtiennent des avantages et vous gagnez 1 jour de premium par personne !
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label htmlFor="referral-code" className="sr-only">
                    Code de parrainage
                  </Label>
                  <Input
                    id="referral-code"
                    value={stats?.referral_code || ''}
                    readOnly
                    className="font-mono text-center text-lg font-bold"
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={copyReferralCode}
                  title="Copier le code"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={shareReferralCode}
                  title="Partager le code"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Statistiques */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Vos statistiques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {stats?.total_referrals || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Personnes invitées
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {stats?.total_rewards || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Jours premium gagnés
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button onClick={onClose} variant="outline" className="w-full">
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};