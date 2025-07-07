import React, { useState } from 'react';
import { Puzzle, Monitor, Shield, DollarSign, Settings } from 'lucide-react';
import PluginManager from '../plugins/PluginManager';
import EnhancedResourceMonitoring from '../plugins/EnhancedResourceMonitoring';
import SecurityScanner from '../plugins/SecurityScanner';
import CostOptimizer from '../plugins/CostOptimizer';

interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  component: React.ComponentType<any>;
  category: 'monitoring' | 'deployment' | 'security' | 'analytics' | 'integration';
}

const EnhancedApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('plugins');
  const [enabledPlugins, setEnabledPlugins] = useState<string[]>([]);

  const availablePlugins: Plugin[] = [
    {
      id: 'enhanced-monitoring',
      name: 'Enhanced Resource Monitoring',
      description: 'Advanced monitoring with real-time metrics, cost analysis, and performance insights',
      version: '1.0.0',
      enabled: enabledPlugins.includes('enhanced-monitoring'),
      component: EnhancedResourceMonitoring,
      category: 'monitoring'
    },
    {
      id: 'security-scanner',
      name: 'Security Scanner',
      description: 'Comprehensive security assessment and vulnerability scanning',
      version: '1.0.0',
      enabled: enabledPlugins.includes('security-scanner'),
      component: SecurityScanner,
      category: 'security'
    },
    {
      id: 'cost-optimizer',
      name: 'Cost Optimizer',
      description: 'Analyze and optimize infrastructure costs with actionable recommendations',
      version: '1.0.0',
      enabled: enabledPlugins.includes('cost-optimizer'),
      component: CostOptimizer,
      category: 'analytics'
    }
  ];

  const handlePluginToggle = (pluginId: string, enabled: boolean) => {
    if (enabled) {
      setEnabledPlugins(prev => [...prev, pluginId]);
    } else {
      setEnabledPlugins(prev => prev.filter(id => id !== pluginId));
    }
  };

  const tabs = [
    { id: 'plugins', label: 'Plugin Manager', icon: Puzzle },
    { id: 'enhanced-monitoring', label: 'Enhanced Monitoring', icon: Monitor },
    { id: 'security-scanner', label: 'Security Scanner', icon: Shield },
    { id: 'cost-optimizer', label: 'Cost Optimizer', icon: DollarSign }
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'plugins':
        return (
          <PluginManager
            availablePlugins={availablePlugins}
            onPluginToggle={handlePluginToggle}
          />
        );
      case 'enhanced-monitoring':
        if (enabledPlugins.includes('enhanced-monitoring')) {
          return <EnhancedResourceMonitoring terraformConfig={{}} githubConfig={{}} />;
        }
        return <PluginNotEnabled pluginName="Enhanced Resource Monitoring" />;
      case 'security-scanner':
        if (enabledPlugins.includes('security-scanner')) {
          return <SecurityScanner />;
        }
        return <PluginNotEnabled pluginName="Security Scanner" />;
      case 'cost-optimizer':
        if (enabledPlugins.includes('cost-optimizer')) {
          return <CostOptimizer />;
        }
        return <PluginNotEnabled pluginName="Cost Optimizer" />;
      default:
        return <PluginManager availablePlugins={availablePlugins} onPluginToggle={handlePluginToggle} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-600 p-2 rounded-lg">
                <Puzzle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">IaC Generator Enhanced</h1>
                <p className="text-sm text-gray-500">Extended Platform with Advanced Features</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isEnabled = tab.id === 'plugins' || enabledPlugins.includes(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={!isEnabled}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : isEnabled
                      ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      : 'border-transparent text-gray-300 cursor-not-allowed'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {!isEnabled && tab.id !== 'plugins' && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-1 rounded">Disabled</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {renderActiveTab()}
        </div>
      </main>
    </div>
  );
};

const PluginNotEnabled: React.FC<{ pluginName: string }> = ({ pluginName }) => (
  <div className="text-center py-12">
    <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
    <h3 className="text-lg font-medium text-gray-900 mb-2">Plugin Not Enabled</h3>
    <p className="text-gray-600 mb-4">
      The {pluginName} plugin is not currently enabled. Go to the Plugin Manager to enable it.
    </p>
    <button
      onClick={() => window.location.hash = '#plugins'}
      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
    >
      Go to Plugin Manager
    </button>
  </div>
);

export default EnhancedApp;