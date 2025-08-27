import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ConversationTheme {
  id: string;
  name: string;
  description: string;
  previewColors: {
    background: string;
    ownMessage: string;
    otherMessage: string;
    text: string;
  };
  isPremium: boolean;
}

const conversationThemes: ConversationTheme[] = [
  {
    id: 'default',
    name: 'Par défaut',
    description: 'Le thème standard de RunConnect',
    previewColors: {
      background: 'bg-background',
      ownMessage: 'bg-primary',
      otherMessage: 'bg-muted',
      text: 'text-foreground'
    },
    isPremium: false
  },
  {
    id: 'ocean',
    name: 'Océan',
    description: 'Nuances de bleu apaisantes',
    previewColors: {
      background: 'bg-gradient-to-b from-blue-50 to-cyan-50',
      ownMessage: 'bg-blue-500',
      otherMessage: 'bg-blue-100',
      text: 'text-blue-900'
    },
    isPremium: true
  },
  {
    id: 'sunset',
    name: 'Coucher de soleil',
    description: 'Dégradé orange et rose chaleureux',
    previewColors: {
      background: 'bg-gradient-to-br from-orange-50 via-pink-50 to-red-50',
      ownMessage: 'bg-gradient-to-r from-orange-500 to-red-500',
      otherMessage: 'bg-orange-100',
      text: 'text-orange-900'
    },
    isPremium: true
  },
  {
    id: 'forest',
    name: 'Forêt',
    description: 'Vert naturel et reposant',
    previewColors: {
      background: 'bg-gradient-to-b from-green-50 to-emerald-50',
      ownMessage: 'bg-green-600',
      otherMessage: 'bg-green-100',
      text: 'text-green-900'
    },
    isPremium: true
  },
  {
    id: 'night',
    name: 'Mode nuit',
    description: 'Thème sombre élégant',
    previewColors: {
      background: 'bg-gradient-to-b from-slate-900 to-slate-800',
      ownMessage: 'bg-purple-600',
      otherMessage: 'bg-slate-700',
      text: 'text-slate-100'
    },
    isPremium: true
  },
  {
    id: 'runner',
    name: 'Runner',
    description: 'Thème énergique pour les coureurs',
    previewColors: {
      background: 'bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50',
      ownMessage: 'bg-gradient-to-r from-yellow-500 to-orange-500',
      otherMessage: 'bg-yellow-100',
      text: 'text-orange-900'
    },
    isPremium: true
  }
];

interface ConversationThemeSelectorProps {
  currentTheme: string;
  onThemeSelect: (themeId: string) => void;
}

export const ConversationThemeSelector = ({ currentTheme, onThemeSelect }: ConversationThemeSelectorProps) => {
  const { subscriptionInfo } = useAuth();
  const { toast } = useToast();
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);

  const handleThemeSelect = (theme: ConversationTheme) => {
    if (theme.isPremium && !subscriptionInfo?.subscribed) {
      toast({
        title: "Fonctionnalité Premium",
        description: "Les thèmes personnalisés sont réservés aux utilisateurs Premium",
        variant: "destructive"
      });
      return;
    }

    setSelectedTheme(theme.id);
    onThemeSelect(theme.id);
    
    toast({
      title: "Thème modifié",
      description: `Le thème "${theme.name}" a été appliqué`
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Thèmes de conversation</h3>
        <p className="text-sm text-muted-foreground">
          Personnalisez l'apparence de vos conversations
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {conversationThemes.map((theme) => (
          <Card 
            key={theme.id} 
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedTheme === theme.id ? 'ring-2 ring-primary' : ''
            } ${theme.isPremium && !subscriptionInfo?.subscribed ? 'opacity-60' : ''}`}
            onClick={() => handleThemeSelect(theme)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {theme.name}
                  {theme.isPremium && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                </span>
                {selectedTheme === theme.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-3">{theme.description}</p>
              
              {/* Preview */}
              <div className={`${theme.previewColors.background} rounded-lg p-3 border`}>
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <div className={`${theme.previewColors.ownMessage} text-white text-xs px-3 py-2 rounded-lg max-w-[80%]`}>
                      Salut ! Tu viens courir ?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className={`${theme.previewColors.otherMessage} ${theme.previewColors.text} text-xs px-3 py-2 rounded-lg max-w-[80%]`}>
                      Oui avec plaisir ! À quelle heure ?
                    </div>
                  </div>
                </div>
              </div>

              {theme.isPremium && (
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    <Crown className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {!subscriptionInfo?.subscribed && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Débloquez tous les thèmes
                </p>
                <p className="text-xs text-yellow-700">
                  Accédez à tous les thèmes avec RunConnect Premium
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};