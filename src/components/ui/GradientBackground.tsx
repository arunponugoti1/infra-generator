import React from 'react';

interface GradientBackgroundProps {
  children: React.ReactNode;
  variant?: 'default' | 'purple' | 'blue' | 'green' | 'orange';
  animated?: boolean;
}

const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  variant = 'default',
  animated = true
}) => {
  const variants = {
    default: 'from-slate-50 via-blue-50 to-indigo-100',
    purple: 'from-purple-50 via-pink-50 to-indigo-100',
    blue: 'from-blue-50 via-cyan-50 to-teal-100',
    green: 'from-green-50 via-emerald-50 to-teal-100',
    orange: 'from-orange-50 via-amber-50 to-yellow-100'
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${variants[variant]} relative overflow-hidden`}>
      {/* Animated background patterns */}
      {animated && (
        <>
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
          </div>
          
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                               radial-gradient(circle at 75% 75%, rgba(147, 51, 234, 0.1) 0%, transparent 50%),
                               radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)`
            }}></div>
          </div>
        </>
      )}
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default GradientBackground;