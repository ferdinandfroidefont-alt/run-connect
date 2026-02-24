import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Target, Plus, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";

interface UserGoal {
  id: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  period: string;
  period_start: string;
  completed_at: string | null;
}

const GOAL_TYPES = [
  { value: 'sessions_joined', label: 'Séances rejointes', icon: '🏃', unit: 'séances' },
  { value: 'sessions_created', label: 'Séances organisées', icon: '📋', unit: 'séances' },
  { value: 'points', label: 'Points gagnés', icon: '⭐', unit: 'points' },
];

const PERIOD_LABELS: Record<string, string> = {
  weekly: 'Cette semaine',
  monthly: 'Ce mois',
  seasonal: 'Cette saison',
};

export const PersonalGoals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newGoalType, setNewGoalType] = useState('sessions_joined');
  const [newGoalTarget, setNewGoalTarget] = useState('10');
  const [newGoalPeriod, setNewGoalPeriod] = useState('monthly');

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user]);

  const fetchGoals = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Update current values from real data
      const updatedGoals = await Promise.all((data || []).map(async (goal: any) => {
        const currentValue = await calculateCurrentValue(goal.goal_type, goal.period, goal.period_start);
        
        // Update in DB if changed
        if (currentValue !== goal.current_value) {
          await supabase
            .from('user_goals')
            .update({ 
              current_value: currentValue,
              completed_at: currentValue >= goal.target_value && !goal.completed_at ? new Date().toISOString() : goal.completed_at
            })
            .eq('id', goal.id);
        }

        return { ...goal, current_value: currentValue };
      }));

      setGoals(updatedGoals);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCurrentValue = async (goalType: string, period: string, periodStart: string): Promise<number> => {
    if (!user) return 0;
    
    const startDate = new Date(periodStart);
    const now = new Date();

    try {
      switch (goalType) {
        case 'sessions_joined': {
          const { count } = await supabase
            .from('session_participants')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('joined_at', startDate.toISOString())
            .lte('joined_at', now.toISOString());
          return count || 0;
        }
        case 'sessions_created': {
          const { count } = await supabase
            .from('sessions')
            .select('id', { count: 'exact', head: true })
            .eq('organizer_id', user.id)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', now.toISOString());
          return count || 0;
        }
        case 'points': {
          const { data } = await supabase
            .from('user_scores')
            .select('seasonal_points')
            .eq('user_id', user.id)
            .single();
          return data?.seasonal_points || 0;
        }
        default:
          return 0;
      }
    } catch {
      return 0;
    }
  };

  const getPeriodStart = (period: string): string => {
    const now = new Date();
    switch (period) {
      case 'weekly': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(now.setDate(diff)).toISOString();
      }
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      case 'seasonal':
      default:
        return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString();
    }
  };

  const addGoal = async () => {
    if (!user) return;
    const target = parseInt(newGoalTarget);
    if (isNaN(target) || target <= 0) return;

    try {
      const periodStart = getPeriodStart(newGoalPeriod);
      const currentValue = await calculateCurrentValue(newGoalType, newGoalPeriod, periodStart);

      const { error } = await supabase
        .from('user_goals')
        .insert({
          user_id: user.id,
          goal_type: newGoalType,
          target_value: target,
          current_value: currentValue,
          period: newGoalPeriod,
          period_start: periodStart,
          completed_at: currentValue >= target ? new Date().toISOString() : null,
        });

      if (error) throw error;

      setShowAddDialog(false);
      setNewGoalTarget('10');
      fetchGoals();
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('user_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;
      setGoals(prev => prev.filter(g => g.id !== goalId));
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const getGoalInfo = (goalType: string) => {
    return GOAL_TYPES.find(t => t.value === goalType) || GOAL_TYPES[0];
  };

  if (loading) {
    return (
      <Card className="bg-card rounded-[10px]">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-[13px] text-muted-foreground">Chargement des objectifs...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card rounded-[10px] overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="text-[15px] font-semibold">Mes objectifs</h3>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[340px]">
              <DialogHeader>
                <DialogTitle>Nouvel objectif</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-[13px] text-muted-foreground mb-1.5 block">Type</label>
                  <Select value={newGoalType} onValueChange={setNewGoalType}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[13px] text-muted-foreground mb-1.5 block">Objectif</label>
                  <Input
                    type="number"
                    value={newGoalTarget}
                    onChange={e => setNewGoalTarget(e.target.value)}
                    min="1"
                    className="h-11"
                    placeholder="Ex: 10"
                  />
                </div>
                <div>
                  <label className="text-[13px] text-muted-foreground mb-1.5 block">Période</label>
                  <Select value={newGoalPeriod} onValueChange={setNewGoalPeriod}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Hebdomadaire</SelectItem>
                      <SelectItem value="monthly">Mensuel</SelectItem>
                      <SelectItem value="seasonal">Saisonnier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addGoal} className="w-full h-11">
                  Créer l'objectif
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-4">
            <Target className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-[13px] text-muted-foreground">Aucun objectif défini</p>
            <p className="text-[11px] text-muted-foreground/70">Fixez-vous des objectifs pour rester motivé !</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {goals.map((goal) => {
                const info = getGoalInfo(goal.goal_type);
                const progress = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
                const isCompleted = goal.current_value >= goal.target_value;

                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="relative"
                  >
                    <div className={`p-3 rounded-lg border ${isCompleted ? 'border-green-200 bg-green-50/50' : 'border-border'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{info.icon}</span>
                          <div>
                            <p className="text-[13px] font-medium">
                              {info.label}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {PERIOD_LABELS[goal.period] || goal.period}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isCompleted && (
                            <Badge className="bg-green-100 text-green-700 border-0 text-[10px] px-1.5">
                              <Check className="h-3 w-3 mr-0.5" />
                              Atteint !
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteGoal(goal.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[12px]">
                          <span className="text-muted-foreground">
                            {goal.current_value} / {goal.target_value} {info.unit}
                          </span>
                          <span className={isCompleted ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                            {progress}%
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
