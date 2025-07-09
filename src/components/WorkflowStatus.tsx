import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, RefreshCw, ExternalLink, CheckCircle, XCircle, Clock, Eye, Trash2, AlertTriangle } from 'lucide-react';
import { GitHubService } from '../utils/githubApi';
import { useBasicAuth } from '../contexts/BasicAuthContext';
import AuthModal from './auth/AuthModal';

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

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

interface WorkflowStatusProps {
  githubConfig: GitHubConfig;
  terraformConfig: TerraformConfig;
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

type TerraformAction = 'plan' | 'apply' | 'destroy';

const WorkflowStatus: React.FC<WorkflowStatusProps> = ({
  githubConfig,
  terraformConfig,
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
  const [currentAction, setCurrentAction] = useState<TerraformAction>('plan');
  const [showDestroyConfirm, setShowDestroyConfirm] = useState(false);
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
            'deploy.yml'
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
                if (currentAction === 'destroy') {
                  addLog('🗑️ Infrastructure destroyed successfully!');
                } else if (currentAction === 'apply') {
                  addLog('🎉 GKE cluster created successfully!');
                } else {
                  addLog('📋 Terraform plan completed successfully!');
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

  const triggerWorkflow = async (action: TerraformAction) => {
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
      plan: '📋 Triggering Terraform plan...',
      apply: '🚀 Triggering simplified infrastructure deployment...',
      destroy: '🗑️ Triggering infrastructure destruction...'
    };
    
    addLog(actionMessages[action]);

    try {
      // Prepare workflow inputs - simplified for fixed node count
      const workflowInputs = {
        terraform_action: action,
        project_id: terraformConfig.projectId,
        cluster_name: terraformConfig.clusterName,
        region: terraformConfig.region,
        node_count: '2', // Fixed to 2 nodes
        machine_type: terraformConfig.machineType,
        disk_size: terraformConfig.diskSize.toString()
      };

      // Trigger the workflow
      await githubService.triggerWorkflow(
        githubConfig.owner,
        githubConfig.repo,
        'deploy.yml',
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
            'deploy.yml'
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

  const handleDestroyClick = () => {
    setShowDestroyConfirm(true);
  };

  const confirmDestroy = () => {
    setShowDestroyConfirm(false);
    triggerWorkflow('destroy');
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'idle':
        return <Play className="h-5 w-5 text-blue-600" />;
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
        plan: 'Planning...',
        apply: 'Deploying...',
        destroy: 'Destroying...'
      };
      return actionText[currentAction];
    }
    
    switch (status) {
      case 'idle':
        return 'Ready for Operations';
      case 'success':
        return currentAction === 'destroy' ? 'Destruction Successful' : 
               currentAction === 'plan' ? 'Plan Successful' : 'Deployment Successful';
      case 'error':
        return `${currentAction.charAt(0).toUpperCase() + currentAction.slice(1)} Failed`;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'idle':
        return 'text-blue-600';
      case 'deploying':
        return 'text-yellow-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Terraform Operations</h2>
        <p className="text-gray-600">Simplified GKE infrastructure with fixed 2-node configuration</p>
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
              <h4 className="font-medium text-gray-800 mb-2">Simplified Configuration</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Project:</span>
                  <p className="font-medium">{terraformConfig.projectId}</p>
                </div>
                <div>
                  <span className="text-gray-600">Cluster:</span>
                  <p className="font-medium">{terraformConfig.clusterName}</p>
                </div>
                <div>
                  <span className="text-gray-600">Region:</span>
                  <p className="font-medium">{terraformConfig.region}</p>
                </div>
                <div>
                  <span className="text-gray-600">Zones:</span>
                  <p className="font-medium">{terraformConfig.region}-a, {terraformConfig.region}-c</p>
                </div>
                <div>
                  <span className="text-gray-600">Nodes:</span>
                  <p className="font-medium">2 (fixed count)</p>
                </div>
                <div>
                  <span className="text-gray-600">Machine:</span>
                  <p className="font-medium">{terraformConfig.machineType}</p>
                </div>
              </div>
            </div>

            {/* Optimizations Applied */}
            <div className="bg-green-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium text-green-800 mb-2">⚡ Performance Optimizations</h4>
              <div className="text-sm text-green-700 space-y-1">
                <p>✅ Removed network policy (faster creation)</p>
                <p>✅ Removed IP allocation policy (faster creation)</p>
                <p>✅ Removed workload identity (faster creation)</p>
                <p>✅ Removed auto-repair/upgrade (faster creation)</p>
                <p>✅ Fixed 2-node count (no autoscaling complexity)</p>
                <p>✅ Service Account: githubactions-sa@turnkey-guild-441104-f3.iam.gserviceaccount.com</p>
              </div>
            </div>

            {/* Remote State Info */}
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium text-blue-800 mb-2">Remote State Backend</h4>
              <div className="text-sm text-blue-700">
                <p><strong>Backend:</strong> Google Cloud Storage</p>
                <p><strong>Bucket:</strong> terraform-statefile-bucket-tf2</p>
                <p><strong>Prefix:</strong> terraform/state/gke-cluster</p>
              </div>
            </div>

            {/* Current Workflow Status */}
            {currentWorkflowRun && (
              <div className="bg-purple-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-purple-800 mb-2">Current Operation</h4>
                <div className="text-sm text-purple-700">
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
              {/* Plan Button */}
              <button
                onClick={() => triggerWorkflow('plan')}
                disabled={status === 'deploying'}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-md font-medium transition-colors ${
                  status === 'deploying'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {status === 'deploying' && currentAction === 'plan' ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Planning...</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    <span>Terraform Plan</span>
                  </>
                )}
              </button>

              {/* Apply Button */}
              <button
                onClick={() => triggerWorkflow('apply')}
                disabled={status === 'deploying'}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-md font-medium transition-colors ${
                  status === 'deploying'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {status === 'deploying' && currentAction === 'apply' ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Terraform Apply (Fast)</span>
                  </>
                )}
              </button>

              {/* Destroy Button */}
              <button
                onClick={handleDestroyClick}
                disabled={status === 'deploying'}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-md font-medium transition-colors ${
                  status === 'deploying'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {status === 'deploying' && currentAction === 'destroy' ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Destroying...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Terraform Destroy</span>
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
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
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
          {status === 'success' && currentAction === 'apply' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h4 className="font-medium text-green-800 mb-3">🎉 Simplified Infrastructure Created!</h4>
              <div className="space-y-2 text-sm text-green-700">
                <p>✅ Your GKE cluster has been created successfully!</p>
                <p>⚡ Fast creation with simplified configuration</p>
                <p>🔧 Configure kubectl to connect to your cluster:</p>
                <code className="block bg-green-100 p-2 rounded text-xs mt-2 font-mono">
                  gcloud container clusters get-credentials {terraformConfig.clusterName} --region {terraformConfig.region} --project {terraformConfig.projectId}
                </code>
                <p className="mt-2">💾 State is stored in: terraform-statefile-bucket-tf2/terraform/state/gke-cluster</p>
                <p>📊 Cluster has exactly 2 nodes for optimal performance</p>
              </div>
            </div>
          )}

          {status === 'success' && currentAction === 'destroy' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <h4 className="font-medium text-orange-800 mb-3">🗑️ Infrastructure Destroyed!</h4>
              <div className="space-y-2 text-sm text-orange-700">
                <p>✅ Your GKE cluster has been destroyed successfully!</p>
                <p>💾 Remote state has been updated in GCS bucket</p>
                <p>💰 All associated resources have been cleaned up</p>
                <p>🔄 You can now create a new cluster with different configuration</p>
              </div>
            </div>
          )}

          {status === 'success' && currentAction === 'plan' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-medium text-blue-800 mb-3">📋 Plan Completed!</h4>
              <div className="space-y-2 text-sm text-blue-700">
                <p>✅ Terraform plan has been generated successfully!</p>
                <p>👀 Review the plan output in the GitHub Actions logs</p>
                <p>🚀 If the plan looks good, proceed with "Terraform Apply (Fast)"</p>
                <p>💾 Plan uses remote state from: terraform-statefile-bucket-tf2</p>
                <p>⚡ Simplified configuration for faster deployment</p>
              </div>
            </div>
          )}
        </div>

        {/* Deployment Logs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Operation Logs</h3>
            {isPolling && (
              <div className="flex items-center space-x-2 text-blue-600">
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
                  <p>Ready for simplified Terraform operations...</p>
                  <p className="text-sm mt-1">Choose Plan, Apply, or Destroy to begin</p>
                  <p className="text-xs mt-2">Real-time logs will appear here</p>
                  <p className="text-xs mt-1">⚡ Optimized for fast cluster creation</p>
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
            <h4 className="font-medium text-gray-800 mb-2">Simplified Operation Guide</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Plan:</strong> Preview changes without applying them</p>
              <p><strong>Apply (Fast):</strong> Create infrastructure with optimized settings</p>
              <p><strong>Destroy:</strong> Remove all infrastructure resources</p>
              <p className="text-xs mt-2 text-gray-500">⚡ Configuration optimized for faster creation</p>
              <p className="text-xs text-gray-500">📊 Fixed 2-node cluster for simplicity</p>
            </div>
          </div>
        </div>
      </div>

      {/* Destroy Confirmation Modal */}
      {showDestroyConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Confirm Infrastructure Destruction</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Are you sure you want to destroy the infrastructure? This action will:
            </p>
            <ul className="text-sm text-gray-600 mb-6 space-y-1">
              <li>• Delete the GKE cluster: <strong>{terraformConfig.clusterName}</strong></li>
              <li>• Remove 2 nodes in zones: <strong>{terraformConfig.region}-a, {terraformConfig.region}-c</strong></li>
              <li>• Clean up all associated GCP resources</li>
              <li>• Update the remote state file in GCS</li>
              <li>• <strong className="text-red-600">This action cannot be undone</strong></li>
            </ul>
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> The remote state will be preserved in the GCS bucket for future reference.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDestroyConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDestroy}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Destroy Infrastructure
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
              setCurrentAction('plan');
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Reset for New Operation
          </button>
        )}
      </div>
    </div>
  );
};

export default WorkflowStatus;