import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Send, TestTube, Database, Bell } from "lucide-react";

export const NotificationSystemTest = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testTitle, setTestTitle] = useState("Test Notification");
  const [testMessage, setTestMessage] = useState("Ceci est un test de notification push");

  // Test 1: Créer une notification directement en base
  const testDatabaseNotification = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: testTitle,
          message: testMessage,
          type: 'test',
          data: { test: true, timestamp: new Date().toISOString() }
        });

      if (error) throw error;

      toast({
        title: "✅ Notification créée",
        description: "Notification ajoutée directement en base"
      });
    } catch (error: any) {
      toast({
        title: "❌ Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Test 2: Appeler l'edge function directement
  const testPushNotificationFunction = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          title: testTitle,
          body: testMessage,
          type: 'test',
          data: { test: true, timestamp: new Date().toISOString() }
        }
      });

      if (error) throw error;

      console.log('Edge function response:', data);
      
      toast({
        title: "✅ Push notification envoyée",
        description: data.message || "Fonction edge appelée avec succès"
      });
    } catch (error: any) {
      console.error('Edge function error:', error);
      toast({
        title: "❌ Erreur Edge Function",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Test 3: Simuler un trigger (créer un message)
  const testTriggerViaMessage = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // D'abord créer une conversation test avec soi-même
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .upsert({
          participant_1: user.id,
          participant_2: user.id,
          is_group: false
        }, { onConflict: 'participant_1,participant_2' })
        .select()
        .single();

      if (convError) throw convError;

      // Ensuite créer un message - cela devrait déclencher le trigger
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: `Message de test pour déclencher les notifications - ${new Date().toLocaleTimeString()}`,
          message_type: 'text'
        });

      if (messageError) throw messageError;

      toast({
        title: "✅ Message créé",
        description: "Le trigger de notification devrait s'être déclenché"
      });
    } catch (error: any) {
      console.error('Trigger test error:', error);
      toast({
        title: "❌ Erreur Trigger",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>Connectez-vous pour tester les notifications</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Test Système de Notifications Push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              placeholder="Titre de la notification"
            />
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <Input
              id="message"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Contenu de la notification"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={testDatabaseNotification}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            Test 1: Notification directe en base
          </Button>

          <Button
            onClick={testPushNotificationFunction}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Test 2: Edge Function Push
          </Button>

          <Button
            onClick={testTriggerViaMessage}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            Test 3: Trigger via Message
          </Button>
        </div>

        <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
          <p><strong>Test 1:</strong> Crée une notification directement → Test real-time</p>
          <p><strong>Test 2:</strong> Appelle l'edge function → Test push complet</p>
          <p><strong>Test 3:</strong> Crée un message → Test triggers automatiques</p>
        </div>
      </CardContent>
    </Card>
  );
};