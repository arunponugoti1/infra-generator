import React, { useState, useEffect } from 'react';
import { Puzzle, Settings, Plus, Download, Upload } from 'lucide-react';

interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  component: React.ComponentType<any>;
  category: 'monitoring' | 'deployment' | 'security' | 'analytics' | 'integration';
}

interface PluginManagerProps {
  onPluginToggle: (pluginId: string, enabled: boolean) => void;
  availablePlugins: Plugin[];
}

const PluginManager: React.FC<PluginManagerProps> = ({ onPluginToggle, availablePlugins }) => {
  const [plugins, setPlugins] = useState<Plugin[]>(availablePlugins);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All Plugins', icon: Puzzle },
    { id: 'monitoring', name: 'Monitoring', icon: Settings },
    { id: 'deployment', name: 'Deployment', icon: Plus },
    { id: 'security', name: 'Security', icon: Settings },
    { id: 'analytics', name: 'Analytics', icon: Settings },
    { id: 'integration', name: 'Integration', icon: Settings }
  ];

  const filteredPlugins = selectedCategory === 'all' 
    ? plugins 
    : plugins.filter(p => p.category === selectedCategory);

  const handleToggle = (pluginId: string) => {
    setPlugins(prev => prev.map(p => 
      p.id === pluginId ? { ...p, enabled: !p.enabled } : p
    ));
    const plugin = plugins.find(p => p.id === pluginId);
    if (plugin) {
      onPluginToggle(pluginId, !plugin.enabled);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Plugin Manager</h2>
          <p className="text-gray-600">Extend your IaC Generator with additional features</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            <Download className="h-4 w-4" />
            <span>Install Plugin</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors">
            <Upload className="h-4 w-4" />
            <span>Upload Plugin</span>
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  selectedCategory === category.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{category.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Plugin Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlugins.map((plugin) => (
          <div key={plugin.id} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{plugin.name}</h3>
                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  v{plugin.version}
                </span>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={plugin.enabled}
                  onChange={() => handleToggle(plugin.id)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <p className="text-sm text-gray-600 mb-4">{plugin.description}</p>

            <div className="flex items-center justify-between">
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                plugin.category === 'monitoring' ? 'bg-green-100 text-green-800' :
                plugin.category === 'deployment' ? 'bg-blue-100 text-blue-800' :
                plugin.category === 'security' ? 'bg-red-100 text-red-800' :
                plugin.category === 'analytics' ? 'bg-purple-100 text-purple-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {plugin.category}
              </span>
              
              <button className="text-sm text-blue-600 hover:text-blue-800">
                Configure
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Plugin Store */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-2">🚀 Plugin Store</h3>
        <p className="text-gray-700 mb-4">
          Discover more plugins to extend your IaC Generator with advanced features like cost optimization, 
          security scanning, multi-cloud support, and more.
        </p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          Browse Plugin Store
        </button>
      </div>
    </div>
  );
};

export default PluginManager;