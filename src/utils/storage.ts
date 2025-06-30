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

type DeploymentMode = 'infrastructure' | 'application';
type InfraTab = 'config' | 'terraform' | 'github' | 'deploy';
type AppTab = 'k8s-config' | 'k8s-manifest' | 'k8s-github' | 'k8s-deploy';

interface AppState {
  terraformConfig: TerraformConfig;
  githubConfig: GitHubConfig;
  k8sConfig: K8sConfig;
  k8sGithubConfig: GitHubConfig;
  deploymentMode: DeploymentMode;
  activeInfraTab: InfraTab;
  activeAppTab: AppTab;
  lastSaved: string;
}

const STORAGE_KEY = 'iac-generator-state';

export const defaultTerraformConfig: TerraformConfig = {
  projectId: '',
  clusterName: 'my-gke-cluster',
  region: 'us-central1',
  nodeCount: 2, // Fixed to 2 for simplified configuration
  machineType: 'e2-medium',
  diskSize: 100,
  enableAutoscaling: false,
  minNodes: 1,
  maxNodes: 5
};

export const defaultGitHubConfig: GitHubConfig = {
  token: '',
  owner: '',
  repo: ''
};

export const defaultK8sConfig: K8sConfig = {
  projectId: '',
  clusterName: 'my-gke-cluster',
  region: 'us-central1',
  zone: 'us-central1-a',
  namespace: 'default',
  manifests: []
};

export const saveAppState = (state: Partial<AppState>): void => {
  try {
    const existingState = loadAppState();
    const newState: AppState = {
      ...existingState,
      ...state,
      lastSaved: new Date().toISOString()
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    console.log('💾 App state saved to localStorage');
  } catch (error) {
    console.error('❌ Failed to save app state:', error);
  }
};

export const loadAppState = (): AppState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('📂 App state loaded from localStorage');
      return {
        terraformConfig: { ...defaultTerraformConfig, ...parsed.terraformConfig },
        githubConfig: { ...defaultGitHubConfig, ...parsed.githubConfig },
        k8sConfig: { ...defaultK8sConfig, ...parsed.k8sConfig },
        k8sGithubConfig: { ...defaultGitHubConfig, ...parsed.k8sGithubConfig },
        deploymentMode: parsed.deploymentMode || 'infrastructure',
        activeInfraTab: parsed.activeInfraTab || 'config',
        activeAppTab: parsed.activeAppTab || 'k8s-config',
        lastSaved: parsed.lastSaved || new Date().toISOString()
      };
    }
  } catch (error) {
    console.error('❌ Failed to load app state:', error);
  }
  
  // Return default state if nothing stored or error occurred
  return {
    terraformConfig: defaultTerraformConfig,
    githubConfig: defaultGitHubConfig,
    k8sConfig: defaultK8sConfig,
    k8sGithubConfig: defaultGitHubConfig,
    deploymentMode: 'infrastructure',
    activeInfraTab: 'config',
    activeAppTab: 'k8s-config',
    lastSaved: new Date().toISOString()
  };
};

export const clearAppState = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ App state cleared from localStorage');
  } catch (error) {
    console.error('❌ Failed to clear app state:', error);
  }
};

export const saveTerraformConfig = (config: TerraformConfig): void => {
  saveAppState({ terraformConfig: config });
};

export const saveGitHubConfig = (config: GitHubConfig): void => {
  saveAppState({ githubConfig: config });
};

export const saveK8sConfig = (config: K8sConfig): void => {
  saveAppState({ k8sConfig: config });
};

export const saveK8sGitHubConfig = (config: GitHubConfig): void => {
  saveAppState({ k8sGithubConfig: config });
};

export const saveDeploymentMode = (mode: DeploymentMode): void => {
  saveAppState({ deploymentMode: mode });
};

export const saveActiveTab = (infraTab: InfraTab, appTab: AppTab): void => {
  saveAppState({ activeInfraTab: infraTab, activeAppTab: appTab });
};

export const getLastSavedTime = (): string | null => {
  const state = loadAppState();
  return state.lastSaved;
};

export const exportConfiguration = (): string => {
  const state = loadAppState();
  return JSON.stringify(state, null, 2);
};

export const importConfiguration = (jsonString: string): boolean => {
  try {
    const imported = JSON.parse(jsonString);
    saveAppState(imported);
    return true;
  } catch (error) {
    console.error('❌ Failed to import configuration:', error);
    return false;
  }
};