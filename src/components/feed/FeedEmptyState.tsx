import { Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const FeedEmptyState = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {/* Icon */}
      <div className="mb-6 p-6 bg-secondary rounded-full">
        <Users className="h-12 w-12 text-muted-foreground" />
      </div>

      {/* Text */}
      <div className="space-y-2 mb-8">
        <h3 className="text-[20px] font-semibold text-foreground">
          Votre feed est vide
        </h3>
        <p className="text-[15px] text-muted-foreground max-w-xs leading-relaxed">
          Suivez des amis pour voir leurs sessions sportives et restez motivé ensemble.
        </p>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          onClick={() => navigate('/search')}
          className="w-full"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Découvrir des sportifs
        </Button>
        
        <Button
          onClick={() => navigate('/')}
          variant="secondary"
          className="w-full"
        >
          Explorer les sessions
        </Button>
      </div>

      {/* Tip */}
      <div className="mt-10 px-4 py-3 bg-secondary rounded-[10px] max-w-sm">
        <p className="text-[13px] text-muted-foreground">
          <span className="font-medium">Astuce :</span> Invitez vos amis avec votre code de parrainage pour gagner des points bonus.
        </p>
      </div>
    </div>
  );
};