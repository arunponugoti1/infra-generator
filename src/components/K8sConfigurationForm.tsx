import React, { useEffect } from 'react';
import { ArrowRight, Info, Save, Layers, Plus, Minus, CheckCircle } from 'lucide-react';

interface ManifestConfig {
  type: 'frontend' | 'backend' | 'secrets' | 'ingress' | 'db-init-job';
  enabled: boolean;
  config: Record<string, any>;
}

interface K8sConfig {
  projectId: string;
  clusterName: string;
  region: string;
  zone: string;
  namespace: string;
  manifests: ManifestConfig[];
}

interface K8sConfigurationFormProps {
  config: K8sConfig;
  onChange: (config: K8sConfig) => void;
  onNext: () => void;
}

const K8sConfigurationForm: React.FC<K8sConfigurationFormProps> = ({ config, onChange, onNext }) => {
  const handleChange = (field: keyof K8sConfig, value: any) => {
    const newConfig = { ...config, [field]: value };
    onChange(newConfig);
  };

  const handleManifestToggle = (type: ManifestConfig['type']) => {
    const newManifests = [...config.manifests];
    const existingIndex = newManifests.findIndex(m => m.type === type);
    
    if (existingIndex >= 0) {
      newManifests[existingIndex].enabled = !newManifests[existingIndex].enabled;
    } else {
      newManifests.push({
        type,
        enabled: true,
        config: getDefaultConfigForType(type)
      });
    }
    
    handleChange('manifests', newManifests);
  };

  const handleManifestConfigChange = (type: ManifestConfig['type'], field: string, value: any) => {
    const newManifests = [...config.manifests];
    const manifestIndex = newManifests.findIndex(m => m.type === type);
    
    if (manifestIndex >= 0) {
      newManifests[manifestIndex].config[field] = value;
      handleChange('manifests', newManifests);
    }
  };

  const getDefaultConfigForType = (type: ManifestConfig['type']): Record<string, any> => {
    switch (type) {
      case 'frontend':
        return {
          image: 'nginx:latest',
          port: 80,
          replicas: 2,
          serviceType: 'LoadBalancer'
        };
      case 'backend':
        return {
          image: 'node:18-alpine',
          port: 8080,
          replicas: 2,
          serviceType: 'ClusterIP'
        };
      case 'secrets':
        return {
          name: 'app-secrets',
          data: {
            'DATABASE_URL': 'postgresql://user:pass@localhost:5432/db',
            'API_KEY': 'your-api-key-here'
          }
        };
      case 'ingress':
        return {
          domain: 'example.com',
          enableSSL: true,
          paths: [
            { path: '/api/*', service: 'backend', port: 8080 },
            { path: '/*', service: 'frontend', port: 80 }
          ]
        };
      case 'db-init-job':
        return {
          image: 'postgres:15',
          command: ['psql', '-c', 'CREATE DATABASE IF NOT EXISTS myapp;'],
          restartPolicy: 'OnFailure'
        };
      default:
        return {};
    }
  };

  const getManifest = (type: ManifestConfig['type']) => {
    return config.manifests.find(m => m.type === type);
  };

  const isManifestEnabled = (type: ManifestConfig['type']) => {
    const manifest = getManifest(type);
    return manifest?.enabled || false;
  };

  // Auto-save indication
  const [showSaved, setShowSaved] = React.useState(false);

  useEffect(() => {
    setShowSaved(true);
    const timer = setTimeout(() => setShowSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [config]);

  const regions = [
    'us-central1', 'us-east1', 'us-west1', 'us-west2',
    'europe-west1', 'europe-west2', 'asia-east1', 'asia-southeast1'
  ];

  const getZonesForRegion = (region: string) => {
    return [`${region}-a`, `${region}-b`, `${region}-c`];
  };

  const isValid = config.projectId && config.clusterName && config.region && config.zone && 
                 config.namespace && config.manifests.some(m => m.enabled);

  const manifestTypes = [
    {
      type: 'frontend' as const,
      title: 'Frontend Application',
      description: 'Web application frontend (React, Angular, Vue, etc.)',
      icon: '🌐',
      color: 'blue'
    },
    {
      type: 'backend' as const,
      title: 'Backend API',
      description: 'REST API or backend service (Node.js, Python, Java, etc.)',
      icon: '⚙️',
      color: 'green'
    },
    {
      type: 'secrets' as const,
      title: 'Secrets & ConfigMaps',
      description: 'Environment variables, API keys, database credentials',
      icon: '🔐',
      color: 'yellow'
    },
    {
      type: 'ingress' as const,
      title: 'Ingress Controller',
      description: 'HTTP/HTTPS routing with SSL certificates',
      icon: '🌍',
      color: 'purple'
    },
    {
      type: 'db-init-job' as const,
      title: 'Database Init Job',
      description: 'One-time database initialization or migration job',
      icon: '🗄️',
      color: 'indigo'
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Kubernetes Application Configuration</h2>
          <p className="text-gray-600">Select manifests to deploy and configure your application components</p>
        </div>
        
        {/* Auto-save indicator */}
        {showSaved && (
          <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-1 rounded-md">
            <Save className="h-4 w-4" />
            <span className="text-sm font-medium">Auto-saved</span>
          </div>
        )}
      </div>

      {/* Cluster Configuration */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center space-x-2 mb-4">
          <Layers className="h-5 w-5" />
          <span>Cluster Settings</span>
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GCP Project ID *
              </label>
              <input
                type="text"
                value={config.projectId}
                onChange={(e) => handleChange('projectId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="my-gcp-project"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GKE Cluster Name *
              </label>
              <input
                type="text"
                value={config.clusterName}
                onChange={(e) => handleChange('clusterName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="my-gke-cluster"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kubernetes Namespace *
              </label>
              <input
                type="text"
                value={config.namespace}
                onChange={(e) => handleChange('namespace', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="default"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Region *
              </label>
              <select
                value={config.region}
                onChange={(e) => {
                  handleChange('region', e.target.value);
                  // Reset zone when region changes
                  handleChange('zone', `${e.target.value}-a`);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zone *
              </label>
              <select
                value={config.zone}
                onChange={(e) => handleChange('zone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {getZonesForRegion(config.region).map(zone => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Manifest Selection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">
          Select Manifests to Deploy
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {manifestTypes.map((manifestType) => {
            const isEnabled = isManifestEnabled(manifestType.type);
            const colorClasses = {
              blue: isEnabled ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300',
              green: isEnabled ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300',
              yellow: isEnabled ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-300',
              purple: isEnabled ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300',
              indigo: isEnabled ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'
            };

            return (
              <div
                key={manifestType.type}
                onClick={() => handleManifestToggle(manifestType.type)}
                className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${colorClasses[manifestType.color]}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">{manifestType.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{manifestType.title}</h4>
                    <p className="text-sm text-gray-600">{manifestType.description}</p>
                  </div>
                  {isEnabled && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Manifest Configurations */}
      {config.manifests.filter(m => m.enabled).map((manifest) => (
        <div key={manifest.type} className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
            <span>{manifestTypes.find(t => t.type === manifest.type)?.icon}</span>
            <span>{manifestTypes.find(t => t.type === manifest.type)?.title} Configuration</span>
          </h4>

          {/* Frontend Configuration */}
          {manifest.type === 'frontend' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Docker Image</label>
                <input
                  type="text"
                  value={manifest.config.image || ''}
                  onChange={(e) => handleManifestConfigChange('frontend', 'image', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="nginx:latest"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                <input
                  type="number"
                  value={manifest.config.port || 80}
                  onChange={(e) => handleManifestConfigChange('frontend', 'port', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Replicas</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={manifest.config.replicas || 2}
                  onChange={(e) => handleManifestConfigChange('frontend', 'replicas', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                <select
                  value={manifest.config.serviceType || 'LoadBalancer'}
                  onChange={(e) => handleManifestConfigChange('frontend', 'serviceType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LoadBalancer">LoadBalancer</option>
                  <option value="ClusterIP">ClusterIP</option>
                  <option value="NodePort">NodePort</option>
                </select>
              </div>
            </div>
          )}

          {/* Backend Configuration */}
          {manifest.type === 'backend' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Docker Image</label>
                <input
                  type="text"
                  value={manifest.config.image || ''}
                  onChange={(e) => handleManifestConfigChange('backend', 'image', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="node:18-alpine"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                <input
                  type="number"
                  value={manifest.config.port || 8080}
                  onChange={(e) => handleManifestConfigChange('backend', 'port', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Replicas</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={manifest.config.replicas || 2}
                  onChange={(e) => handleManifestConfigChange('backend', 'replicas', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                <select
                  value={manifest.config.serviceType || 'ClusterIP'}
                  onChange={(e) => handleManifestConfigChange('backend', 'serviceType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="ClusterIP">ClusterIP</option>
                  <option value="LoadBalancer">LoadBalancer</option>
                  <option value="NodePort">NodePort</option>
                </select>
              </div>
            </div>
          )}

          {/* Secrets Configuration */}
          {manifest.type === 'secrets' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secret Name</label>
                <input
                  type="text"
                  value={manifest.config.name || ''}
                  onChange={(e) => handleManifestConfigChange('secrets', 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="app-secrets"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Environment Variables</label>
                <div className="space-y-2">
                  {Object.entries(manifest.config.data || {}).map(([key, value], index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="text"
                        value={key}
                        onChange={(e) => {
                          const newData = { ...manifest.config.data };
                          delete newData[key];
                          newData[e.target.value] = value;
                          handleManifestConfigChange('secrets', 'data', newData);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        placeholder="KEY"
                      />
                      <input
                        type="text"
                        value={value as string}
                        onChange={(e) => {
                          const newData = { ...manifest.config.data };
                          newData[key] = e.target.value;
                          handleManifestConfigChange('secrets', 'data', newData);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        placeholder="value"
                      />
                      <button
                        onClick={() => {
                          const newData = { ...manifest.config.data };
                          delete newData[key];
                          handleManifestConfigChange('secrets', 'data', newData);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newData = { ...manifest.config.data, [`NEW_KEY_${Date.now()}`]: 'new-value' };
                      handleManifestConfigChange('secrets', 'data', newData);
                    }}
                    className="flex items-center space-x-2 px-3 py-2 text-yellow-600 hover:bg-yellow-50 rounded-md"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Environment Variable</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Ingress Configuration */}
          {manifest.type === 'ingress' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                <input
                  type="text"
                  value={manifest.config.domain || ''}
                  onChange={(e) => handleManifestConfigChange('ingress', 'domain', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="example.com"
                />
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="enableSSL"
                  checked={manifest.config.enableSSL || false}
                  onChange={(e) => handleManifestConfigChange('ingress', 'enableSSL', e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="enableSSL" className="text-sm font-medium text-gray-700">
                  Enable SSL/TLS
                </label>
              </div>
            </div>
          )}

          {/* DB Init Job Configuration */}
          {manifest.type === 'db-init-job' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Docker Image</label>
                <input
                  type="text"
                  value={manifest.config.image || ''}
                  onChange={(e) => handleManifestConfigChange('db-init-job', 'image', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="postgres:15"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Restart Policy</label>
                <select
                  value={manifest.config.restartPolicy || 'OnFailure'}
                  onChange={(e) => handleManifestConfigChange('db-init-job', 'restartPolicy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="OnFailure">OnFailure</option>
                  <option value="Never">Never</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Command</label>
                <input
                  type="text"
                  value={manifest.config.command || ''}
                  onChange={(e) => handleManifestConfigChange('db-init-job', 'command', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="psql -c 'CREATE DATABASE IF NOT EXISTS myapp;'"
                />
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Configuration Summary */}
      <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <Info className="h-5 w-5 text-purple-600 mt-0.5" />
          <div className="text-sm text-purple-800">
            <p className="font-medium mb-1">🚀 Modular Deployment Configuration:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Selected {config.manifests.filter(m => m.enabled).length} manifest(s) for deployment</li>
              <li>Each manifest is independently configurable</li>
              <li>Automatic health checks and resource management</li>
              <li>Production-ready with best practices</li>
              <li>Zero-downtime rolling updates</li>
            </ul>
          </div>
        </div>
      </div>

      
      {/* Next Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`flex items-center space-x-2 px-6 py-2 rounded-md font-medium transition-colors ${
            isValid
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>Generate Kubernetes Manifests</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default K8sConfigurationForm;
