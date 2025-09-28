import React, { useState } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Image, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function SimpleGalleryTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { selectFromGallery } = useCamera();

  const testGallery = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const file = await selectFromGallery();
      
      if (file) {
        setResult(`✅ Success! Selected file: ${file.name} (${file.size} bytes)`);
        toast.success('Gallery access works!');
      } else {
        setError('❌ No file selected');
        toast.error('No file selected');
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Unknown error';
      setError(`❌ Error: ${errorMsg}`);
      toast.error(`Gallery error: ${errorMsg}`);
      console.error('Gallery test error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Simple Gallery Test
        </CardTitle>
        <CardDescription>
          Basic test to verify gallery access functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testGallery} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Testing Gallery...' : 'Test Gallery Access'}
        </Button>

        {result && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="text-sm text-green-800">{result}</div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            This test uses the optimized gallery selection strategy based on your device manufacturer and Android version.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}