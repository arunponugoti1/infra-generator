import React, { useState } from 'react';
import { Cloud, Layers, Monitor, History, Save, Settings, Zap, Shield, DollarSign, TrendingUp, Server, Database, Network } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import MetricCard from '../ui/MetricCard';
import AnimatedButton from '../ui/AnimatedButton';
import ProgressRing from '../ui/ProgressRing';
import StatusBadge from '../ui/StatusBadge';
import FloatingActionButton from '../ui/FloatingActionButton';

const EnhancedDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState('overview');

  const metrics = [
    { title: 'Active Clusters', value: '3', change: 12, changeType: 'increase' as const, icon: Cloud, color: 'blue' as const },
    { title: 'Monthly Cost', value: '$247.80', change: -8, changeType: 'decrease' as const, icon: DollarSign, color: 'green' as const },
    { title: 'Deployments', value: '24', change: 15, changeType: 'increase' as const, icon: Layers, color: 'purple' as const },
    { title: 'Uptime', value: '99.9%', change: 0.1, changeType: 'increase' as const, icon: TrendingUp, color: 'orange' as const }
  ];

  const recentDeployments = [
    { name: 'production-gke-cluster', status: 'success', time: '2 hours ago', type: 'infrastructure' },
    { name: 'frontend-app-v2.1', status: 'success', time: '4 hours ago', type: 'application' },
    { name: 'backend-api-update', status: 'pending', time: '6 hours ago', type: 'application' },
    { name: 'monitoring-stack', status: 'error', time: '1 day ago', type: 'infrastructure' }
  ];

  const quickActions = [
    { icon: Cloud, label: 'New Cluster', onClick: () => console.log('New cluster') },
    { icon: Layers, label: 'Deploy App', onClick: () => console.log('Deploy app') },
    { icon: Monitor, label: 'Monitor', onClick: () => console.log('Monitor') },
    { icon: Settings, label: 'Settings', onClick: () => console.log('Settings') }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(147, 51, 234, 0.1) 0%, transparent 50%)`
        }}></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <GlassCard className="p-8" gradient>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back! 👋
                </h1>
                <p className="text-gray-600 text-lg">
                  Your infrastructure is running smoothly. Here's what's happening today.
                </p>
              </div>
              
              <div className="hidden lg:flex items-center space-x-4">
                <ProgressRing progress={85} size={100}>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">85%</div>
                    <div className="text-xs text-gray-600">Health</div>
                  </div>
                </ProgressRing>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <MetricCard
              key={index}
              title={metric.title}
              value={metric.value}
              change={metric.change}
              changeType={metric.changeType}
              icon={metric.icon}
              color={metric.color}
            />
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Recent Deployments</h2>
                <AnimatedButton variant="secondary" size="sm">
                  View All
                </AnimatedButton>
              </div>
              
              <div className="space-y-4">
                {recentDeployments.map((deployment, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-white/20 hover:bg-white/70 transition-all duration-300">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${
                        deployment.type === 'infrastructure' 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-purple-100 text-purple-600'
                      }`}>
                        {deployment.type === 'infrastructure' ? (
                          <Cloud className="w-5 h-5" />
                        ) : (
                          <Layers className="w-5 h-5" />
                        )}
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-gray-900">{deployment.name}</h3>
                        <p className="text-sm text-gray-600">{deployment.time}</p>
                      </div>
                    </div>
                    
                    <StatusBadge status={deployment.status as any} />
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Quick Actions */}
          <div>
            <GlassCard className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
              
              <div className="space-y-3">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      onClick={action.onClick}
                      className="w-full flex items-center space-x-3 p-4 bg-white/50 hover:bg-white/70 rounded-xl border border-white/20 transition-all duration-300 hover:scale-[1.02] group"
                    >
                      <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-gray-900">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Resource Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl">
                <Server className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Compute Resources</h3>
                <p className="text-sm text-gray-600">6 instances running</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">CPU Usage</span>
                <span className="text-sm font-medium">67%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-1000" style={{ width: '67%' }}></div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Storage</h3>
                <p className="text-sm text-gray-600">2.4 TB used</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Disk Usage</span>
                <span className="text-sm font-medium">45%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-600 h-2 rounded-full transition-all duration-1000" style={{ width: '45%' }}></div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl">
                <Network className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Network</h3>
                <p className="text-sm text-gray-600">3 VPCs active</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Bandwidth</span>
                <span className="text-sm font-medium">23%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 h-2 rounded-full transition-all duration-1000" style={{ width: '23%' }}></div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton
        actions={[
          { icon: Cloud, label: 'New Infrastructure', onClick: () => console.log('New infra') },
          { icon: Layers, label: 'Deploy Application', onClick: () => console.log('Deploy app') },
          { icon: Monitor, label: 'View Monitoring', onClick: () => console.log('Monitor') }
        ]}
      />
    </div>
  );
};

export default EnhancedDashboard;