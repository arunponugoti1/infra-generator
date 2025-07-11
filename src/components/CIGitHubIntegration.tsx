import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Github, Upload, CheckCircle, AlertCircle, Info, Pocket as Docker, Package } from 'lucide-react';
import { GitHubService } from '../utils/githubApi';
import { generateCIFiles } from '../utils/ciGenerator';

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

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

interface CIGitHubIntegrationProps {
  config: GitHubConfig;
  ciConfig: CIConfig;
  onChange: (config: GitHubConfig) => void;
  onBack: () => void;
  onNext: () => void;
}

const CIGitHubIntegration: React.FC<CIGitHubIntegrationProps> = ({
  config,
  ciConfig,
  onChange,
  onBack,
  onNext
}) => {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');

  const handleChange = (field: keyof GitHubConfig, value: string) => {
    onChange({ ...config, [field]: value });
    // Reset validation when config changes
    if (validationStatus !== 'idle') {
      setValidationStatus('idle');
    }
  };

  const validateRepository = async () => {
    if (!config.token || !config.owner || !config.repo) {
      setErrorMessage('Please fill in all GitHub configuration fields');
      setValidationStatus('invalid');
      return false;
    }

    setValidationStatus('validating');
    setErrorMessage('');

    try {
      const githubService = new GitHubService(config.token);
      
      // Check if repository exists and we have write access
      const hasAccess = await githubService.checkRepository(config.owner, config.repo);
      if (!hasAccess) {
        throw new Error('Repository not found or insufficient permissions. Please ensure:\n1. Repository exists and is accessible\n2. Personal Access Token has "repo" scope\n3. You have write access to the repository');
      }

      setValidationStatus('valid');
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMessage(`Repository validation failed: ${errorMsg}`);
      setValidationStatus('invalid');
      return false;
    }
  };

  const uploadToGitHub = async () => {
    // First validate the repository
    const isValid = await validateRepository();
    if (!isValid) {
      setUploadStatus('error');
      return;
    }

    setUploadStatus('uploading');
    setErrorMessage('');

    try {
      const githubService = new GitHubService(config.token);
      
      // Generate CI/CD files
      const files = generateCIFiles(ciConfig);
      
      // Upload files to GitHub
      await githubService.createOrUpdateFiles(
        config.owner,
        config.repo,
        files,
        'Add CI/CD pipeline with Docker builds and container registry integration via IaC Generator'
      );
      
      setUploadStatus('success');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMessage(errorMsg);
      setUploadStatus('error');
      console.error('GitHub upload error:', error);
    }
  };

  const isFormValid = config.token && config.owner && config.repo;
  const enabledRegistries = ciConfig.registries.filter(r => r.enabled);
  const enabledServices = [
    ciConfig.docker.frontend.enabled && 'Frontend',
    ciConfig.docker.backend.enabled && 'Backend'
  ].filter(Boolean);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">GitHub Integration</h2>
        <p className="text-gray-600">Configure GitHub repository and upload CI/CD pipeline files</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* GitHub Configuration */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Repository Settings</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GitHub Personal Access Token *
              </label>
              <input
                type="password"
                value={config.token}
                onChange={(e) => handleChange('token', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              />
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-700">
                    <p className="font-medium mb-1">Required Token Permissions:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li><strong>repo</strong> - Full control of private repositories</li>
                      <li><strong>workflow</strong> - Update GitHub Action workflows</li>
                      <li><strong>actions</strong> - Access to GitHub Actions</li>
                      <li><strong>packages</strong> - Upload to GitHub Container Registry</li>
                    </ul>
                    <p className="mt-2">
                      <a 
                        href="https://github.com/settings/tokens" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Create or manage tokens here →
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repository Owner *
              </label>
              <input
                type="text"
                value={config.owner}
                onChange={(e) => handleChange('owner', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your-username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repository Name *
              </label>
              <input
                type="text"
                value={config.repo}
                onChange={(e) => handleChange('repo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="my-app-repository"
              />
            </div>
          </div>

          {/* Validation Button */}
          <div className="pt-2">
            <button
              onClick={validateRepository}
              disabled={!isFormValid || validationStatus === 'validating'}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors mb-3 ${
                isFormValid && validationStatus !== 'validating'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {validationStatus === 'validating' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Validating Repository...</span>
                </>
              ) : (
                <>
                  <Github className="h-4 w-4" />
                  <span>Validate Repository Access</span>
                </>
              )}
            </button>

            {/* Validation Status */}
            {validationStatus === 'valid' && (
              <div className="mb-3 flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Repository access validated successfully!</span>
              </div>
            )}
          </div>

          {/* Upload Button */}
          <div>
            <button
              onClick={uploadToGitHub}
              disabled={validationStatus !== 'valid' || uploadStatus === 'uploading'}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-md font-medium transition-colors ${
                validationStatus === 'valid' && uploadStatus !== 'uploading'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {uploadStatus === 'uploading' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Uploading CI/CD Pipeline...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Upload CI/CD Pipeline</span>
                </>
              )}
            </button>

            {/* Status Messages */}
            {uploadStatus === 'success' && (
              <div className="mt-3 flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">CI/CD pipeline uploaded successfully to GitHub!</span>
              </div>
            )}

            {(uploadStatus === 'error' || validationStatus === 'invalid') && errorMessage && (
              <div className="mt-3 flex items-start space-x-2 text-red-600">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="text-sm whitespace-pre-line">{errorMessage}</div>
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Preview */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">CI/CD Pipeline Overview</h3>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">Files to be created:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>📁 .github/workflows/ci-cd.yml</li>
              <li>📁 docker-compose.yml</li>
              {ciConfig.docker.frontend.enabled && (
                <>
                  <li>📁 frontend/Dockerfile</li>
                  <li>📁 frontend/nginx.conf</li>
                </>
              )}
              {ciConfig.docker.backend.enabled && (
                <li>📁 backend/Dockerfile</li>
              )}
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">🚀 Pipeline Configuration:</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Project:</strong> {ciConfig.projectName}</p>
              <p><strong>Services:</strong> {enabledServices.join(', ')}</p>
              <p><strong>Registries:</strong> {enabledRegistries.length} configured</p>
              <p><strong>Security Scanning:</strong> {ciConfig.scanning.enabled ? 'Enabled' : 'Disabled'}</p>
              <p><strong>Build Triggers:</strong> {[
                ciConfig.buildTriggers.onPush && 'Push',
                ciConfig.buildTriggers.onPR && 'PR',
                ciConfig.buildTriggers.onTag && 'Tags',
                ciConfig.buildTriggers.manual && 'Manual'
              ].filter(Boolean).join(', ')}</p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">🔨 Build Features:</h4>
            <div className="text-sm text-green-700 space-y-1">
              <p>✅ Multi-stage Docker builds</p>
              <p>✅ Multi-platform support (AMD64, ARM64)</p>
              <p>✅ Build caching for faster builds</p>
              <p>✅ Parallel service builds</p>
              <p>✅ Automated image tagging</p>
              <p>✅ Production optimizations</p>
              {ciConfig.scanning.enabled && <p>✅ Security vulnerability scanning</p>}
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
            <h4 className="font-medium text-purple-800 mb-2">📦 Container Registries:</h4>
            <div className="space-y-2">
              {enabledRegistries.map((registry, index) => (
                <div key={index} className="text-sm text-purple-700">
                  <p><strong>{registry.type.toUpperCase()}:</strong> {registry.registry}/{registry.repository}</p>
                </div>
              ))}
              {enabledRegistries.length === 0 && (
                <p className="text-sm text-purple-700">No registries configured</p>
              )}
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <h4 className="font-medium text-red-800 mb-2">🔐 Required GitHub Secrets:</h4>
            <div className="text-sm text-red-700 space-y-1">
              <p><code className="bg-red-100 px-1 rounded">GCP_SA_KEY</code> - Service Account JSON</p>
              <p><code className="bg-red-100 px-1 rounded">GCP_PROJECT_ID</code> - GCP Project ID</p>
              <p><code className="bg-red-100 px-1 rounded">GKE_CLUSTER_NAME</code> - Cluster name</p>
              <p><code className="bg-red-100 px-1 rounded">GKE_REGION</code> - Cluster region</p>
              <p><code className="bg-red-100 px-1 rounded">K8S_NAMESPACE</code> - K8s namespace</p>
              {enabledRegistries.some(r => r.type !== 'gcr') && (
                <>
                  <p><code className="bg-red-100 px-1 rounded">REGISTRY_USERNAME</code> - Registry username</p>
                  <p><code className="bg-red-100 px-1 rounded">REGISTRY_PASSWORD</code> - Registry password</p>
                </>
              )}
            </div>
          </div>

          {uploadStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">🎉 Ready for CI/CD!</h4>
              <p className="text-sm text-green-700">
                Your complete CI/CD pipeline has been uploaded successfully. The pipeline includes Docker builds, 
                container registry integration, security scanning, and Kubernetes deployment capabilities.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Pipeline</span>
        </button>
        
        <button
          onClick={onNext}
          disabled={uploadStatus !== 'success'}
          className={`flex items-center space-x-2 px-6 py-2 rounded-md font-medium transition-colors ${
            uploadStatus === 'success'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>Manage CI/CD Pipeline</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default CIGitHubIntegration;