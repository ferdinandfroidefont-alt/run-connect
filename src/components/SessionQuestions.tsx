import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, MapPin, Clock, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

  const questions = [
    {
      id: 1,
      text: "Quelle est l'allure prévue ?",
      icon: Clock,
    },
    {
      id: 2,
      text: "Y a-t-il un point de rendez-vous spécifique ?",
      icon: MapPin,
    },
    {
      id: 3,
      text: "Combien de participants sont attendus ?",
      icon: Users,
    },
    {
      id: 4,
      text: "Qu'est-ce qu'il faut apporter ?",
      icon: MessageCircle,
    },
    {
      id: 5,
      text: "Le parcours est-il adapté aux débutants ?",
      icon: MessageCircle,
    },
    {
      id: 6,
      text: "Y a-t-il des vestiaires disponibles ?",
      icon: MessageCircle,
    }
  ];

  const handleQuestionClick = (questionText: string) => {
    // Navigate to messages page and start conversation with organizer
    navigate(`/messages?startConversation=${organizerId}&message=${encodeURIComponent(
      `Bonjour ! J'ai une question concernant votre séance "${sessionTitle}" du ${new Date(scheduledAt).toLocaleDateString('fr-FR')} :\n\n${questionText}`
    )}`);
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Questions fréquentes
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Cliquez sur une question pour contacter l'organisateur
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {questions.map((question) => (
          <Button
            key={question.id}
            variant="ghost"
            className="w-full justify-start h-auto p-3 text-left"
            onClick={() => handleQuestionClick(question.text)}
          >
            <question.icon className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground" />
            <span className="text-sm">{question.text}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};