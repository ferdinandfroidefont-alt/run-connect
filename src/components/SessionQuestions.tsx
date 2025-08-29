import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface SessionQuestionsProps {
  sessionId: string;
  sessionTitle: string;
  organizerId: string;
  activityType: string;
  locationName: string;
  scheduledAt: string;
}

export const SessionQuestions = ({ 
  sessionId, 
  sessionTitle, 
  organizerId,
  activityType,
  locationName,
  scheduledAt 
}: SessionQuestionsProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendQuestion = async () => {
    if (!question.trim() || !user) return;

    setLoading(true);
    
    try {
      // Vérifier si les utilisateurs sont amis
      const { data: areFriends, error } = await supabase.rpc('are_users_friends', {
        user1_id: user.id,
        user2_id: organizerId
      });

      if (error) {
        console.error('Error checking friendship:', error);
        toast({
          title: "Erreur",
          description: "Impossible de vérifier le statut d'amitié",
          variant: "destructive"
        });
        return;
      }

      if (areFriends) {
        // Si ils sont amis, rediriger vers la messagerie
        navigate(`/messages?startConversation=${organizerId}&message=${encodeURIComponent(
          `Bonjour ! J'ai une question concernant votre séance "${sessionTitle}" du ${new Date(scheduledAt).toLocaleDateString('fr-FR')} :\n\n${question.trim()}`
        )}`);
      } else {
        // Si ils ne sont pas amis, rediriger vers le profil avec un message d'erreur
        toast({
          title: "Non autorisé",
          description: "Vous devez être amis pour envoyer un message",
          variant: "destructive"
        });
        navigate(`/profile/${organizerId}?error=not_friends`);
      }
    } catch (error: any) {
      console.error('Error sending question:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendQuestion();
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Poser une question
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Écrivez votre question à l'organisateur
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            placeholder="Tapez votre question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button 
            onClick={handleSendQuestion}
            disabled={!question.trim() || loading}
            size="sm"
          >
            {loading ? (
              "Vérification..."
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};