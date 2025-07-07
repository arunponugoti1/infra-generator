import React, { useState } from 'react';
import { Cloud, User, Bell, Search, Settings, LogOut, Menu, X } from 'lucide-react';
import { useBasicAuth } from '../../contexts/BasicAuthContext';
import GlassCard from '../ui/GlassCard';
import StatusBadge from '../ui/StatusBadge';

const EnhancedHeader: React.FC = () => {
  const { user, signOut } = useBasicAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const notifications = [
    { id: 1, title: 'Deployment Complete', message: 'GKE cluster successfully created', type: 'success', time: '2 min ago' },
    { id: 2, title: 'Cost Alert', message: 'Monthly spend approaching limit', type: 'warning', time: '1 hour ago' },
    { id: 3, title: 'Security Scan', message: 'New vulnerabilities detected', type: 'error', time: '3 hours ago' }
  ];

  return (
    <header className="relative">
      {/* Background with gradient and blur */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-purple-600/90 to-pink-600/90 backdrop-blur-xl"></div>
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl"></div>
              <div className="relative bg-gradient-to-br from-white/30 to-white/10 p-3 rounded-2xl border border-white/20 backdrop-blur-sm">
                <Cloud className="h-8 w-8 text-white" />
              </div>
            </div>
            
            <div className="hidden md:block">
              <h1 className="text-2xl font-bold text-white">OneClick Infra</h1>
              <p className="text-sm text-white/80">Enterprise Infrastructure Platform</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-white/60" />
              </div>
              <input
                type="text"
                placeholder="Search resources, deployments..."
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 backdrop-blur-sm transition-all duration-300"
              />
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105"
              >
                <Bell className="h-5 w-5 text-white" />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">3</span>
                </div>
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 z-50">
                  <GlassCard className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Notifications</h3>
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <div key={notification.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                          <StatusBadge status={notification.type as any} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm">{notification.title}</p>
                            <p className="text-gray-600 text-xs">{notification.message}</p>
                            <p className="text-gray-400 text-xs mt-1">{notification.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </div>
              )}
            </div>

            {/* User Menu */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 p-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs text-white/70">{user.email}</p>
                  </div>
                </button>

                {/* User Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 z-50">
                    <GlassCard className="p-4">
                      <div className="flex items-center space-x-3 mb-4 pb-4 border-b border-gray-200">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                          <span className="text-lg font-bold text-white">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <button className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">Profile Settings</span>
                        </button>
                        <button className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors">
                          <Settings className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">Preferences</span>
                        </button>
                        <hr className="my-2" />
                        <button
                          onClick={signOut}
                          className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-red-50 rounded-lg transition-colors text-red-600"
                        >
                          <LogOut className="h-4 w-4" />
                          <span className="text-sm">Sign Out</span>
                        </button>
                      </div>
                    </GlassCard>
                  </div>
                )}
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 backdrop-blur-sm transition-all duration-300"
            >
              {showMobileMenu ? (
                <X className="h-5 w-5 text-white" />
              ) : (
                <Menu className="h-5 w-5 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="md:hidden absolute top-full left-0 right-0 z-40">
          <GlassCard className="m-4 p-4">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {user && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                      <span className="font-bold text-white">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={signOut}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-red-50 rounded-lg transition-colors text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm">Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}
    </header>
  );
};

export default EnhancedHeader;
