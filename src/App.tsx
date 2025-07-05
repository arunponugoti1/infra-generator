import React, { useState, useEffect } from 'react';
import { Cloud, Github, Play, Settings, FileText, CheckCircle, AlertCircle, Download, Upload, RotateCcw, Layers, History, Save, LogOut, User } from 'lucide-react';
import { BasicAuthProvider, useBasicAuth } from './contexts/BasicAuthContext';
import BasicAuth from './components/auth/BasicAuth';
import ConfigurationForm from './components/ConfigurationForm';
import TerraformPreview from './components/TerraformPreview';
import GitHubIntegration from './components/GitHubIntegration';
import WorkflowStatus from './components/WorkflowStatus';
import DeploymentModeSelector from './components/DeploymentModeSelector';
import K8sConfigurationForm from './components/K8sConfigurationForm';
import K8sManifestPreview from './components/K8sManifestPreview';
import K8sGitHubIntegration from './components/K8sGitHubIntegration';
import K8sWorkflowStatus from './components/K8sWorkflowStatus';
import BasicDeploymentHistory from './components/history/BasicDeploymentHistory';
import BasicSavedConfigurations from './components/configurations/BasicSavedConfigurations';
import { 
  loadAppState, 
  saveTerraformConfig, 
  saveGitHubConfig, 
  saveActiveTab,
  saveDeploymentMode,
  saveK8sConfig,
  saveK8sGitHubConfig,
  clearAppState,
  exportConfiguration,
  importConfiguration,
  getLastSavedTime
} from './utils/storage';
import { saveBasicDeployment, updateBasicDeploymentStatus } from './utils/basicDeploymentTracking';

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

type DeploymentMode = 'infrastructure' | 'application';
type InfraTab = 'config' | 'terraform' | 'github' | 'deploy';
type AppTab = 'k8s-config' | 'k8s-manifest' | 'k8s-github' | 'k8s-deploy';
type MainTab = 'infrastructure' | 'application' | 'history' | 'configurations';

const AppContent: React.FC = () => {
  const { user, signOut, setUser } = useBasicAuth();
  
  // Load initial state from localStorage
  const initialState = loadAppState();
  
  const [mainTab, setMainTab] = useState<MainTab>('infrastructure');
  const [deploymentMode, setDeploymentMode] = useState<DeploymentMode>(initialState.deploymentMode);
  const [activeInfraTab, setActiveInfraTab] = useState<InfraTab>(initialState.activeInfraTab);
  const [activeAppTab, setActiveAppTab] = useState<AppTab>(initialState.activeAppTab);
  const [terraformConfig, setTerraformConfig] = useState<TerraformConfig>(initialState.terraformConfig);
  const [githubConfig, setGithubConfig] = useState<GitHubConfig>(initialState.githubConfig);
  const [k8sConfig, setK8sConfig] = useState<K8sConfig>(initialState.k8sConfig);
  const [k8sGithubConfig, setK8sGithubConfig] = useState<GitHubConfig>(initialState.k8sGithubConfig);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<string | null>(getLastSavedTime());
  const [showImportExport, setShowImportExport] = useState(false);
  const [currentDeploymentId, setCurrentDeploymentId] = useState<string | null>(null);

  // Auto-save when configurations change
  useEffect(() => {
    saveTerraformConfig(terraformConfig);
    setLastSaved(getLastSavedTime());
  }, [terraformConfig]);

  useEffect(() => {
    saveGitHubConfig(githubConfig);
    setLastSaved(getLastSavedTime());
  }, [githubConfig]);

  useEffect(() => {
    saveK8sConfig(k8sConfig);
    setLastSaved(getLastSavedTime());
  }, [k8sConfig]);

  useEffect(() => {
    saveK8sGitHubConfig(k8sGithubConfig);
    setLastSaved(getLastSavedTime());
  }, [k8sGithubConfig]);

  useEffect(() => {
    saveDeploymentMode(deploymentMode);
  }, [deploymentMode]);

  useEffect(() => {
    saveActiveTab(activeInfraTab, activeAppTab);
  }, [activeInfraTab, activeAppTab]);

  const handleTerraformConfigChange = (config: TerraformConfig) => {
    setTerraformConfig(config);
  };

  const handleGithubConfigChange = (config: GitHubConfig) => {
    setGithubConfig(config);
  };

  const handleK8sConfigChange = (config: K8sConfig) => {
    setK8sConfig(config);
  };

  const handleK8sGithubConfigChange = (config: GitHubConfig) => {
    setK8sGithubConfig(config);
  };

  const handleInfraTabChange = (tab: InfraTab) => {
    setActiveInfraTab(tab);
  };

  const handleAppTabChange = (tab: AppTab) => {
    setActiveAppTab(tab);
  };

  const handleDeploymentModeChange = (mode: DeploymentMode) => {
    setDeploymentMode(mode);
    setDeploymentStatus('idle');
    setMainTab(mode);
  };

  const handleDeploymentStart = (type: 'infrastructure' | 'application', config: any, githubRepo?: string, workflowUrl?: string) => {
    try {
      const deployment = saveBasicDeployment({
        deployment_type: type,
        project_name: type === 'infrastructure' ? config.clusterName : config.namespace,
        configuration: config,
        status: 'pending',
        github_repo: githubRepo,
        workflow_url: workflowUrl,
        notes: `${type} deployment started via IaC Generator by ${user?.name}`,
      });
      
      setCurrentDeploymentId(deployment.id);
      console.log('📊 Deployment tracked for user:', user?.name, deployment.id);
    } catch (error) {
      console.error('Failed to track deployment:', error);
    }
  };

  const handleDeploymentStatusChange = (status: 'idle' | 'deploying' | 'success' | 'error') => {
    setDeploymentStatus(status);
    
    // Update deployment record if we have one
    if (currentDeploymentId && status !== 'idle' && status !== 'deploying') {
      const deploymentStatus = status === 'success' ? 'success' : 'failed';
      updateBasicDeploymentStatus(currentDeploymentId, deploymentStatus);
      
      if (status !== 'deploying') {
        setCurrentDeploymentId(null);
      }
    }
  };

  const handleLoadConfiguration = (config: any, type: 'infrastructure' | 'application') => {
    if (type === 'infrastructure') {
      setTerraformConfig(config);
      setMainTab('infrastructure');
      setActiveInfraTab('config');
    } else {
      setK8sConfig(config);
      setMainTab('application');
      setActiveAppTab('k8s-config');
    }
  };

  const handleExportConfig = () => {
    const configJson = exportConfiguration();
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${user?.name || 'user'}-iac-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (importConfiguration(content)) {
          // Reload the state after import
          const newState = loadAppState();
          setTerraformConfig(newState.terraformConfig);
          setGithubConfig(newState.githubConfig);
          setK8sConfig(newState.k8sConfig);
          setK8sGithubConfig(newState.k8sGithubConfig);
          setDeploymentMode(newState.deploymentMode);
          setActiveInfraTab(newState.activeInfraTab);
          setActiveAppTab(newState.activeAppTab);
          setLastSaved(getLastSavedTime());
          alert('✅ Configuration imported successfully!');
        } else {
          alert('❌ Failed to import configuration. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
    // Reset the input
    event.target.value = '';
  };

  const handleResetConfig = () => {
    if (confirm('⚠️ Are you sure you want to reset all configurations? This action cannot be undone.')) {
      clearAppState();
      // Reload the page to reset to default state
      window.location.reload();
    }
  };

  const formatLastSaved = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`;
    return date.toLocaleDateString();
  };

  // Handle authentication success
  const handleAuthSuccess = (authenticatedUser: any) => {
    setUser(authenticatedUser);
  };

  const mainTabs = [
    { id: 'infrastructure', label: 'Infrastructure', icon: Cloud },
    { id: 'application', label: 'Applications', icon: Layers },
    { id: 'history', label: 'History', icon: History },
    { id: 'configurations', label: 'Saved Configs', icon: Save }
  ];

  const infraTabs = [
    { id: 'config', label: 'Configuration', icon: Settings },
    { id: 'terraform', label: 'Terraform Code', icon: FileText },
    { id: 'github', label: 'GitHub Setup', icon: Github },
    { id: 'deploy', label: 'Deploy', icon: Play }
  ];

  const appTabs = [
    { id: 'k8s-config', label: 'App Configuration', icon: Settings },
    { id: 'k8s-manifest', label: 'K8s Manifests', icon: FileText },
    { id: 'k8s-github', label: 'GitHub Setup', icon: Github },
    { id: 'k8s-deploy', label: 'Deploy Apps', icon: Layers }
  ];

  // Show authentication screen if user is not logged in
  if (!user) {
    return <BasicAuth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Cloud className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">IaC Generator</h1>
                <p className="text-sm text-gray-500">Enterprise Infrastructure Platform</p>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center space-x-4">
              {/* User Info */}
              {user && (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <div className="bg-blue-600 p-2 rounded-full">
                    <User className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}

              {/* Auto-save Status */}
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Auto-saved {formatLastSaved(lastSaved)}</span>
              </div>

              {/* Import/Export Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowImportExport(!showImportExport)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  title="Import/Export Configuration"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Sign Out</span>
              </button>

              {/* Deployment Status */}
              <div className="flex items-center space-x-2">
                {deploymentStatus === 'success' && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Deployed</span>
                  </div>
                )}
                {deploymentStatus === 'error' && (
                  <div className="flex items-center space-x-1 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Failed</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Import/Export Panel */}
          {showImportExport && (
            <div className="border-t bg-gray-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleExportConfig}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export Config</span>
                  </button>
                  
                  <label className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm cursor-pointer">
                    <Upload className="h-4 w-4" />
                    <span>Import Config</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportConfig}
                      className="hidden"
                    />
                  </label>
                  
                  <button
                    onClick={handleResetConfig}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Reset All</span>
                  </button>
                </div>
                
                <div className="text-sm text-gray-600">
                  Configuration is automatically saved for <strong>{user?.name}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {mainTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setMainTab(tab.id as MainTab)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    mainTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sub Navigation for Infrastructure/Application */}
      <>
        {/* Deployment Mode Selector */}
        {mainTab === 'infrastructure' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <DeploymentModeSelector
              mode={deploymentMode}
              onChange={handleDeploymentModeChange}
            />
          </div>
        )}

        {/* Sub Navigation Tabs */}
        {(mainTab === 'infrastructure' || mainTab === 'application') && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {(mainTab === 'infrastructure' ? infraTabs : appTabs).map((tab) => {
                  const Icon = tab.icon;
                  const activeTab = mainTab === 'infrastructure' ? activeInfraTab : activeAppTab;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        if (mainTab === 'infrastructure') {
                          handleInfraTabChange(tab.id as InfraTab);
                        } else {
                          handleAppTabChange(tab.id as AppTab);
                        }
                      }}
                      className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Infrastructure Mode */}
          {mainTab === 'infrastructure' && (
            <>
              {activeInfraTab === 'config' && (
                <ConfigurationForm
                  config={terraformConfig}
                  onChange={handleTerraformConfigChange}
                  onNext={() => handleInfraTabChange('terraform')}
                />
              )}
              
              {activeInfraTab === 'terraform' && (
                <TerraformPreview
                  config={terraformConfig}
                  onBack={() => handleInfraTabChange('config')}
                  onNext={() => handleInfraTabChange('github')}
                />
              )}
              
              {activeInfraTab === 'github' && (
                <GitHubIntegration
                  config={githubConfig}
                  terraformConfig={terraformConfig}
                  onChange={handleGithubConfigChange}
                  onBack={() => handleInfraTabChange('terraform')}
                  onNext={() => handleInfraTabChange('deploy')}
                />
              )}
              
              {activeInfraTab === 'deploy' && (
                <WorkflowStatus
                  githubConfig={githubConfig}
                  terraformConfig={terraformConfig}
                  status={deploymentStatus}
                  onStatusChange={handleDeploymentStatusChange}
                  onBack={() => handleInfraTabChange('github')}
                  onDeploymentStart={(workflowUrl) => handleDeploymentStart('infrastructure', terraformConfig, `${githubConfig.owner}/${githubConfig.repo}`, workflowUrl)}
                />
              )}
            </>
          )}

          {/* Application Mode */}
          {mainTab === 'application' && (
            <>
              {activeAppTab === 'k8s-config' && (
                <K8sConfigurationForm
                  config={k8sConfig}
                  onChange={handleK8sConfigChange}
                  onNext={() => handleAppTabChange('k8s-manifest')}
                />
              )}
              
              {activeAppTab === 'k8s-manifest' && (
                <K8sManifestPreview
                  config={k8sConfig}
                  onBack={() => handleAppTabChange('k8s-config')}
                  onNext={() => handleAppTabChange('k8s-github')}
                />
              )}
              
              {activeAppTab === 'k8s-github' && (
                <K8sGitHubIntegration
                  config={k8sGithubConfig}
                  k8sConfig={k8sConfig}
                  onChange={handleK8sGithubConfigChange}
                  onBack={() => handleAppTabChange('k8s-manifest')}
                  onNext={() => handleAppTabChange('k8s-deploy')}
                />
              )}
              
              {activeAppTab === 'k8s-deploy' && (
                <K8sWorkflowStatus
                  githubConfig={k8sGithubConfig}
                  k8sConfig={k8sConfig}
                  status={deploymentStatus}
                  onStatusChange={handleDeploymentStatusChange}
                  onBack={() => handleAppTabChange('k8s-github')}
                  onDeploymentStart={(workflowUrl) => handleDeploymentStart('application', k8sConfig, `${k8sGithubConfig.owner}/${k8sGithubConfig.repo}`, workflowUrl)}
                />
              )}
            </>
          )}

          {/* History Tab */}
          {mainTab === 'history' && (
            <BasicDeploymentHistory />
          )}

          {/* Configurations Tab */}
          {mainTab === 'configurations' && (
            <BasicSavedConfigurations
              onLoadConfiguration={handleLoadConfiguration}
              currentInfraConfig={terraformConfig}
              currentAppConfig={k8sConfig}
            />
          )}
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BasicAuthProvider>
      <AuthWrapper />
    </BasicAuthProvider>
  );
};

const AuthWrapper: React.FC = () => {
  const { user, loading } = useBasicAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AppContent />;
  }

  return <AppContent />;
};

export default App;