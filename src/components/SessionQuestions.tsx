import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

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
  const [question, setQuestion] = useState("");

  const handleSendQuestion = () => {
    if (!question.trim()) return;

    // Navigate to messages page and start conversation with organizer
    navigate(`/messages?startConversation=${organizerId}&message=${encodeURIComponent(
      `Bonjour ! J'ai une question concernant votre séance "${sessionTitle}" du ${new Date(scheduledAt).toLocaleDateString('fr-FR')} :\n\n${question.trim()}`
    )}`);
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
            disabled={!question.trim()}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};