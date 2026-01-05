import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  MessageSquare, 
  UserPlus, 
  Calendar, 
  Users, 
  CheckCircle2, 
  MapPin,
  Loader2,
  AlertCircle,
  Check,
  X,
  Trophy
} from "lucide-react";
import { useSendNotification } from "@/hooks/useSendNotification";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface NotificationType {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  type: string;
  testData: any;
}

interface TestResult {
  typeId: string;
  success: boolean;
  message: string;
  timestamp: Date;
}

export const NotificationTestSuite = () => {
  const { user } = useAuth();
  const { sendPushNotification, lastPushError } = useSendNotification();
  const { toast } = useToast();
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);

  const notificationTypes: NotificationType[] = [
    {
      id: 'message',
      label: 'Message',
      description: 'Nouveau message reçu',
      icon: <MessageSquare className="h-4 w-4" />,
      type: 'message',
      testData: { 
        sender_name: 'Test User', 
        message_preview: 'Ceci est un message test',
        conversation_id: 'test-conv-123'
      }
    },
    {
      id: 'follow_request',
      label: 'Demande de suivi',
      description: 'Quelqu\'un veut vous suivre',
      icon: <UserPlus className="h-4 w-4" />,
      type: 'follow_request',
      testData: { 
        follower_name: 'Runner Pro',
        follower_id: 'test-user-123'
      }
    },
    {
      id: 'session_request',
      label: 'Demande de session',
      description: 'Participation demandée',
      icon: <Calendar className="h-4 w-4" />,
      type: 'session_request',
      testData: { 
        requester_name: 'John Runner',
        session_id: 'test-session-123',
        session_title: 'Sortie matinale 10km'
      }
    },
    {
      id: 'session_accepted',
      label: 'Session acceptée',
      description: 'Votre demande est acceptée',
      icon: <CheckCircle2 className="h-4 w-4" />,
      type: 'session_accepted',
      testData: { 
        session_title: 'Trail du dimanche',
        organizer_name: 'Marie Coach'
      }
    },
    {
      id: 'club_invitation',
      label: 'Invitation club',
      description: 'Invitation à rejoindre un club',
      icon: <Users className="h-4 w-4" />,
      type: 'club_invitation',
      testData: { 
        club_name: 'Runners Paris',
        inviter_name: 'Alex Admin'
      }
    },
    {
      id: 'friend_session',
      label: 'Session d\'ami',
      description: 'Un ami a créé une session',
      icon: <MapPin className="h-4 w-4" />,
      type: 'friend_session',
      testData: { 
        organizer_name: 'Sophie Runner',
        session_title: 'Footing relax 5km'
      }
    },
    {
      id: 'presence_confirmed',
      label: 'Présence confirmée',
      description: 'Votre présence est validée',
      icon: <Check className="h-4 w-4" />,
      type: 'presence_confirmed',
      testData: { 
        session_title: 'Semi-marathon prep',
        points_awarded: 50
      }
    },
    {
      id: 'challenge_completed',
      label: 'Défi complété',
      description: 'Vous avez terminé un défi',
      icon: <Trophy className="h-4 w-4" />,
      type: 'challenge_completed',
      testData: { 
        challenge_title: '3 sessions cette semaine',
        reward_points: 100
      }
    }
  ];

  const testNotification = async (notifType: NotificationType) => {
    if (!user?.id) {
      toast({
        title: "Non connecté",
        description: "Connectez-vous pour tester les notifications",
        variant: "destructive"
      });
      return;
    }

    setTesting(notifType.id);
    
    const testId = `test-${Date.now()}`;
    console.log(`🧪 [TEST-SUITE] Testing ${notifType.type} (ID: ${testId})`);
    
    try {
      const success = await sendPushNotification(
        user.id,
        `Test: ${notifType.label}`,
        notifType.description,
        notifType.type,
        { ...notifType.testData, test_id: testId }
      );
      
      const result: TestResult = {
        typeId: notifType.id,
        success,
        message: success 
          ? 'Notification envoyée avec succès' 
          : lastPushError?.reason || 'Échec de l\'envoi',
        timestamp: new Date()
      };
      
      setResults(prev => [result, ...prev.slice(0, 9)]); // Garder les 10 derniers
      
      if (success) {
        toast({
          title: `✅ ${notifType.label}`,
          description: "Notification envoyée ! Vérifiez votre barre de notifications."
        });
      } else {
        toast({
          title: `❌ ${notifType.label}`,
          description: lastPushError?.reason || "L'envoi a échoué",
          variant: "destructive"
        });
      }
    } catch (error) {
      const result: TestResult = {
        typeId: notifType.id,
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        timestamp: new Date()
      };
      setResults(prev => [result, ...prev.slice(0, 9)]);
      
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du test",
        variant: "destructive"
      });
    } finally {
      setTesting(null);
    }
  };

  const testAllNotifications = async () => {
    for (const notifType of notificationTypes) {
      await testNotification(notifType);
      // Petit délai entre chaque test
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const getResultForType = (typeId: string): TestResult | undefined => {
    return results.find(r => r.typeId === typeId);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Test des notifications</h3>
        </div>
        <Button 
          size="sm" 
          onClick={testAllNotifications}
          disabled={testing !== null}
        >
          Tester tout
        </Button>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Testez chaque type de notification individuellement pour vérifier qu'elles fonctionnent.
      </p>

      <ScrollArea className="h-[400px] pr-2">
        <div className="space-y-2">
          {notificationTypes.map((notifType) => {
            const result = getResultForType(notifType.id);
            const isCurrentlyTesting = testing === notifType.id;
            
            return (
              <motion.div
                key={notifType.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    {notifType.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{notifType.label}</span>
                      {result && (
                        <AnimatePresence>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            {result.success ? (
                              <Badge variant="default" className="bg-green-500 text-white text-xs">
                                <Check className="h-3 w-3 mr-1" />
                                OK
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                <X className="h-3 w-3 mr-1" />
                                Échec
                              </Badge>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{notifType.description}</p>
                    {result && !result.success && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {result.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testNotification(notifType)}
                  disabled={isCurrentlyTesting || testing !== null}
                  className="min-w-[70px]"
                >
                  {isCurrentlyTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Tester'
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      {lastPushError && (
        <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
          <p className="font-medium">Dernier diagnostic :</p>
          <p><span className="text-muted-foreground">Stage:</span> {lastPushError.stage}</p>
          <p><span className="text-muted-foreground">Raison:</span> {lastPushError.reason}</p>
          {lastPushError.token && (
            <p><span className="text-muted-foreground">Token:</span> {lastPushError.token.substring(0, 30)}...</p>
          )}
        </div>
      )}
    </Card>
  );
};
