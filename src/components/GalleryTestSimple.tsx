import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCamera } from '@/hooks/useCamera';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Camera, Smartphone } from 'lucide-react';

export function GalleryTestSimple() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  
  const { selectFromGallery } = useCamera();
  const { toast } = useToast();

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      console.log('🧪 Starting gallery test...');
      
      const file = await selectFromGallery();
      
      if (file) {
        setTestResult({
          success: true,
          message: `Image sélectionnée avec succès: ${file.name} (${Math.round(file.size / 1024)}KB)`,
          details: {
            name: file.name,
            size: file.size,
            type: file.type
          }
        });
        
        toast({
          title: "✅ Test réussi",
          description: "Galerie accessible avec succès!",
          variant: "default"
        });
      } else {
        setTestResult({
          success: false,
          message: "Aucune image sélectionnée ou annulé par l'utilisateur"
        });
      }
    } catch (error: any) {
      console.error('❌ Gallery test failed:', error);
      
      setTestResult({
        success: false,
        message: `Erreur: ${error.message || 'Impossible d\'accéder à la galerie'}`,
        details: error
      });
      
      toast({
        title: "❌ Test échoué",
        description: error.message || "Impossible d'accéder à la galerie",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center gap-2 justify-center">
          <Camera className="h-5 w-5" />
          Test Galerie Android
        </CardTitle>
        <CardDescription>
          Test rapide d'accès à la galerie avec les nouvelles stratégies
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Button 
          onClick={runTest} 
          disabled={testing}
          className="w-full"
          size="lg"
        >
          {testing ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Test en cours...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Tester la galerie
            </div>
          )}
        </Button>
        
        {testResult && (
          <div className={`p-4 rounded-lg border ${
            testResult.success 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-start gap-2">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {testResult.success ? 'Succès' : 'Échec'}
                </p>
                <p className="text-sm mt-1">{testResult.message}</p>
                {testResult.details && (
                  <pre className="text-xs mt-2 bg-white/50 p-2 rounded overflow-auto">
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground text-center">
          Ce test utilise les stratégies optimisées pour Android 6-13+
        </div>
      </CardContent>
    </Card>
  );
}