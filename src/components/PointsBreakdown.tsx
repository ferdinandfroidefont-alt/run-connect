import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

interface PointsBreakdownProps {
  organizerPoints: number;
  participantCount: number;
}

export const PointsBreakdown = ({ organizerPoints, participantCount }: PointsBreakdownProps) => {
  const basePoints = 10;
  const participantBonus = participantCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="ios-card p-ios-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h3 className="font-bold">Points gagnés (organisateur)</h3>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Points de base</span>
          <span className="text-green-500 font-medium">+{basePoints} pts</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Bonus participants ({participantCount})
          </span>
          <span className="text-green-500 font-medium">+{participantBonus} pts</span>
        </div>
        
        <div className="flex justify-between border-t pt-2 font-bold">
          <span>Total</span>
          <motion.span
            key={organizerPoints}
            initial={{ scale: 1.2, color: 'hsl(142 76% 36%)' }}
            animate={{ scale: 1, color: 'hsl(142 76% 36%)' }}
            className="text-green-500"
          >
            +{organizerPoints} pts
          </motion.span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Les participants validés recevront +10 pts (GPS) + +10 pts (validation créateur) + +5 pts (bonus double validation)
      </p>
    </motion.div>
  );
};
