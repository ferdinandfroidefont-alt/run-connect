import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, MessageCircle, Lock, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MessageLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messagesLeft: number;
}

export const MessageLimitDialog = ({ open, onOpenChange, messagesLeft }: MessageLimitDialogProps) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/subscription');
  };

  const isLimitReached = messagesLeft <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="relative">
              <MessageCircle className={`h-16 w-16 ${isLimitReached ? 'text-red-500' : 'text-orange-500'}`} />
              {isLimitReached && (
                <Lock className="h-6 w-6 text-red-600 absolute -top-1 -right-1 bg-white rounded-full p-1" />
              )}
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            {isLimitReached 
              ? "Limite de messages atteinte !" 
              : `Plus que ${messagesLeft} message${messagesLeft > 1 ? 's' : ''} !`
            }
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="text-center space-y-2">
            {isLimitReached ? (
              <p className="text-muted-foreground">
                Vous avez utilisé vos 3 messages gratuits d'aujourd'hui. 
                Passez à Premium pour des messages illimités !
              </p>
            ) : (
              <p className="text-muted-foreground">
                Vous approchez de votre limite quotidienne de 3 messages. 
                Avec Premium, vous pourrez envoyer des messages sans limite !
              </p>
            )}
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg p-4 border border-yellow-200/50">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="h-5 w-5 text-yellow-600" />
              <span className="font-semibold text-yellow-800 dark:text-yellow-200">
                RunConnect Premium
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-500" />
                <span>Messages illimités</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-500" />
                <span>Accès au classement</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-500" />
                <span>Sessions illimitées</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-500" />
                <span>Clubs privés</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-lg font-bold text-primary">
                Dès 2,99€/mois
              </span>
              <Badge className="bg-green-500 text-white">
                Populaire
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleUpgrade}
              className="w-full gap-2"
              size="lg"
            >
              <Crown className="h-4 w-4" />
              Passer à Premium
            </Button>
            
            {!isLimitReached && (
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="w-full"
              >
                Continuer (limite gratuite)
              </Button>
            )}
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {isLimitReached 
                ? "Vos messages se réinitialiseront demain à minuit"
                : "La limite se réinitialise chaque jour à minuit"
              }
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};