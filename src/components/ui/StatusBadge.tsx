import React from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'success' | 'error' | 'pending' | 'warning';
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  text,
  size = 'md',
  animated = true
}) => {
  const configs = {
    success: {
      icon: CheckCircle,
      colors: 'bg-green-100 text-green-800 border-green-200',
      glowColor: 'shadow-green-500/25'
    },
    error: {
      icon: XCircle,
      colors: 'bg-red-100 text-red-800 border-red-200',
      glowColor: 'shadow-red-500/25'
    },
    pending: {
      icon: Clock,
      colors: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      glowColor: 'shadow-yellow-500/25'
    },
    warning: {
      icon: AlertTriangle,
      colors: 'bg-orange-100 text-orange-800 border-orange-200',
      glowColor: 'shadow-orange-500/25'
    }
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <div className={`
      inline-flex items-center space-x-2 rounded-full border font-medium
      ${config.colors} ${sizes[size]} ${config.glowColor}
      ${animated ? 'transition-all duration-300 hover:scale-105' : ''}
      shadow-lg backdrop-blur-sm
    `}>
      <Icon className={`${iconSizes[size]} ${status === 'pending' && animated ? 'animate-spin' : ''}`} />
      {text && <span>{text}</span>}
    </div>
  );
};

export default StatusBadge;