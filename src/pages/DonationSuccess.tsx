import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, CheckCircle, ArrowLeft } from 'lucide-react';

const DonationSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Log successful donation for analytics
    console.log('Donation successful', { sessionId });
  }, [sessionId]);

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Heart className="h-16 w-16 text-red-500 fill-current" />
              <CheckCircle className="h-6 w-6 text-green-500 absolute -top-1 -right-1 bg-white rounded-full" />
            </div>
          </div>
          <CardTitle className="text-2xl text-green-600">
            Merci pour votre don !
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-lg font-medium">
              Votre don a été traité avec succès
            </p>
            <p className="text-muted-foreground">
              Grâce à votre générosité, nous pouvons continuer à améliorer RunConnect pour toute la communauté des coureurs.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h3 className="font-medium text-sm">Ce que votre don permet :</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Maintenir les serveurs et l'infrastructure</li>
              <li>• Développer de nouvelles fonctionnalités</li>
              <li>• Améliorer l'expérience utilisateur</li>
              <li>• Offrir un support de qualité</li>
            </ul>
          </div>

          {sessionId && (
            <div className="text-xs text-muted-foreground">
              Référence de transaction : {sessionId.substring(0, 20)}...
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={() => navigate('/')}
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
            Votre reçu de don sera envoyé par email par Stripe.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DonationSuccess;