import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Github, Upload, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { GitHubService } from '../utils/githubApi';
import { generateK8sFiles } from '../utils/k8sGenerator';

interface K8sConfig {
  projectId: string;
  clusterName: string;
  region: string;
  zone: string;
  namespace: string;
  appName: string;
  frontendImage: string;
  backendImage: string;
  frontendPort: number;
  backendPort: number;
  replicas: number;
  enablePersistentVolume: boolean;
  storageSize: string;
  enableIngress: boolean;
  domain: string;
}

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

interface K8sGitHubIntegrationProps {
  config: GitHubConfig;
  k8sConfig: K8sConfig;
  onChange: (config: GitHubConfig) => void;
  onBack: () => void;
  onNext: () => void;
}

const K8sGitHubIntegration: React.FC<K8sGitHubIntegrationProps> = ({
  config,
  k8sConfig,
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
      
      // Generate Kubernetes files
      const files = generateK8sFiles(k8sConfig);
      
      // Upload files to GitHub
      await githubService.createOrUpdateFiles(
        config.owner,
        config.repo,
        files,
        'Add Kubernetes manifests and deployment workflow via IaC Generator'
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">GitHub Integration</h2>
        <p className="text-gray-600">Configure GitHub repository and upload Kubernetes manifests with deployment workflow</p>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              />
              <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-md">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-purple-700">
                    <p className="font-medium mb-1">Required Token Permissions:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li><strong>repo</strong> - Full control of private repositories</li>
                      <li><strong>workflow</strong> - Update GitHub Action workflows</li>
                      <li><strong>actions</strong> - Access to GitHub Actions</li>
                    </ul>
                    <p className="mt-2">
                      <a 
                        href="https://github.com/settings/tokens" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-800 underline"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="k8s-applications"
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
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
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
                  <span>Uploading to GitHub...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Upload to GitHub</span>
                </>
              )}
            </button>

            {/* Status Messages */}
            {uploadStatus === 'success' && (
              <div className="mt-3 flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Files uploaded successfully to GitHub!</span>
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

        {/* Workflow Preview */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">GitHub Actions Workflow</h3>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">Files to be created:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>📁 k8s/namespace.yaml</li>
              <li>📁 k8s/frontend-deployment.yaml</li>
              <li>📁 k8s/backend-deployment.yaml</li>
              <li>📁 k8s/frontend-service.yaml</li>
              <li>📁 k8s/backend-service.yaml</li>
              {k8sConfig.enablePersistentVolume && <li>📁 k8s/persistent-volume.yaml</li>}
              {k8sConfig.enableIngress && <li>📁 k8s/ingress.yaml</li>}
              {k8sConfig.enableIngress && k8sConfig.domain && <li>📁 k8s/managed-certificate.yaml</li>}
              <li>📁 .github/workflows/k8s-deploy.yml</li>
            </ul>
          </div>

          <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
            <h4 className="font-medium text-purple-800 mb-2">Deployment Configuration:</h4>
            <div className="text-sm text-purple-700 space-y-1">
              <p><strong>Cluster:</strong> {k8sConfig.clusterName}</p>
              <p><strong>Project:</strong> {k8sConfig.projectId}</p>
              <p><strong>Region:</strong> {k8sConfig.region}</p>
              <p><strong>Zone:</strong> {k8sConfig.zone}</p>
              <p><strong>Namespace:</strong> {k8sConfig.namespace}</p>
              <p><strong>App Name:</strong> {k8sConfig.appName}</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <h4 className="font-medium text-red-800 mb-2">⚠️ Required Secrets:</h4>
            <p className="text-sm text-red-700 mb-2">
              Make sure you have added these secrets to your GitHub repository:
            </p>
            <ul className="text-sm text-red-700 space-y-1">
              <li><code className="bg-red-100 px-1 rounded">GCP_SA_KEY</code> - Service Account JSON key</li>
              <li><code className="bg-red-100 px-1 rounded">GCP_PROJECT_ID</code> - Your GCP Project ID</li>
            </ul>
            <p className="text-xs text-red-600 mt-2">
              Go to Settings → Secrets and variables → Actions in your repository
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">Service Account Permissions:</h4>
            <p className="text-sm text-yellow-700 mb-2">
              The service account needs these roles:
            </p>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• <strong>Kubernetes Engine Developer</strong> (roles/container.developer)</li>
              <li>• <strong>Storage Object Viewer</strong> (roles/storage.objectViewer)</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Kubernetes Operations:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>✅ <strong>Deploy:</strong> Apply all manifests to cluster</li>
              <li>✅ <strong>Update:</strong> Rolling updates for deployments</li>
              <li>✅ <strong>Delete:</strong> Remove all resources</li>
              <li>✅ <strong>Status:</strong> Check deployment health</li>
              <li>✅ Manual workflow dispatch with parameters</li>
              <li>✅ Automatic cluster authentication</li>
            </ul>
          </div>

          {uploadStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Ready to Deploy!</h4>
              <p className="text-sm text-green-700">
                Your Kubernetes manifests and GitHub Actions workflow have been uploaded successfully. 
                Make sure to add the required secrets before proceeding with deployment.
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
          <span>Back to Manifests</span>
        </button>
        
        <button
          onClick={onNext}
          disabled={uploadStatus !== 'success'}
          className={`flex items-center space-x-2 px-6 py-2 rounded-md font-medium transition-colors ${
            uploadStatus === 'success'
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>Manage Deployments</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default K8sGitHubIntegration;