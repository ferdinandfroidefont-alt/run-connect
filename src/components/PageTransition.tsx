import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: ReactNode;
}

/** Courbe proche des transitions système iOS */
const iosEase = [0.32, 0.72, 0, 1] as [number, number, number, number];

/* Pas de translateY : un transform sur l’ancêtre casse sticky/fixed et le comportement iOS clavier. */
const pageVariants = {
  initial: {
    opacity: 0.98,
  },
  enter: {
    opacity: 1,
    transition: {
      duration: 0.08,
      ease: iosEase,
    },
  },
  exit: {
    opacity: 0.995,
    transition: {
      duration: 0.04,
      ease: iosEase,
    },
  },
};

export const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <motion.div
      key={location.pathname}
      variants={pageVariants}
      initial={false}
      animate="enter"
      exit="exit"
      transition={{ duration: 0 }}
      className={
        isHome
          ? 'flex min-h-0 w-full flex-1 flex-col pointer-events-none'
          : 'flex min-h-0 w-full flex-1 flex-col pointer-events-auto'
      }
    >
      {children}
    </motion.div>
  );
};
