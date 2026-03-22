import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart, XCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import { DonationDialog } from '@/components/DonationDialog';
import { useState } from 'react';

const DonationCanceled = () => {
  const navigate = useNavigate();
  const [showDonationDialog, setShowDonationDialog] = useState(false);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background px-4">
      <div className="ios-card max-w-md w-full overflow-hidden text-center">
        <div className="space-y-ios-6 p-ios-6">
          <div>
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Heart className="h-16 w-16 text-muted-foreground" />
              <XCircle className="h-6 w-6 text-orange-500 absolute -top-1 -right-1 bg-white rounded-full" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-orange-600">
            Don annulé
          </h2>
          </div>
          <div className="space-y-ios-6">
          <div className="space-y-2">
            <p className="text-lg font-medium">
              Votre don n'a pas été traité
            </p>
            <p className="text-muted-foreground">
              Aucun montant n'a été débité de votre compte. Vous pouvez réessayer à tout moment si vous souhaitez soutenir RunConnect.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h3 className="font-medium text-sm">Pourquoi nous soutenir ?</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Application 100% gratuite pour tous</li>
              <li>• Pas de publicité intrusive</li>
              <li>• Développement continu de nouvelles fonctionnalités</li>
              <li>• Support communautaire</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => setShowDonationDialog(true)}
              className="w-full bg-red-500 hover:bg-red-600 text-white"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Réessayer le don
            </Button>
            
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </Button>
            
            <Button
              onClick={() => navigate('/subscription')}
              variant="outline"
              className="w-full"
            >
              Découvrir RunConnect Premium
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Votre soutien, même petit, nous aide énormément !
          </p>
          </div>
        </div>
      </div>

      <DonationDialog
        open={showDonationDialog}
        onOpenChange={setShowDonationDialog}
      />
    </div>
  );
};

export default DonationCanceled;