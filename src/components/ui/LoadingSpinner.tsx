import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'purple' | 'green' | 'red' | 'yellow';
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'blue',
  text
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colors = {
    blue: 'border-blue-500',
    purple: 'border-purple-500',
    green: 'border-green-500',
    red: 'border-red-500',
    yellow: 'border-yellow-500'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        {/* Outer ring */}
        <div className={`${sizes[size]} border-4 border-gray-200 rounded-full`}></div>
        
        {/* Spinning ring */}
        <div className={`absolute inset-0 ${sizes[size]} border-4 ${colors[color]} border-t-transparent rounded-full animate-spin`}></div>
        
        {/* Inner glow */}
        <div className={`absolute inset-2 bg-gradient-to-r from-${color}-400 to-${color}-600 rounded-full opacity-20 animate-pulse`}></div>
      </div>
      
      {text && (
        <p className="text-gray-600 text-sm font-medium animate-pulse">{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;