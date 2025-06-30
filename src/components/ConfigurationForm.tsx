import React, { useEffect } from 'react';
import { ArrowRight, Info, Save } from 'lucide-react';

interface TerraformConfig {
  projectId: string;
  clusterName: string;
  region: string;
  nodeCount: number;
  machineType: string;
  diskSize: number;
  enableAutoscaling: boolean;
  minNodes: number;
  maxNodes: number;
}

interface ConfigurationFormProps {
  config: TerraformConfig;
  onChange: (config: TerraformConfig) => void;
  onNext: () => void;
}

const ConfigurationForm: React.FC<ConfigurationFormProps> = ({ config, onChange, onNext }) => {
  const handleChange = (field: keyof TerraformConfig, value: any) => {
    const newConfig = { ...config, [field]: value };
    onChange(newConfig);
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

  const machineTypes = [
    'e2-micro', 'e2-small', 'e2-medium', 'e2-standard-2', 'e2-standard-4',
    'n1-standard-1', 'n1-standard-2', 'n1-standard-4', 'n2-standard-2'
  ];

  const isValid = config.projectId && config.clusterName && config.region;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">GKE Cluster Configuration</h2>
          <p className="text-gray-600">Configure your Google Kubernetes Engine cluster parameters</p>
        </div>
        
        {/* Auto-save indicator */}
        {showSaved && (
          <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-1 rounded-md">
            <Save className="h-4 w-4" />
            <span className="text-sm font-medium">Auto-saved</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Basic Settings</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GCP Project ID *
            </label>
            <input
              type="text"
              value={config.projectId}
              onChange={(e) => handleChange('projectId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="my-gcp-project"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cluster Name *
            </label>
            <input
              type="text"
              value={config.clusterName}
              onChange={(e) => handleChange('clusterName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="my-gke-cluster"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Region *
            </label>
            <select
              value={config.region}
              onChange={(e) => handleChange('region', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {regions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Node Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Node Pool Settings</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Machine Type
            </label>
            <select
              value={config.machineType}
              onChange={(e) => handleChange('machineType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {machineTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Node Count (Fixed to 2 for optimal performance)
            </label>
            <input
              type="number"
              value={2}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Simplified configuration uses exactly 2 nodes</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Disk Size (GB)
            </label>
            <input
              type="number"
              min="10"
              max="1000"
              value={config.diskSize}
              onChange={(e) => handleChange('diskSize', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Simplified Configuration Notice */}
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <Info className="h-5 w-5 text-green-600 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-medium mb-1">⚡ Simplified Configuration for Fast Creation:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Fixed 2-node cluster (no autoscaling complexity)</li>
              <li>Removed network policy, IP allocation, and workload identity</li>
              <li>Removed auto-repair/upgrade for faster initial creation</li>
              <li>Uses pd-standard disks to avoid SSD quota issues</li>
              <li>Service account configured for both cluster and nodes</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Data Persistence Notice */}
      {/*<div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <Save className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">💾 Data Persistence Active:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>All configurations are automatically saved to your browser</li>
              <li>Data persists across page refreshes and browser sessions</li>
              <li>Use Export/Import in the header to backup or share configurations</li>
              <li>Reset All button clears all saved data</li>
            </ul>
          </div>
        </div>
      </div>*/}

      {/* Next Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`flex items-center space-x-2 px-6 py-2 rounded-md font-medium transition-colors ${
            isValid
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>Generate Terraform Code</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ConfigurationForm;
