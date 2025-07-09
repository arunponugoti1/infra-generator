import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, RefreshCw, ExternalLink, CheckCircle, XCircle, Clock, Eye, Trash2, AlertTriangle, Layers } from 'lucide-react';
import { GitHubService } from '../utils/githubApi';
import { useBasicAuth } from '../contexts/BasicAuthContext';
import AuthModal from './auth/AuthModal';

interface K8sConfig {
  projectId: string;
  clusterName: string;
  region: string;
  zone: string;
  namespace: string;
  manifests: ManifestConfig[];
}

interface ManifestConfig {
  type: 'frontend' | 'backend' | 'secrets' | 'ingress' | 'db-init-job';
  enabled: boolean;
  config: Record<string, any>;
}

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

interface K8sWorkflowStatusProps {
  githubConfig: GitHubConfig;
  k8sConfig: K8sConfig;
  status: 'idle' | 'deploying' | 'success' | 'error';
  onStatusChange: (status: 'idle' | 'deploying' | 'success' | 'error') => void;
  onBack: () => void;
  onDeploymentStart?: (workflowUrl: string) => void;
}

interface WorkflowRun {
  id: number;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
}

type K8sAction = 'deploy' | 'update' | 'delete' | 'status';

const K8sWorkflowStatus: React.FC<K8sWorkflowStatusProps> = ({
  githubConfig,
  k8sConfig,
  status,
  onStatusChange,
  onBack,
  onDeploymentStart
}) => {
  const { user } = useBasicAuth();
  const [workflowUrl, setWorkflowUrl] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [currentWorkflowRun, setCurrentWorkflowRun] = useState<WorkflowRun | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [currentAction, setCurrentAction] = useState<K8sAction>('deploy');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const githubService = new GitHubService(githubConfig.token);

  // Poll for workflow status updates
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isPolling && currentWorkflowRun) {
      intervalId = setInterval(async () => {
        try {
          const runs = await githubService.getWorkflowRuns(
            githubConfig.owner,
            githubConfig.repo,
            'k8s-deploy.yml'
          );

          const currentRun = runs.find(run => run.id === currentWorkflowRun.id);
          if (currentRun) {
            setCurrentWorkflowRun(currentRun);
            
            // Update logs based on workflow status
            updateLogsFromWorkflowStatus(currentRun);

            // Check if workflow is complete
            if (currentRun.status === 'completed') {
              setIsPolling(false);
              if (currentRun.conclusion === 'success') {
                onStatusChange('success');
                if (currentAction === 'delete') {
                  addLog('🗑️ Applications deleted successfully!');
                } else if (currentAction === 'deploy') {
                  addLog('🎉 Applications deployed successfully!');
                } else if (currentAction === 'update') {
                  addLog('🔄 Applications updated successfully!');
                } else {
                  addLog('📊 Status check completed successfully!');
                }
              } else {
                onStatusChange('error');
                addLog(`❌ ${currentAction} failed: ${currentRun.conclusion}`);
              }
            }
          }
        } catch (error) {
          console.error('Error polling workflow status:', error);
          addLog('⚠️ Error checking workflow status');
        }
      }, 10000); // Poll every 10 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPolling, currentWorkflowRun, currentAction]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `${timestamp} - ${message}`]);
  };

  const updateLogsFromWorkflowStatus = (run: WorkflowRun) => {
    const statusMessages: Record<string, string> = {
      'queued': '📋 Workflow queued',
      'in_progress': `🔄 ${currentAction} in progress`,
      'completed': run.conclusion === 'success' ? `✅ ${currentAction} completed successfully` : `❌ ${currentAction} failed`
    };

    if (statusMessages[run.status]) {
      // Only add new status if it's different from the last log
      setLogs(prev => {
        const lastLog = prev[prev.length - 1];
        const newMessage = `${new Date().toLocaleTimeString()} - ${statusMessages[run.status]}`;
        if (!lastLog || !lastLog.includes(statusMessages[run.status])) {
          return [...prev, newMessage];
        }
        return prev;
      });
    }
  };

  const triggerWorkflow = async (action: K8sAction) => {
    // Check if user is authenticated before allowing deployment operations
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!githubConfig.token || !githubConfig.owner || !githubConfig.repo) {
      addLog('❌ GitHub configuration is incomplete');
      onStatusChange('error');
      return;
    }

    setCurrentAction(action);
    onStatusChange('deploying');
    setLogs([]);
    
    const actionMessages = {
      deploy: '🚀 Triggering application deployment...',
      update: '🔄 Triggering application update...',
      delete: '🗑️ Triggering application deletion...',
      status: '📊 Checking deployment status...'
    };
    
    addLog(actionMessages[action]);

    try {
      // Prepare workflow inputs
      const workflowInputs = {
        k8s_action: action,
        project_id: k8sConfig.projectId,
        cluster_name: k8sConfig.clusterName,
        region: k8sConfig.region,
        zone: k8sConfig.zone,
        namespace: k8sConfig.namespace,
      };

      // Trigger the workflow
      await githubService.triggerWorkflow(
        githubConfig.owner,
        githubConfig.repo,
        'k8s-deploy.yml',
        workflowInputs
      );

      addLog('✅ Workflow triggered successfully');
      
      const workflowUrl = `https://github.com/${githubConfig.owner}/${githubConfig.repo}/actions`;
      setWorkflowUrl(workflowUrl);

      // Notify parent component about deployment start
      if (onDeploymentStart) {
        onDeploymentStart(workflowUrl);
      }

      // Wait a moment for the workflow to appear in the API
      setTimeout(async () => {
        try {
          const runs = await githubService.getWorkflowRuns(
            githubConfig.owner,
            githubConfig.repo,
            'k8s-deploy.yml'
          );

          if (runs.length > 0) {
            const latestRun = runs[0];
            setCurrentWorkflowRun(latestRun);
            setIsPolling(true);
            addLog(`📋 Workflow started: ${latestRun.html_url}`);
            addLog(`🔄 Monitoring ${action} progress...`);
          }
        } catch (error) {
          console.error('Error fetching workflow runs:', error);
          addLog('⚠️ Could not fetch workflow status, but workflow was triggered');
        }
      }, 5000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addLog(`❌ Failed to trigger ${action}: ${errorMessage}`);
      onStatusChange('error');
      console.error('Workflow trigger error:', error);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    triggerWorkflow('delete');
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'idle':
        return <Layers className="h-5 w-5 text-purple-600" />;
      case 'deploying':
        return <RefreshCw className="h-5 w-5 text-yellow-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusText = () => {
    if (status === 'deploying') {
      const actionText = {
        deploy: 'Deploying...',
        update: 'Updating...',
        delete: 'Deleting...',
        status: 'Checking...'
      };
      return actionText[currentAction];
    }
    
    switch (status) {
      case 'idle':
        return 'Ready for Operations';
      case 'success':
        return currentAction === 'delete' ? 'Deletion Successful' : 
               currentAction === 'status' ? 'Status Check Complete' : 
               currentAction === 'update' ? 'Update Successful' : 'Deployment Successful';
      case 'error':
        return `${currentAction.charAt(0).toUpperCase() + currentAction.slice(1)} Failed`;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'idle':
        return 'text-purple-600';
      case 'deploying':
        return 'text-yellow-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  const enabledManifests = k8sConfig.manifests.filter(m => m.enabled);
  const manifestTypes = enabledManifests.map(m => m.type).join(', ');

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Kubernetes Deployment Operations</h2>
        <p className="text-gray-600">Manage your application deployments on GKE cluster</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Deployment Control */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              {getStatusIcon()}
              <h3 className={`text-lg font-semibold ${getStatusColor()}`}>
                {getStatusText()}
              </h3>
            </div>

            {/* Configuration Summary */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium text-gray-800 mb-2">Application Configuration</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Project:</span>
                  <p className="font-medium">{k8sConfig.projectId}</p>
                </div>
                <div>
                  <span className="text-gray-600">Cluster:</span>
                  <p className="font-medium">{k8sConfig.clusterName}</p>
                </div>
                <div>
                  <span className="text-gray-600">Namespace:</span>
                  <p className="font-medium">{k8sConfig.namespace}</p>
                </div>
                <div>
                  <span className="text-gray-600">Zone:</span>
                  <p className="font-medium">{k8sConfig.zone}</p>
                </div>
              </div>
            </div>

            {/* Selected Manifests */}
            <div className="bg-purple-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium text-purple-800 mb-2">Selected Manifests</h4>
              <div className="text-sm text-purple-700 space-y-1">
                <p><strong>Count:</strong> {enabledManifests.length} manifest(s)</p>
                <p><strong>Types:</strong> {manifestTypes || 'None selected'}</p>
                {enabledManifests.map(manifest => (
                  <p key={manifest.type}>• {manifest.type.replace('-', ' ')}</p>
                ))}
              </div>
            </div>

            {/* Features Enabled */}
            <div className="bg-green-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium text-green-800 mb-2">Enabled Features</h4>
              <div className="text-sm text-green-700 space-y-1">
                <p>✅ Modular manifest deployment</p>
                <p>✅ Health checks & rolling updates</p>
                <p>✅ Resource limits & requests</p>
                <p>✅ Production-ready configuration</p>
                <p>✅ Zero-downtime deployments</p>
              </div>
            </div>

            {/* Current Workflow Status */}
            {currentWorkflowRun && (
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-blue-800 mb-2">Current Operation</h4>
                <div className="text-sm text-blue-700">
                  <p><strong>Action:</strong> {currentAction.toUpperCase()}</p>
                  <p><strong>Status:</strong> {currentWorkflowRun.status}</p>
                  {currentWorkflowRun.conclusion && (
                    <p><strong>Result:</strong> {currentWorkflowRun.conclusion}</p>
                  )}
                  <p><strong>Started:</strong> {new Date(currentWorkflowRun.created_at).toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Status Check Button */}
              <button
                onClick={() => triggerWorkflow('status')}
                disabled={status === 'deploying'}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-md font-medium transition-colors ${
                  status === 'deploying'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {status === 'deploying' && currentAction === 'status' ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Checking Status...</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    <span>Check Status</span>
                  </>
                )}
              </button>

              {/* Deploy Button */}
              <button
                onClick={() => triggerWorkflow('deploy')}
                disabled={status === 'deploying'}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-md font-medium transition-colors ${
                  status === 'deploying'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {status === 'deploying' && currentAction === 'deploy' ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Deploying...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Deploy Applications</span>
                  </>
                )}
              </button>

              {/* Update Button */}
              <button
                onClick={() => triggerWorkflow('update')}
                disabled={status === 'deploying'}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-md font-medium transition-colors ${
                  status === 'deploying'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {status === 'deploying' && currentAction === 'update' ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Update Applications</span>
                  </>
                )}
              </button>

              {/* Delete Button */}
              <button
                onClick={handleDeleteClick}
                disabled={status === 'deploying'}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-md font-medium transition-colors ${
                  status === 'deploying'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {status === 'deploying' && currentAction === 'delete' ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Applications</span>
                  </>
                )}
              </button>
            </div>

            {/* Workflow Links */}
            {workflowUrl && (
              <div className="mt-4 space-y-2">
                <a
                  href={workflowUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-purple-600 hover:text-purple-800 text-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>View all workflows in GitHub</span>
                </a>
                
                {currentWorkflowRun && (
                  <a
                    href={currentWorkflowRun.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-green-600 hover:text-green-800 text-sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>View current run details</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Operation-specific Success Messages */}
          {status === 'success' && currentAction === 'deploy' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h4 className="font-medium text-green-800 mb-3">🎉 Applications Deployed Successfully!</h4>
              <div className="space-y-2 text-sm text-green-700">
                <p>✅ Your applications are now running on GKE!</p>
                <p>🌐 Selected manifests have been deployed</p>
                <p>🔧 Check service endpoints:</p>
                <code className="block bg-green-100 p-2 rounded text-xs mt-2 font-mono">
                  kubectl get services -n {k8sConfig.namespace}
                </code>
                <p className="mt-2">📊 Monitor your deployments:</p>
                <code className="block bg-green-100 p-2 rounded text-xs mt-1 font-mono">
                  kubectl get pods -n {k8sConfig.namespace}
                </code>
              </div>
            </div>
          )}

          {status === 'success' && currentAction === 'delete' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <h4 className="font-medium text-orange-800 mb-3">🗑️ Applications Deleted!</h4>
              <div className="space-y-2 text-sm text-orange-700">
                <p>✅ All selected application resources have been removed</p>
                <p>🧹 Namespace and services cleaned up</p>
                <p>💰 Resources are no longer consuming cluster capacity</p>
                <p>🔄 You can now deploy new applications or configurations</p>
              </div>
            </div>
          )}

          {status === 'success' && currentAction === 'update' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-medium text-blue-800 mb-3">🔄 Applications Updated!</h4>
              <div className="space-y-2 text-sm text-blue-700">
                <p>✅ Rolling update completed successfully</p>
                <p>🚀 New configurations are now deployed</p>
                <p>⚡ Zero-downtime deployment achieved</p>
                <p>📊 All pods are running the latest version</p>
              </div>
            </div>
          )}

          {status === 'success' && currentAction === 'status' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h4 className="font-medium text-purple-800 mb-3">📊 Status Check Complete!</h4>
              <div className="space-y-2 text-sm text-purple-700">
                <p>✅ Deployment status has been retrieved</p>
                <p>👀 Check the GitHub Actions logs for detailed information</p>
                <p>🔍 Pod status, service endpoints, and resource usage reported</p>
                <p>📈 All health checks and readiness probes verified</p>
              </div>
            </div>
          )}
        </div>

        {/* Deployment Logs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Operation Logs</h3>
            {isPolling && (
              <div className="flex items-center space-x-2 text-purple-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Live monitoring</span>
              </div>
            )}
          </div>
          
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <p>Ready for Kubernetes operations...</p>
                  <p className="text-sm mt-1">Choose an action to begin</p>
                  <p className="text-xs mt-2">Real-time logs will appear here</p>
                  <p className="text-xs mt-1">🚀 Deploy, update, or manage your applications</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1 font-mono text-sm">
                {logs.map((log, index) => (
                  <div key={index} className="text-gray-100">
                    {log}
                  </div>
                ))}
                {status === 'deploying' && (
                  <div className="flex items-center space-x-2 text-yellow-400 mt-2">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span className="text-sm">Monitoring {currentAction} progress...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Operation Guide */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">Kubernetes Operations Guide</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Status:</strong> Check current deployment health and pod status</p>
              <p><strong>Deploy:</strong> Apply selected manifests and create new deployments</p>
              <p><strong>Update:</strong> Perform rolling updates with new configurations</p>
              <p><strong>Delete:</strong> Remove selected application resources from cluster</p>
              <p className="text-xs mt-2 text-gray-500">🔄 All operations support zero-downtime deployments</p>
              <p className="text-xs text-gray-500">📊 Health checks ensure application availability</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Confirm Application Deletion</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete the selected application resources? This action will:
            </p>
            <ul className="text-sm text-gray-600 mb-6 space-y-1">
              <li>• Delete selected manifests in namespace: <strong>{k8sConfig.namespace}</strong></li>
              <li>• Remove deployments and services for: <strong>{manifestTypes}</strong></li>
              <li>• Clean up associated resources</li>
              <li>• <strong className="text-red-600">This action cannot be undone</strong></li>
            </ul>
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> The namespace will be preserved for future deployments.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete Applications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signin"
      />

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to GitHub Setup</span>
        </button>
        
        {status === 'success' && (
          <button
            onClick={() => {
              onStatusChange('idle');
              setLogs([]);
              setWorkflowUrl('');
              setCurrentWorkflowRun(null);
              setIsPolling(false);
              setCurrentAction('deploy');
            }}
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            Reset for New Operation
          </button>
        )}
      </div>
    </div>
  );
};

export default K8sWorkflowStatus;