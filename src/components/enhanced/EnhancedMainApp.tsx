import React, { useState } from 'react';
import { Cloud, Layers, Monitor, History, Save, Settings, Sparkles, Zap, Shield, DollarSign } from 'lucide-react';
import { useBasicAuth } from '../../contexts/BasicAuthContext';
import EnhancedHeader from './EnhancedHeader';
import EnhancedDashboard from './EnhancedDashboard';
import GlassCard from '../ui/GlassCard';
import AnimatedButton from '../ui/AnimatedButton';
import StatusBadge from '../ui/StatusBadge';
import FloatingActionButton from '../ui/FloatingActionButton';

// Import existing components
import ConfigurationForm from '../ConfigurationForm';
import TerraformPreview from '../TerraformPreview';
import GitHubIntegration from '../GitHubIntegration';
import WorkflowStatus from '../WorkflowStatus';
import K8sConfigurationForm from '../K8sConfigurationForm';
import K8sManifestPreview from '../K8sManifestPreview';
import K8sGitHubIntegration from '../K8sGitHubIntegration';
import K8sWorkflowStatus from '../K8sWorkflowStatus';
import CIPipelineForm from '../CIPipelineForm';
import CIPipelinePreview from '../CIPipelinePreview';
import CIGitHubIntegration from '../CIGitHubIntegration';
import BasicDeploymentHistory from '../history/BasicDeploymentHistory';
import BasicSavedConfigurations from '../configurations/BasicSavedConfigurations';
import ResourceMonitoring from '../ResourceMonitoring';

// Import enhanced plugins
import PluginManager from '../../plugins/PluginManager';
import EnhancedResourceMonitoring from '../../plugins/EnhancedResourceMonitoring';
import SecurityScanner from '../../plugins/SecurityScanner';
import CostOptimizer from '../../plugins/CostOptimizer';

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
} from '../../utils/storage';
import { saveBasicDeployment, updateBasicDeploymentStatus } from '../../utils/basicDeploymentTracking';

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

type DeploymentMode = 'infrastructure' | 'application';
type InfraTab = 'config' | 'terraform' | 'github' | 'deploy';
type AppTab = 'k8s-config' | 'k8s-manifest' | 'k8s-github' | 'k8s-deploy';
type CITab = 'ci-config' | 'ci-preview' | 'ci-github';
type MainTab = 'dashboard' | 'infrastructure' | 'application' | 'ci-pipeline' | 'resources' | 'history' | 'configurations' | 'plugins' | 'enhanced-monitoring' | 'security' | 'cost-optimizer';

const EnhancedMainApp: React.FC = () => {
  const { user, signOut } = useBasicAuth();
  
  // Load initial state from localStorage
  const initialState = loadAppState();
  
  const [mainTab, setMainTab] = useState<MainTab>('dashboard');
  const [deploymentMode, setDeploymentMode] = useState<DeploymentMode>(initialState.deploymentMode);
  const [activeInfraTab, setActiveInfraTab] = useState<InfraTab>(initialState.activeInfraTab);
  const [activeAppTab, setActiveAppTab] = useState<AppTab>(initialState.activeAppTab);
  const [terraformConfig, setTerraformConfig] = useState<TerraformConfig>(initialState.terraformConfig);
  const [githubConfig, setGithubConfig] = useState<GitHubConfig>(initialState.githubConfig);
  const [k8sConfig, setK8sConfig] = useState<K8sConfig>(initialState.k8sConfig);
  const [k8sGithubConfig, setK8sGithubConfig] = useState<GitHubConfig>(initialState.k8sGithubConfig);
  const [ciConfig, setCiConfig] = useState<CIConfig>(getDefaultCIConfig());
  const [activeCITab, setActiveCITab] = useState<CITab>('ci-config');
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [currentDeploymentId, setCurrentDeploymentId] = useState<string | null>(null);
  const [enabledPlugins, setEnabledPlugins] = useState<string[]>(['enhanced-monitoring', 'security-scanner', 'cost-optimizer']);

  // Enhanced navigation with beautiful icons and descriptions
  const mainTabs = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: Sparkles, 
      description: 'Overview and insights',
      gradient: 'from-blue-500 to-purple-600'
    },
    { 
      id: 'infrastructure', 
      label: 'Infrastructure', 
      icon: Cloud, 
      description: 'GKE clusters and resources',
      gradient: 'from-blue-500 to-cyan-500'
    },
    { 
      id: 'application', 
      label: 'Applications', 
      icon: Layers, 
      description: 'K8s deployments and services',
      gradient: 'from-purple-500 to-pink-500'
    },
    { 
      id: 'ci-pipeline', 
      label: 'CI/CD Pipeline', 
      icon: GitBranch, 
      description: 'Docker builds and registry',
      gradient: 'from-orange-500 to-red-500'
    },
    { 
      id: 'resources', 
      label: 'Resources', 
      icon: Monitor, 
      description: 'Real-time monitoring',
      gradient: 'from-green-500 to-emerald-500'
    },
    { 
      id: 'enhanced-monitoring', 
      label: 'Enhanced Monitoring', 
      icon: Zap, 
      description: 'Advanced metrics and insights',
      gradient: 'from-yellow-500 to-orange-500'
    },
    { 
      id: 'security', 
      label: 'Security', 
      icon: Shield, 
      description: 'Security scanning and compliance',
      gradient: 'from-red-500 to-pink-500'
    },
    { 
      id: 'cost-optimizer', 
      label: 'Cost Optimizer', 
      icon: DollarSign, 
      description: 'Cost analysis and optimization',
      gradient: 'from-green-500 to-teal-500'
    },
    { 
      id: 'history', 
      label: 'History', 
      icon: History, 
      description: 'Deployment history',
      gradient: 'from-gray-500 to-slate-600'
    },
    { 
      id: 'configurations', 
      label: 'Saved Configs', 
      icon: Save, 
      description: 'Saved configurations',
      gradient: 'from-indigo-500 to-blue-600'
    },
    { 
      id: 'plugins', 
      label: 'Plugins', 
      icon: Settings, 
      description: 'Plugin management',
      gradient: 'from-purple-500 to-indigo-600'
    }
  ];

  const infraTabs = [
    { id: 'config', label: 'Configuration', icon: Settings, description: 'Cluster settings' },
    { id: 'terraform', label: 'Terraform Code', icon: Cloud, description: 'Generated IaC' },
    { id: 'github', label: 'GitHub Setup', icon: Settings, description: 'Repository integration' },
    { id: 'deploy', label: 'Deploy', icon: Zap, description: 'Infrastructure deployment' }
  ];

  const appTabs = [
    { id: 'k8s-config', label: 'App Configuration', icon: Settings, description: 'Application settings' },
    { id: 'k8s-manifest', label: 'K8s Manifests', icon: Layers, description: 'Generated manifests' },
    { id: 'k8s-github', label: 'GitHub Setup', icon: Settings, description: 'Repository integration' },
    { id: 'k8s-deploy', label: 'Deploy Apps', icon: Layers, description: 'Application deployment' }
  ];

  const ciTabs = [
    { id: 'ci-config', label: 'CI Configuration', icon: Settings, description: 'Pipeline settings' },
    { id: 'ci-preview', label: 'Pipeline Preview', icon: GitBranch, description: 'Generated workflows' },
    { id: 'ci-github', label: 'GitHub Setup', icon: Settings, description: 'Repository integration' }
  ];

  // Event handlers (keeping existing logic)
  const handleTerraformConfigChange = (config: TerraformConfig) => {
    setTerraformConfig(config);
    saveTerraformConfig(config);
  };

  const handleGithubConfigChange = (config: GitHubConfig) => {
    setGithubConfig(config);
    saveGitHubConfig(config);
  };

  const handleK8sConfigChange = (config: K8sConfig) => {
    setK8sConfig(config);
    saveK8sConfig(config);
  };

  const handleK8sGithubConfigChange = (config: GitHubConfig) => {
    setK8sGithubConfig(config);
  };

  const handleCIConfigChange = (config: CIConfig) => {
    setCiConfig(config);
    // Could save to localStorage here if needed
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
        notes: `${type} deployment started via Enhanced IaC Generator by ${user?.name}`,
      });
      
      setCurrentDeploymentId(deployment.id);
    } catch (error) {
      console.error('Failed to track deployment:', error);
    }
  };

  const handleDeploymentStatusChange = (status: 'idle' | 'deploying' | 'success' | 'error') => {
    setDeploymentStatus(status);
    
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

  const handlePluginToggle = (pluginId: string, enabled: boolean) => {
    if (enabled) {
      setEnabledPlugins(prev => [...prev, pluginId]);
    } else {
      setEnabledPlugins(prev => prev.filter(id => id !== pluginId));
    }
  };

  const availablePlugins = [
    {
      id: 'enhanced-monitoring',
      name: 'Enhanced Resource Monitoring',
      description: 'Advanced monitoring with real-time metrics, cost analysis, and performance insights',
      version: '1.0.0',
      enabled: enabledPlugins.includes('enhanced-monitoring'),
      component: EnhancedResourceMonitoring,
      category: 'monitoring' as const
    },
    {
      id: 'security-scanner',
      name: 'Security Scanner',
      description: 'Comprehensive security assessment and vulnerability scanning',
      version: '1.0.0',
      enabled: enabledPlugins.includes('security-scanner'),
      component: SecurityScanner,
      category: 'security' as const
    },
    {
      id: 'cost-optimizer',
      name: 'Cost Optimizer',
      description: 'Analyze and optimize infrastructure costs with actionable recommendations',
      version: '1.0.0',
      enabled: enabledPlugins.includes('cost-optimizer'),
      component: CostOptimizer,
      category: 'analytics' as const
    }
  ];

  function getDefaultCIConfig(): CIConfig {
    return {
      projectName: 'my-app',
      gitRepo: '',
      branch: 'main',
      buildTriggers: {
        onPush: true,
        onPR: true,
        onTag: true,
        manual: true
      },
      docker: {
        frontend: {
          enabled: true,
          dockerfile: 'frontend/Dockerfile',
          context: './frontend',
          buildArgs: {},
          platforms: ['linux/amd64', 'linux/arm64']
        },
        backend: {
          enabled: true,
          dockerfile: 'backend/Dockerfile',
          context: './backend',
          buildArgs: {},
          platforms: ['linux/amd64', 'linux/arm64']
        }
      },
      registries: [
        {
          type: 'gcr',
          registry: 'gcr.io',
          repository: 'project-id/app-name',
          enabled: true
        }
      ],
      scanning: {
        enabled: true,
        failOnHigh: false,
        failOnCritical: true
      },
      notifications: {}
    };
  }

  const renderMainContent = () => {
    switch (mainTab) {
      case 'dashboard':
        return <EnhancedDashboard />;
      
      case 'infrastructure':
        return (
          <div className="space-y-6">
            {/* Sub Navigation for Infrastructure */}
            <div className="border-b border-white/20">
              <nav className="-mb-px flex space-x-8">
                {infraTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveInfraTab(tab.id as InfraTab)}
                      className={`group flex items-center space-x-3 py-4 px-2 border-b-2 font-medium text-sm transition-all duration-300 ${
                        activeInfraTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                      <div className="text-left">
                        <div>{tab.label}</div>
                        <div className="text-xs text-gray-400">{tab.description}</div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Infrastructure Content */}
            <div className="min-h-[600px]">
              {activeInfraTab === 'config' && (
                <ConfigurationForm
                  config={terraformConfig}
                  onChange={handleTerraformConfigChange}
                  onNext={() => setActiveInfraTab('terraform')}
                />
              )}
              
              {activeInfraTab === 'terraform' && (
                <TerraformPreview
                  config={terraformConfig}
                  onBack={() => setActiveInfraTab('config')}
                  onNext={() => setActiveInfraTab('github')}
                />
              )}
              
              {activeInfraTab === 'github' && (
                <GitHubIntegration
                  config={githubConfig}
                  terraformConfig={terraformConfig}
                  onChange={handleGithubConfigChange}
                  onBack={() => setActiveInfraTab('terraform')}
                  onNext={() => setActiveInfraTab('deploy')}
                />
              )}
              
              {activeInfraTab === 'deploy' && (
                <WorkflowStatus
                  githubConfig={githubConfig}
                  terraformConfig={terraformConfig}
                  status={deploymentStatus}
                  onStatusChange={handleDeploymentStatusChange}
                  onBack={() => setActiveInfraTab('github')}
                  onDeploymentStart={(workflowUrl) => handleDeploymentStart('infrastructure', terraformConfig, `${githubConfig.owner}/${githubConfig.repo}`, workflowUrl)}
                />
              )}
            </div>
          </div>
        );

      case 'application':
        return (
          <div className="space-y-6">
            {/* Sub Navigation for Applications */}
            <div className="border-b border-white/20">
              <nav className="-mb-px flex space-x-8">
                {appTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveAppTab(tab.id as AppTab)}
                      className={`group flex items-center space-x-3 py-4 px-2 border-b-2 font-medium text-sm transition-all duration-300 ${
                        activeAppTab === tab.id
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                      <div className="text-left">
                        <div>{tab.label}</div>
                        <div className="text-xs text-gray-400">{tab.description}</div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Application Content */}
            <div className="min-h-[600px]">
              {activeAppTab === 'k8s-config' && (
                <K8sConfigurationForm
                  config={k8sConfig}
                  onChange={handleK8sConfigChange}
                  onNext={() => setActiveAppTab('k8s-manifest')}
                />
              )}
              
              {activeAppTab === 'k8s-manifest' && (
                <K8sManifestPreview
                  config={k8sConfig}
                  onBack={() => setActiveAppTab('k8s-config')}
                  onNext={() => setActiveAppTab('k8s-github')}
                />
              )}
              
              {activeAppTab === 'k8s-github' && (
                <K8sGitHubIntegration
                  config={k8sGithubConfig}
                  k8sConfig={k8sConfig}
                  onChange={handleK8sGithubConfigChange}
                  onBack={() => setActiveAppTab('k8s-manifest')}
                  onNext={() => setActiveAppTab('k8s-deploy')}
                />
              )}
              
              {activeAppTab === 'k8s-deploy' && (
                <K8sWorkflowStatus
                  githubConfig={k8sGithubConfig}
                  k8sConfig={k8sConfig}
                  status={deploymentStatus}
                  onStatusChange={handleDeploymentStatusChange}
                  onBack={() => setActiveAppTab('k8s-github')}
                  onDeploymentStart={(workflowUrl) => handleDeploymentStart('application', k8sConfig, `${k8sGithubConfig.owner}/${k8sGithubConfig.repo}`, workflowUrl)}
                />
              )}
            </div>
          </div>
        );

      case 'ci-pipeline':
        return (
          <div className="space-y-6">
            {/* Sub Navigation for CI Pipeline */}
            <div className="border-b border-white/20">
              <nav className="-mb-px flex space-x-8">
                {ciTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveCITab(tab.id as CITab)}
                      className={`group flex items-center space-x-3 py-4 px-2 border-b-2 font-medium text-sm transition-all duration-300 ${
                        activeCITab === tab.id
                          ? 'border-orange-500 text-orange-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                      <div className="text-left">
                        <div>{tab.label}</div>
                        <div className="text-xs text-gray-400">{tab.description}</div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* CI Pipeline Content */}
            <div className="min-h-[600px]">
              {activeCITab === 'ci-config' && (
                <CIPipelineForm
                  config={ciConfig}
                  onChange={handleCIConfigChange}
                  onNext={() => setActiveCITab('ci-preview')}
                />
              )}
              
              {activeCITab === 'ci-preview' && (
                <CIPipelinePreview
                  config={ciConfig}
                  onBack={() => setActiveCITab('ci-config')}
                  onNext={() => setActiveCITab('ci-github')}
                />
              )}
              
              {activeCITab === 'ci-github' && (
                <CIGitHubIntegration
                  config={githubConfig}
                  ciConfig={ciConfig}
                  onChange={handleGithubConfigChange}
                  onBack={() => setActiveCITab('ci-preview')}
                  onNext={() => setMainTab('dashboard')}
                />
              )}
            </div>
          </div>
        );

      case 'resources':
        return (
          <ResourceMonitoring
            githubConfig={githubConfig}
            terraformConfig={terraformConfig}
          />
        );

      case 'enhanced-monitoring':
        return enabledPlugins.includes('enhanced-monitoring') ? (
          <EnhancedResourceMonitoring 
            terraformConfig={terraformConfig} 
            githubConfig={githubConfig} 
          />
        ) : (
          <PluginNotEnabled pluginName="Enhanced Resource Monitoring" onEnable={() => setMainTab('plugins')} />
        );

      case 'security':
        return enabledPlugins.includes('security-scanner') ? (
          <SecurityScanner />
        ) : (
          <PluginNotEnabled pluginName="Security Scanner" onEnable={() => setMainTab('plugins')} />
        );

      case 'cost-optimizer':
        return enabledPlugins.includes('cost-optimizer') ? (
          <CostOptimizer />
        ) : (
          <PluginNotEnabled pluginName="Cost Optimizer" onEnable={() => setMainTab('plugins')} />
        );

      case 'history':
        return <BasicDeploymentHistory />;

      case 'configurations':
        return (
          <BasicSavedConfigurations
            onLoadConfiguration={handleLoadConfiguration}
            currentInfraConfig={terraformConfig}
            currentAppConfig={k8sConfig}
          />
        );

      case 'plugins':
        return (
          <PluginManager
            availablePlugins={availablePlugins}
            onPluginToggle={handlePluginToggle}
          />
        );

      default:
        return <EnhancedDashboard />;
    }
  };

  const quickActions = [
    { icon: Cloud, label: 'New Infrastructure', onClick: () => setMainTab('infrastructure') },
    { icon: Layers, label: 'Deploy Application', onClick: () => setMainTab('application') },
    { icon: GitBranch, label: 'Setup CI/CD', onClick: () => setMainTab('ci-pipeline') },
    { icon: Monitor, label: 'View Resources', onClick: () => setMainTab('resources') },
    { icon: Zap, label: 'Enhanced Monitoring', onClick: () => setMainTab('enhanced-monitoring') }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(147, 51, 234, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)`
        }}></div>
      </div>

      {/* Enhanced Header */}
      <EnhancedHeader />

      {/* Main Navigation */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <GlassCard className="p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-4">
            {mainTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = mainTab === tab.id;
              const isEnabled = tab.id === 'plugins' || tab.id === 'dashboard' || 
                              ['infrastructure', 'application', 'resources', 'history', 'configurations'].includes(tab.id) ||
                              enabledPlugins.includes(tab.id);
              
              return (
                <button
                  key={tab.id}
                  onClick={() => isEnabled && setMainTab(tab.id as MainTab)}
                  disabled={!isEnabled}
                  className={`group relative p-4 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                    isActive
                      ? `bg-gradient-to-r ${tab.gradient} text-white shadow-xl`
                      : isEnabled
                      ? 'bg-white/60 hover:bg-white/80 text-gray-700 hover:shadow-lg'
                      : 'bg-gray-100/50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {/* Glow effect for active tab */}
                  {isActive && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${tab.gradient} rounded-2xl blur-xl opacity-30 -z-10`}></div>
                  )}
                  
                  <div className="flex flex-col items-center space-y-2">
                    <Icon className={`h-6 w-6 transition-transform duration-300 ${
                      isActive ? 'scale-110' : 'group-hover:scale-110'
                    }`} />
                    <div className="text-center">
                      <div className="text-sm font-medium">{tab.label}</div>
                      <div className="text-xs opacity-75">{tab.description}</div>
                    </div>
                    
                    {!isEnabled && !['plugins', 'dashboard', 'infrastructure', 'application', 'resources', 'history', 'configurations'].includes(tab.id) && (
                      <StatusBadge status="warning" text="Plugin" size="sm" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <GlassCard className="min-h-[600px]" gradient>
          {renderMainContent()}
        </GlassCard>
      </main>

      {/* Floating Action Button */}
      <FloatingActionButton actions={quickActions} />
    </div>
  );
};

// Plugin Not Enabled Component
const PluginNotEnabled: React.FC<{ pluginName: string; onEnable: () => void }> = ({ pluginName, onEnable }) => (
  <div className="text-center py-20">
    <div className="relative mb-8">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-xl opacity-30"></div>
      <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
        <Settings className="h-12 w-12 text-white" />
      </div>
    </div>
    
    <h3 className="text-2xl font-bold text-gray-900 mb-4">Plugin Not Enabled</h3>
    <p className="text-gray-600 mb-8 max-w-md mx-auto">
      The {pluginName} plugin is not currently enabled. Enable it in the Plugin Manager to access advanced features.
    </p>
    
    <AnimatedButton onClick={onEnable} variant="primary" size="lg" icon={Settings}>
      Go to Plugin Manager
    </AnimatedButton>
  </div>
);

export default EnhancedMainApp;