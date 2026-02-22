import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, XCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import { DonationDialog } from '@/components/DonationDialog';
import { useState } from 'react';

const DonationCanceled = () => {
  const navigate = useNavigate();
  const [showDonationDialog, setShowDonationDialog] = useState(false);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-pattern px-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Heart className="h-16 w-16 text-muted-foreground" />
              <XCircle className="h-6 w-6 text-orange-500 absolute -top-1 -right-1 bg-white rounded-full" />
            </div>
          </div>
          <CardTitle className="text-2xl text-orange-600">
            Don annulé
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
        </CardContent>
      </Card>

      <DonationDialog
        open={showDonationDialog}
        onOpenChange={setShowDonationDialog}
      />
    </div>
  );
};

export default DonationCanceled;