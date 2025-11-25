import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ProfileStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  gradient?: boolean;
}

export const ProfileStatCard = ({ icon: Icon, label, value, gradient }: ProfileStatCardProps) => {
  return (
    <Card className={`relative overflow-hidden ${gradient ? 'bg-gradient-to-br from-primary/20 to-primary/5' : 'bg-card/50'} backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105`}>
      <div className="p-4 flex flex-col items-center justify-center gap-2 min-h-[100px]">
        <Icon className="h-6 w-6 text-primary" />
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground text-center">{label}</div>
      </div>
    </Card>
  );
};
