import React, { useState, useEffect } from 'react';
import { Save, Download, Upload, Trash2, Edit, Copy, Plus, Search, Filter, Calendar, Settings } from 'lucide-react';
import { 
  getSavedConfigurations, 
  saveConfiguration, 
  updateConfiguration, 
  deleteConfiguration, 
  loadConfiguration 
} from '../../utils/localDeploymentTracking';

interface SavedConfig {
  id: string;
  name: string;
  description?: string;
  type: 'infrastructure' | 'application';
  configuration: any;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

interface SavedConfigurationsProps {
  onLoadConfiguration?: (config: any, type: 'infrastructure' | 'application') => void;
  currentInfraConfig?: any;
  currentAppConfig?: any;
}

const SavedConfigurations: React.FC<SavedConfigurationsProps> = ({ 
  onLoadConfiguration, 
  currentInfraConfig, 
  currentAppConfig 
}) => {
  const [configurations, setConfigurations] = useState<SavedConfig[]>([]);
  const [filter, setFilter] = useState<'all' | 'infrastructure' | 'application'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveType, setSaveType] = useState<'infrastructure' | 'application'>('infrastructure');
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [isTemplate, setIsTemplate] = useState(false);

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = () => {
    const configs = getSavedConfigurations();
    setConfigurations(configs);
  };

  const handleSaveCurrentConfig = () => {
    if (!saveName.trim()) {
      alert('Please enter a configuration name');
      return;
    }

    const configData = saveType === 'infrastructure' ? currentInfraConfig : currentAppConfig;
    if (!configData) {
      alert('No configuration data available to save');
      return;
    }

    try {
      saveConfiguration({
        name: saveName,
        description: saveDescription,
        type: saveType,
        configuration: configData,
        is_template: isTemplate,
      });

      loadConfigurations();
      setShowSaveModal(false);
      setSaveName('');
      setSaveDescription('');
      setIsTemplate(false);
      alert('✅ Configuration saved successfully!');
    } catch (error) {
      alert('❌ Failed to save configuration');
    }
  };

  const handleLoadConfig = (config: SavedConfig) => {
    if (onLoadConfiguration) {
      onLoadConfiguration(config.configuration, config.type);
      alert(`✅ ${config.name} configuration loaded!`);
    }
  };

  const handleDeleteConfig = (configId: string, configName: string) => {
    if (confirm(`Are you sure you want to delete "${configName}"?`)) {
      deleteConfiguration(configId);
      loadConfigurations();
    }
  };

  const handleExportConfig = (config: SavedConfig) => {
    const exportData = {
      ...config,
      exported_at: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredConfigurations = configurations.filter(config => {
    const matchesType = filter === 'all' || config.type === filter;
    const matchesSearch = searchTerm === '' || 
      config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (config.description && config.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesType && matchesSearch;
  });

  const getTypeColor = (type: string) => {
    return type === 'infrastructure' 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-purple-100 text-purple-800';
  };

  const getTypeIcon = (type: string) => {
    return type === 'infrastructure' ? '🏗️' : '🚀';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Saved Configurations</h2>
          <p className="text-gray-600">Save and reuse your infrastructure and application configurations</p>
        </div>
        
        <button
          onClick={() => setShowSaveModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Save Current Config</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search configurations..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="application">Application</option>
            </select>
          </div>
        </div>
      </div>

      {/* Configuration List */}
      {filteredConfigurations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Configurations Found</h3>
          <p className="text-gray-600">
            {configurations.length === 0 
              ? "You haven't saved any configurations yet. Save your current configuration to reuse it later."
              : "No configurations match your current filters. Try adjusting your search criteria."
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConfigurations.map((config) => (
            <div key={config.id} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getTypeIcon(config.type)}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{config.name}</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(config.type)}`}>
                      {config.type}
                    </span>
                  </div>
                </div>
                
                {config.is_template && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                    Template
                  </span>
                )}
              </div>

              {config.description && (
                <p className="text-sm text-gray-600 mb-4">{config.description}</p>
              )}

              {/* Configuration Preview */}
              <div className="bg-gray-50 p-3 rounded-md mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Preview</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  {config.type === 'infrastructure' ? (
                    <>
                      <p><strong>Project:</strong> {config.configuration?.projectId || 'N/A'}</p>
                      <p><strong>Cluster:</strong> {config.configuration?.clusterName || 'N/A'}</p>
                      <p><strong>Region:</strong> {config.configuration?.region || 'N/A'}</p>
                      <p><strong>Machine:</strong> {config.configuration?.machineType || 'N/A'}</p>
                    </>
                  ) : (
                    <>
                      <p><strong>Namespace:</strong> {config.configuration?.namespace || 'N/A'}</p>
                      <p><strong>Manifests:</strong> {config.configuration?.manifests?.filter((m: any) => m.enabled).length || 0}</p>
                      <p><strong>Cluster:</strong> {config.configuration?.clusterName || 'N/A'}</p>
                      <p><strong>Zone:</strong> {config.configuration?.zone || 'N/A'}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center space-x-2 text-xs text-gray-500 mb-4">
                <Calendar className="h-3 w-3" />
                <span>Created {new Date(config.created_at).toLocaleDateString()}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleLoadConfig(config)}
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  <Upload className="h-3 w-3" />
                  <span>Load</span>
                </button>
                
                <button
                  onClick={() => handleExportConfig(config)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Export configuration"
                >
                  <Download className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => handleDeleteConfig(config.id, config.name)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete configuration"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save Configuration Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Save Configuration</h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="sr-only">Close</span>
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Configuration Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Configuration Type
                </label>
                <select
                  value={saveType}
                  onChange={(e) => setSaveType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="infrastructure">Infrastructure</option>
                  <option value="application">Application</option>
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Configuration Name *
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="My GKE Configuration"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>

              {/* Template Option */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isTemplate"
                  checked={isTemplate}
                  onChange={(e) => setIsTemplate(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isTemplate" className="text-sm text-gray-700">
                  Save as template (reusable configuration)
                </label>
              </div>
            </div>

            <div className="flex space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCurrentConfig}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Storage Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-900 mb-2">💾 Local Storage</h4>
        <div className="text-sm text-green-800">
          <p>• All configurations are stored locally in your browser</p>
          <p>• Export individual configurations to share or backup</p>
          <p>• Load saved configurations to quickly restore settings</p>
          <p>• Total configurations: <strong>{configurations.length}</strong></p>
        </div>
      </div>
    </div>
  );
};

export default SavedConfigurations;