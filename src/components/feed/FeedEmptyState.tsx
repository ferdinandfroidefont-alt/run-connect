import { motion } from 'framer-motion';
import { Users, UserPlus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const FeedEmptyState = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
    >
      {/* Animated illustration */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ 
          delay: 0.3,
          type: "spring",
          stiffness: 200,
          damping: 15
        }}
        className="relative mb-8"
      >
        {/* Background glow */}
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
        
        {/* Icon container */}
        <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 rounded-full p-8 border border-primary/20">
          <motion.div
            animate={{ 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.02, 1]
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Users className="h-16 w-16 text-primary" />
          </motion.div>
          
          {/* Floating sparkles */}
          <motion.div
            animate={{ y: [-5, 5, -5], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-2 -right-2"
          >
            <Sparkles className="h-6 w-6 text-primary/60" />
          </motion.div>
          <motion.div
            animate={{ y: [5, -5, 5], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="absolute -bottom-1 -left-3"
          >
            <Sparkles className="h-5 w-5 text-primary/40" />
          </motion.div>
        </div>
      </motion.div>

      {/* Text content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-3 mb-8"
      >
        <h3 className="text-xl font-bold text-foreground">
          Votre feed est vide
        </h3>
        <p className="text-muted-foreground max-w-xs leading-relaxed">
          Suivez des amis pour voir leurs sessions sportives et restez motivé ensemble !
        </p>
      </motion.div>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col gap-3 w-full max-w-xs"
      >
        <Button
          onClick={() => navigate('/search')}
          size="lg"
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/25"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Découvrir des sportifs
        </Button>
        
        <Button
          onClick={() => navigate('/')}
          variant="outline"
          size="lg"
          className="w-full rounded-full border-white/10 hover:bg-white/5"
        >
          Explorer les sessions
        </Button>
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-10 px-4 py-3 bg-white/5 rounded-2xl border border-white/5 max-w-sm"
      >
        <p className="text-xs text-muted-foreground">
          💡 <span className="font-medium">Astuce :</span> Invitez vos amis avec votre code de parrainage pour gagner des points bonus !
        </p>
      </motion.div>
    </motion.div>
  );
};
