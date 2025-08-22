import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Heart, Euro } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DonationDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DonationDialog = ({ trigger, open, onOpenChange }: DonationDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>('');
  const [donorName, setDonorName] = useState<string>('');
  const [donorEmail, setDonorEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Montants prédéfinis
  const presetAmounts = [5, 10, 25, 50, 100];

  const handleAmountChange = (value: string) => {
    // Permettre seulement les nombres et le point décimal
    const sanitized = value.replace(/[^\d.,]/g, '').replace(',', '.');
    setAmount(sanitized);
  };

  const handlePresetAmount = (presetAmount: number) => {
    setAmount(presetAmount.toString());
  };

  const handleDonation = async () => {
    try {
      setLoading(true);

      // Validation
      const numAmount = parseFloat(amount);
      if (!amount || isNaN(numAmount) || numAmount < 1 || numAmount > 10000) {
        toast({
          title: "Montant invalide",
          description: "Le montant doit être entre 1€ et 10 000€",
          variant: "destructive",
        });
        return;
      }

      if (!user && !donorEmail) {
        toast({
          title: "Email requis",
          description: "Veuillez fournir un email pour votre don",
          variant: "destructive",
        });
        return;
      }

      // Convertir en centimes pour Stripe
      const amountInCents = Math.round(numAmount * 100);

      // Appeler l'edge function
      const { data, error } = await supabase.functions.invoke('create-donation', {
        body: {
          amount: amountInCents,
          currency: 'eur',
          donorName: donorName || (user?.email?.split('@')[0]) || 'Anonyme',
          donorEmail: donorEmail || user?.email,
          message: message
        }
      });

      if (error) {
        console.error('Donation error:', error);
        throw new Error(error.message || 'Erreur lors de la création du don');
      }

      if (!data?.url) {
        throw new Error('URL de paiement non reçue');
      }

      // Ouvrir Stripe Checkout dans un nouvel onglet
      window.open(data.url, '_blank');

      // Fermer le dialog
      const newOpenState = false;
      setIsOpen(newOpenState);
      onOpenChange?.(newOpenState);

      // Réinitialiser le formulaire
      setAmount('');
      setDonorName('');
      setDonorEmail('');
      setMessage('');

      toast({
        title: "Redirection vers Stripe",
        description: "Vous allez être redirigé vers la page de paiement sécurisée",
      });

    } catch (error: any) {
      console.error('Error creating donation:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le don",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const dialogOpen = open !== undefined ? open : isOpen;
  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Faire un don
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Montants prédéfinis */}
          <div className="space-y-2">
            <Label>Montants suggérés</Label>
            <div className="grid grid-cols-5 gap-2">
              {presetAmounts.map((presetAmount) => (
                <Button
                  key={presetAmount}
                  variant={amount === presetAmount.toString() ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePresetAmount(presetAmount)}
                  className="text-xs"
                >
                  {presetAmount}€
                </Button>
              ))}
            </div>
          </div>

          {/* Montant personnalisé */}
          <div className="space-y-2">
            <Label htmlFor="amount">Montant personnalisé</Label>
            <div className="relative">
              <Euro className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="text"
                placeholder="50.00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Montant entre 1€ et 10 000€
            </p>
          </div>

          {/* Informations du donateur (si pas connecté) */}
          {!user && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="donorName">Nom (optionnel)</Label>
                <Input
                  id="donorName"
                  placeholder="Votre nom"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="donorEmail">Email</Label>
                <Input
                  id="donorEmail"
                  type="email"
                  placeholder="votre@email.com"
                  value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Message optionnel */}
          <div className="space-y-2">
            <Label htmlFor="message">Message (optionnel)</Label>
            <Textarea
              id="message"
              placeholder="Un petit mot pour accompagner votre don..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Bouton de don */}
          <Button
            onClick={handleDonation}
            disabled={loading || !amount}
            className="w-full bg-red-500 hover:bg-red-600 text-white"
            size="lg"
          >
            {loading ? (
              "Redirection..."
            ) : (
              <>
                <Heart className="h-4 w-4 mr-2" />
                Faire un don de {amount ? `${amount}€` : '...'}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Paiement sécurisé par Stripe. Vous serez redirigé vers une page de paiement sécurisée.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};