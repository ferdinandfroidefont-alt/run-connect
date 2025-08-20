import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Users, Filter } from "lucide-react";
import { useState } from "react";

// Mock data pour les séances
const mockSessions = [
  {
    id: 1,
    title: "Football au Parc des Princes",
    date: "2024-01-25",
    time: "18:00",
    location: "Parc des Princes, Paris",
    participants: 12,
    maxParticipants: 22,
    sport: "Football",
    status: "active",
    isCreator: true
  },
  {
    id: 2,
    title: "Tennis Roland Garros",
    date: "2024-01-27",
    time: "14:30",
    location: "Roland Garros, Paris",
    participants: 3,
    maxParticipants: 4,
    sport: "Tennis",
    status: "active",
    isCreator: false
  },
  {
    id: 3,
    title: "Basketball Bercy",
    date: "2024-01-20",
    time: "20:00",
    location: "AccorHotels Arena, Paris",
    participants: 8,
    maxParticipants: 10,
    sport: "Basketball",
    status: "completed",
    isCreator: true
  }
];

export default function MySessions() {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const filteredSessions = mockSessions.filter(session => {
    if (filter === 'all') return true;
    return session.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'completed':
        return <Badge variant="secondary">Terminée</Badge>;
      default:
        return <Badge variant="outline">Inconnue</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Mes Séances</h1>
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-muted-foreground" />
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'completed')}
            className="bg-background border border-border rounded-md px-3 py-1 text-sm"
          >
            <option value="all">Toutes</option>
            <option value="active">Actives</option>
            <option value="completed">Terminées</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredSessions.map((session) => (
          <Card key={session.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{session.title}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusBadge(session.status)}
                    {session.isCreator && (
                      <Badge variant="outline">Créateur</Badge>
                    )}
                  </div>
                </div>
                <Badge variant="secondary">{session.sport}</Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar size={16} />
                <span>{new Date(session.date).toLocaleDateString('fr-FR')}</span>
                <Clock size={16} className="ml-2" />
                <span>{session.time}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin size={16} />
                <span>{session.location}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users size={16} />
                <span>{session.participants}/{session.maxParticipants} participants</span>
              </div>
              
              <div className="flex items-center gap-2 pt-2">
                {session.status === 'active' && (
                  <>
                    <Button variant="default" size="sm">
                      Voir détails
                    </Button>
                    {session.isCreator && (
                      <Button variant="outline" size="sm">
                        Modifier
                      </Button>
                    )}
                  </>
                )}
                {session.status === 'completed' && (
                  <Button variant="outline" size="sm">
                    Voir résumé
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSessions.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⚽</div>
          <h3 className="text-xl font-semibold mb-2">Aucune séance trouvée</h3>
          <p className="text-muted-foreground mb-4">
            {filter === 'all' 
              ? "Vous n'avez pas encore de séances. Créez votre première séance !" 
              : `Aucune séance ${filter === 'active' ? 'active' : 'terminée'} trouvée.`}
          </p>
          <Button>Créer une séance</Button>
        </div>
      )}
    </div>
  );
}