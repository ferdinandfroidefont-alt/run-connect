import React from 'react';

interface AppIconProps {
  size?: number;
  className?: string;
}

const AppIcon: React.FC<AppIconProps> = ({ size = 512, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Gradient principal bleu-cyan */}
        <linearGradient id="pinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5B7CFF" />
          <stop offset="100%" stopColor="#60E6FF" />
        </linearGradient>
        
        {/* Gradient pour l'ombre intérieure */}
        <linearGradient id="innerShadow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.2" />
        </linearGradient>
        
        {/* Filtre de lueur */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="15" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        {/* Ombre portée */}
        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#5B7CFF" floodOpacity="0.4" />
        </filter>
      </defs>
      
      {/* Fond arrondi */}
      <rect
        x="16"
        y="16"
        width="480"
        height="480"
        rx="96"
        fill="#0A0F1C"
      />
      
      {/* Pin GPS principal avec lueur */}
      <g filter="url(#dropShadow)">
        <path
          d="M256 56C172.5 56 104 124.5 104 208C104 312 256 456 256 456C256 456 408 312 408 208C408 124.5 339.5 56 256 56Z"
          fill="url(#pinGradient)"
        />
        
        {/* Reflet sur le pin */}
        <path
          d="M256 56C172.5 56 104 124.5 104 208C104 240 116 270 136 296C180 252 220 180 256 140C292 180 332 252 376 296C396 270 408 240 408 208C408 124.5 339.5 56 256 56Z"
          fill="url(#innerShadow)"
          opacity="0.5"
        />
      </g>
      
      {/* Cercle central */}
      <circle
        cx="256"
        cy="200"
        r="85"
        fill="#0A0F1C"
      />
      
      {/* Silhouette du coureur dynamique */}
      <g transform="translate(256, 200)">
        {/* Corps du coureur stylisé */}
        <g fill="#60E6FF">
          {/* Tête */}
          <circle cx="-5" cy="-55" r="16" />
          
          {/* Torse incliné vers l'avant */}
          <path
            d="M-8 -38 L12 -10 L8 -6 L-12 -34 Z"
            fill="url(#pinGradient)"
          />
          
          {/* Bras avant (tendu vers l'avant) */}
          <path
            d="M8 -28 Q25 -35 35 -25 Q38 -22 35 -18 Q25 -22 12 -20"
            fill="url(#pinGradient)"
          />
          
          {/* Bras arrière */}
          <path
            d="M-5 -30 Q-25 -20 -32 -28 Q-35 -32 -30 -35 Q-22 -30 -8 -35"
            fill="url(#pinGradient)"
          />
          
          {/* Jambe avant (en extension) */}
          <path
            d="M10 -12 Q30 5 45 -5 L48 2 Q30 15 8 0 Z"
            fill="url(#pinGradient)"
          />
          
          {/* Jambe arrière (repliée) */}
          <path
            d="M5 -8 Q-15 10 -30 -5 Q-35 -10 -28 -15 Q-12 0 2 -12 Z"
            fill="url(#pinGradient)"
          />
        </g>
        
        {/* Lignes de mouvement/vitesse */}
        <g stroke="#60E6FF" strokeWidth="3" strokeLinecap="round" opacity="0.6">
          <line x1="-50" y1="-30" x2="-38" y2="-30" />
          <line x1="-55" y1="-15" x2="-40" y2="-15" />
          <line x1="-50" y1="0" x2="-38" y2="0" />
        </g>
      </g>
      
      {/* Points de localisation décoratifs */}
      <circle cx="140" cy="380" r="8" fill="#5B7CFF" opacity="0.4" />
      <circle cx="372" cy="380" r="8" fill="#60E6FF" opacity="0.4" />
      <circle cx="256" cy="420" r="6" fill="#5B7CFF" opacity="0.3" />
    </svg>
  );
};

export default AppIcon;
