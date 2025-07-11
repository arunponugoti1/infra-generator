import React, { useEffect } from 'react';
import { ArrowRight, Info, Save, Pocket as Docker, GitBranch, Package, Shield, Play } from 'lucide-react';

interface DockerConfig {
  enabled: boolean;
  dockerfile: string;
  context: string;
  buildArgs: Record<string, string>;
  target?: string;
  platforms: string[];
}

interface RegistryConfig {
  type: 'gcr' | 'dockerhub' | 'ghcr' | 'ecr';
  registry: string;
  repository: string;
  username?: string;
  enabled: boolean;
}

interface CIConfig {
  projectName: string;
  gitRepo: string;
  branch: string;
  buildTriggers: {
    onPush: boolean;
    onPR: boolean;
    onTag: boolean;
    manual: boolean;
  };
  docker: {
    frontend: DockerConfig;
    backend: DockerConfig;
  };
  registries: RegistryConfig[];
  scanning: {
    enabled: boolean;
    failOnHigh: boolean;
    failOnCritical: boolean;
  };
  notifications: {
    slack?: string;
    email?: string;
    discord?: string;
  };
}

interface CIPipelineFormProps {
  config: CIConfig;
  onChange: (config: CIConfig) => void;
  onNext: () => void;
}

const CIPipelineForm: React.FC<CIPipelineFormProps> = ({ config, onChange, onNext }) => {
  const handleChange = (field: keyof CIConfig, value: any) => {
    const newConfig = { ...config, [field]: value };
    onChange(newConfig);
  };

  const handleDockerChange = (service: 'frontend' | 'backend', field: keyof DockerConfig, value: any) => {
    const newConfig = { ...config };
    newConfig.docker[service] = { ...newConfig.docker[service], [field]: value };
    onChange(newConfig);
  };

  const handleRegistryChange = (index: number, field: keyof RegistryConfig, value: any) => {
    const newConfig = { ...config };
    newConfig.registries[index] = { ...newConfig.registries[index], [field]: value };
    onChange(newConfig);
  };

  const addRegistry = () => {
    const newRegistry: RegistryConfig = {
      type: 'gcr',
      registry: 'gcr.io',
      repository: '',
      enabled: true
    };
    handleChange('registries', [...config.registries, newRegistry]);
  };

  const removeRegistry = (index: number) => {
    const newRegistries = config.registries.filter((_, i) => i !== index);
    handleChange('registries', newRegistries);
  };

  // Auto-save indication
  const [showSaved, setShowSaved] = React.useState(false);

  useEffect(() => {
    setShowSaved(true);
    const timer = setTimeout(() => setShowSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [config]);

  const registryTypes = [
    { value: 'gcr', label: 'Google Container Registry', registry: 'gcr.io' },
    { value: 'dockerhub', label: 'Docker Hub', registry: 'docker.io' },
    { value: 'ghcr', label: 'GitHub Container Registry', registry: 'ghcr.io' },
    { value: 'ecr', label: 'Amazon ECR', registry: 'amazonaws.com' }
  ];

  const platforms = [
    'linux/amd64',
    'linux/arm64',
    'linux/arm/v7'
  ];

  const isValid = config.projectName && config.gitRepo && config.branch;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">CI Pipeline Configuration</h2>
          <p className="text-gray-600">Configure Docker builds and container registry integration</p>
        </div>
        
        {/* Auto-save indicator */}
        {showSaved && (
          <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-1 rounded-md">
            <Save className="h-4 w-4" />
            <span className="text-sm font-medium">Auto-saved</span>
          </div>
        )}
      </div>

      {/* Project Configuration */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center space-x-2 mb-4">
          <GitBranch className="h-5 w-5" />
          <span>Project Settings</span>
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                value={config.projectName}
                onChange={(e) => handleChange('projectName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="my-awesome-app"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Git Repository *
              </label>
              <input
                type="text"
                value={config.gitRepo}
                onChange={(e) => handleChange('gitRepo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="owner/repository"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Branch *
              </label>
              <input
                type="text"
                value={config.branch}
                onChange={(e) => handleChange('branch', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="main"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-800">Build Triggers</h4>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.buildTriggers.onPush}
                  onChange={(e) => handleChange('buildTriggers', { ...config.buildTriggers, onPush: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Build on push to main branch</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.buildTriggers.onPR}
                  onChange={(e) => handleChange('buildTriggers', { ...config.buildTriggers, onPR: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Build on pull requests</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.buildTriggers.onTag}
                  onChange={(e) => handleChange('buildTriggers', { ...config.buildTriggers, onTag: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Build on git tags</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.buildTriggers.manual}
                  onChange={(e) => handleChange('buildTriggers', { ...config.buildTriggers, manual: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Allow manual triggers</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Docker Configuration */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center space-x-2 mb-4">
          <Docker className="h-5 w-5" />
          <span>Docker Build Configuration</span>
        </h3>

        {/* Frontend Docker Config */}
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-blue-50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-blue-900 flex items-center space-x-2">
              <span>🌐</span>
              <span>Frontend Application</span>
            </h4>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.docker.frontend.enabled}
                onChange={(e) => handleDockerChange('frontend', 'enabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-blue-700">Enable Docker build</span>
            </label>
          </div>

          {config.docker.frontend.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Dockerfile Path</label>
                <input
                  type="text"
                  value={config.docker.frontend.dockerfile}
                  onChange={(e) => handleDockerChange('frontend', 'dockerfile', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="frontend/Dockerfile"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Build Context</label>
                <input
                  type="text"
                  value={config.docker.frontend.context}
                  onChange={(e) => handleDockerChange('frontend', 'context', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="./frontend"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Build Target (optional)</label>
                <input
                  type="text"
                  value={config.docker.frontend.target || ''}
                  onChange={(e) => handleDockerChange('frontend', 'target', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="production"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Platforms</label>
                <select
                  multiple
                  value={config.docker.frontend.platforms}
                  onChange={(e) => handleDockerChange('frontend', 'platforms', Array.from(e.target.selectedOptions, option => option.value))}
                  className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {platforms.map(platform => (
                    <option key={platform} value={platform}>{platform}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Backend Docker Config */}
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-green-50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-green-900 flex items-center space-x-2">
              <span>⚙️</span>
              <span>Backend Application</span>
            </h4>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.docker.backend.enabled}
                onChange={(e) => handleDockerChange('backend', 'enabled', e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <span className="text-sm text-green-700">Enable Docker build</span>
            </label>
          </div>

          {config.docker.backend.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-green-700 mb-1">Dockerfile Path</label>
                <input
                  type="text"
                  value={config.docker.backend.dockerfile}
                  onChange={(e) => handleDockerChange('backend', 'dockerfile', e.target.value)}
                  className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="backend/Dockerfile"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-green-700 mb-1">Build Context</label>
                <input
                  type="text"
                  value={config.docker.backend.context}
                  onChange={(e) => handleDockerChange('backend', 'context', e.target.value)}
                  className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="./backend"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-green-700 mb-1">Build Target (optional)</label>
                <input
                  type="text"
                  value={config.docker.backend.target || ''}
                  onChange={(e) => handleDockerChange('backend', 'target', e.target.value)}
                  className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="production"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-green-700 mb-1">Platforms</label>
                <select
                  multiple
                  value={config.docker.backend.platforms}
                  onChange={(e) => handleDockerChange('backend', 'platforms', Array.from(e.target.selectedOptions, option => option.value))}
                  className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {platforms.map(platform => (
                    <option key={platform} value={platform}>{platform}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Container Registries */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center space-x-2 mb-4">
          <Package className="h-5 w-5" />
          <span>Container Registries</span>
        </h3>

        <div className="space-y-4">
          {config.registries.map((registry, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Registry {index + 1}</h4>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={registry.enabled}
                      onChange={(e) => handleRegistryChange(index, 'enabled', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Enabled</span>
                  </label>
                  <button
                    onClick={() => removeRegistry(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registry Type</label>
                  <select
                    value={registry.type}
                    onChange={(e) => {
                      const selectedType = registryTypes.find(t => t.value === e.target.value);
                      handleRegistryChange(index, 'type', e.target.value);
                      if (selectedType) {
                        handleRegistryChange(index, 'registry', selectedType.registry);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {registryTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registry URL</label>
                  <input
                    type="text"
                    value={registry.registry}
                    onChange={(e) => handleRegistryChange(index, 'registry', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="gcr.io"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Repository</label>
                  <input
                    type="text"
                    value={registry.repository}
                    onChange={(e) => handleRegistryChange(index, 'repository', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="project-id/app-name"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addRegistry}
            className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            + Add Container Registry
          </button>
        </div>
      </div>

      {/* Security Scanning */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center space-x-2 mb-4">
          <Shield className="h-5 w-5" />
          <span>Security Scanning</span>
        </h3>

        <div className="p-4 border border-gray-200 rounded-lg bg-yellow-50">
          <div className="space-y-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.scanning.enabled}
                onChange={(e) => handleChange('scanning', { ...config.scanning, enabled: e.target.checked })}
                className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
              />
              <span className="text-sm text-yellow-800 font-medium">Enable vulnerability scanning</span>
            </label>

            {config.scanning.enabled && (
              <div className="ml-6 space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.scanning.failOnHigh}
                    onChange={(e) => handleChange('scanning', { ...config.scanning, failOnHigh: e.target.checked })}
                    className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-yellow-700">Fail build on high severity vulnerabilities</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.scanning.failOnCritical}
                    onChange={(e) => handleChange('scanning', { ...config.scanning, failOnCritical: e.target.checked })}
                    className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-yellow-700">Fail build on critical vulnerabilities</span>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CI Pipeline Features */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">🚀 CI Pipeline Features</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p>✅ <strong>Multi-stage Docker builds</strong> - Optimized for production</p>
          <p>✅ <strong>Multi-platform builds</strong> - Support for AMD64, ARM64</p>
          <p>✅ <strong>Container registry integration</strong> - GCR, Docker Hub, GHCR, ECR</p>
          <p>✅ <strong>Security vulnerability scanning</strong> - Trivy integration</p>
          <p>✅ <strong>Build caching</strong> - Faster subsequent builds</p>
          <p>✅ <strong>Automated tagging</strong> - Git-based versioning</p>
          <p>✅ <strong>Build notifications</strong> - Slack, email, Discord</p>
          <p>✅ <strong>Parallel builds</strong> - Frontend and backend simultaneously</p>
        </div>
      </div>

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
          <span>Generate CI Pipeline</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default CIPipelineForm;