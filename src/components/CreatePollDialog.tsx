import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';


interface CreatePollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  userId: string;
  onPollCreated: (pollId: string) => void;
}

export const CreatePollDialog = ({
  open,
  onOpenChange,
  conversationId,
  userId,
  onPollCreated,
}: CreatePollDialogProps) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleCreate = async () => {
    if (!question.trim()) {
      toast({ title: 'Posez une question', variant: 'destructive' });
      return;
    }

    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) {
      toast({ title: 'Au moins 2 options requises', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const pollOptions = validOptions.map((text, i) => ({
        id: `opt${i + 1}`,
        text: text.trim(),
        votes: [] as string[],
      }));

      const { data, error } = await supabase
        .from('polls' as any)
        .insert({
          conversation_id: conversationId,
          creator_id: userId,
          question: question.trim(),
          options: pollOptions,
        })
        .select('id')
        .single();

      if (error) throw error;

      await onPollCreated((data as any).id);
      onOpenChange(false);
      setQuestion('');
      setOptions(['', '']);
      toast({ title: '📊 Sondage créé !' });
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="rounded-2xl max-w-[340px] p-0 gap-0 bg-background">
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="text-[17px] font-semibold text-foreground">
              Créer un sondage
            </h3>
          </div>

          <div>
            <Label className="text-[13px] text-muted-foreground">Question</Label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex: À quelle heure ?"
              className="mt-1.5 h-11"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[13px] text-muted-foreground">
              Options ({options.length}/6)
            </Label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className="h-10 flex-1"
                />
                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(i)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <button
                onClick={addOption}
                className="flex items-center gap-2 text-[13px] text-primary px-2 py-1.5 hover:bg-primary/5 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Ajouter une option
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-border flex">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 h-[44px] text-primary text-[17px] hover:bg-secondary/50 transition-colors border-r border-border"
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex-1 h-[44px] text-primary text-[17px] font-semibold hover:bg-secondary/50 transition-colors disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
