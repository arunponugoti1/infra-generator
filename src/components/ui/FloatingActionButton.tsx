import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface FloatingAction {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  color?: string;
}

interface FloatingActionButtonProps {
  actions: FloatingAction[];
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  actions,
  position = 'bottom-right'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* Action buttons */}
      <div className={`absolute ${position.includes('bottom') ? 'bottom-16' : 'top-16'} ${position.includes('right') ? 'right-0' : 'left-0'} space-y-3`}>
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <div
              key={index}
              className={`transform transition-all duration-300 ${
                isOpen 
                  ? 'translate-y-0 opacity-100 scale-100' 
                  : `${position.includes('bottom') ? 'translate-y-4' : '-translate-y-4'} opacity-0 scale-75`
              }`}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center space-x-3">
                {position.includes('right') && (
                  <div className="bg-black/80 text-white px-3 py-2 rounded-lg text-sm font-medium backdrop-blur-sm">
                    {action.label}
                  </div>
                )}
                
                <button
                  onClick={action.onClick}
                  className={`w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95 ${
                    action.color || 'bg-gradient-to-r from-blue-500 to-purple-600'
                  } text-white flex items-center justify-center`}
                >
                  <Icon className="w-5 h-5" />
                </button>
                
                {position.includes('left') && (
                  <div className="bg-black/80 text-white px-3 py-2 rounded-lg text-sm font-medium backdrop-blur-sm">
                    {action.label}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 text-white flex items-center justify-center group"
      >
        <div className="relative">
          <Plus className={`w-6 h-6 transition-transform duration-300 ${isOpen ? 'rotate-45' : 'rotate-0'}`} />
        </div>
        
        {/* Ripple effect */}
        <div className="absolute inset-0 rounded-full bg-white/20 scale-0 group-active:scale-100 transition-transform duration-200"></div>
      </button>
    </div>
  );
};

export default FloatingActionButton;