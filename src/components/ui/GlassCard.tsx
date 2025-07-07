import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  hover = true, 
  gradient = false 
}) => {
  return (
    <div className={`
      backdrop-blur-xl bg-white/80 border border-white/20 rounded-2xl shadow-xl
      ${gradient ? 'bg-gradient-to-br from-white/90 to-white/60' : ''}
      ${hover ? 'hover:shadow-2xl hover:scale-[1.02] transition-all duration-300' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
};

export default GlassCard;