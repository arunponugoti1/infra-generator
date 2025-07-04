interface DeploymentRecord {
  id: string;
  user_id: string;
  deployment_type: 'infrastructure' | 'application';
  project_name: string;
  configuration: any;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  github_repo?: string;
  workflow_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface SavedConfig {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  type: 'infrastructure' | 'application';
  configuration: any;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

const DEPLOYMENT_HISTORY_KEY = 'iac-basic-deployment-history';
const SAVED_CONFIGS_KEY = 'iac-basic-saved-configs';

// Helper function to get current user ID
const getCurrentUserId = (): string | null => {
  const storedUser = localStorage.getItem('iac_current_user');
  if (storedUser) {
    try {
      const userData = JSON.parse(storedUser);
      return userData.id;
    } catch (error) {
      return null;
    }
  }
  return null;
};

// Deployment History Functions
export const saveBasicDeployment = (data: Omit<DeploymentRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>): DeploymentRecord => {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User not authenticated');
  }

  try {
    const deployments = getBasicDeploymentHistory();
    const newDeployment: DeploymentRecord = {
      ...data,
      id: generateId(),
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    deployments.unshift(newDeployment); // Add to beginning
    localStorage.setItem(DEPLOYMENT_HISTORY_KEY, JSON.stringify(deployments));
    
    console.log('💾 Deployment saved for user:', userId);
    return newDeployment;
  } catch (error) {
    console.error('❌ Failed to save deployment:', error);
    throw error;
  }
};

export const updateBasicDeploymentStatus = (
  deploymentId: string, 
  status: 'pending' | 'success' | 'failed' | 'cancelled', 
  workflowUrl?: string
): void => {
  const userId = getCurrentUserId();
  if (!userId) return;

  try {
    const deployments = getBasicDeploymentHistory();
    const index = deployments.findIndex(d => d.id === deploymentId && d.user_id === userId);
    
    if (index !== -1) {
      deployments[index].status = status;
      deployments[index].updated_at = new Date().toISOString();
      if (workflowUrl) {
        deployments[index].workflow_url = workflowUrl;
      }
      
      localStorage.setItem(DEPLOYMENT_HISTORY_KEY, JSON.stringify(deployments));
      console.log('📊 Deployment status updated for user:', userId);
    }
  } catch (error) {
    console.error('❌ Failed to update deployment status:', error);
  }
};

export const getBasicDeploymentHistory = (): DeploymentRecord[] => {
  const userId = getCurrentUserId();
  if (!userId) return [];

  try {
    const stored = localStorage.getItem(DEPLOYMENT_HISTORY_KEY);
    const allDeployments: DeploymentRecord[] = stored ? JSON.parse(stored) : [];
    
    // Filter deployments for current user
    return allDeployments.filter(d => d.user_id === userId);
  } catch (error) {
    console.error('❌ Failed to load deployment history:', error);
    return [];
  }
};

export const deleteBasicDeployment = (deploymentId: string): void => {
  const userId = getCurrentUserId();
  if (!userId) return;

  try {
    const stored = localStorage.getItem(DEPLOYMENT_HISTORY_KEY);
    const allDeployments: DeploymentRecord[] = stored ? JSON.parse(stored) : [];
    
    // Remove deployment only if it belongs to current user
    const filtered = allDeployments.filter(d => !(d.id === deploymentId && d.user_id === userId));
    localStorage.setItem(DEPLOYMENT_HISTORY_KEY, JSON.stringify(filtered));
    console.log('🗑️ Deployment deleted for user:', userId);
  } catch (error) {
    console.error('❌ Failed to delete deployment:', error);
  }
};

// Saved Configurations Functions
export const saveBasicConfiguration = (data: Omit<SavedConfig, 'id' | 'user_id' | 'created_at' | 'updated_at'>): SavedConfig => {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User not authenticated');
  }

  try {
    const configs = getBasicSavedConfigurations();
    const newConfig: SavedConfig = {
      ...data,
      id: generateId(),
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    configs.unshift(newConfig); // Add to beginning
    localStorage.setItem(SAVED_CONFIGS_KEY, JSON.stringify(configs));
    
    console.log('💾 Configuration saved for user:', userId);
    return newConfig;
  } catch (error) {
    console.error('❌ Failed to save configuration:', error);
    throw error;
  }
};

export const getBasicSavedConfigurations = (): SavedConfig[] => {
  const userId = getCurrentUserId();
  if (!userId) return [];

  try {
    const stored = localStorage.getItem(SAVED_CONFIGS_KEY);
    const allConfigs: SavedConfig[] = stored ? JSON.parse(stored) : [];
    
    // Filter configurations for current user and public templates
    return allConfigs.filter(c => c.user_id === userId || c.is_template);
  } catch (error) {
    console.error('❌ Failed to load saved configurations:', error);
    return [];
  }
};

export const deleteBasicConfiguration = (configId: string): void => {
  const userId = getCurrentUserId();
  if (!userId) return;

  try {
    const stored = localStorage.getItem(SAVED_CONFIGS_KEY);
    const allConfigs: SavedConfig[] = stored ? JSON.parse(stored) : [];
    
    // Remove configuration only if it belongs to current user
    const filtered = allConfigs.filter(c => !(c.id === configId && c.user_id === userId));
    localStorage.setItem(SAVED_CONFIGS_KEY, JSON.stringify(filtered));
    console.log('🗑️ Configuration deleted for user:', userId);
  } catch (error) {
    console.error('❌ Failed to delete configuration:', error);
  }
};

// Utility Functions
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const clearBasicUserData = (): void => {
  const userId = getCurrentUserId();
  if (!userId) return;

  try {
    // Clear user's deployments
    const deployments = JSON.parse(localStorage.getItem(DEPLOYMENT_HISTORY_KEY) || '[]');
    const filteredDeployments = deployments.filter((d: DeploymentRecord) => d.user_id !== userId);
    localStorage.setItem(DEPLOYMENT_HISTORY_KEY, JSON.stringify(filteredDeployments));

    // Clear user's configurations
    const configs = JSON.parse(localStorage.getItem(SAVED_CONFIGS_KEY) || '[]');
    const filteredConfigs = configs.filter((c: SavedConfig) => c.user_id !== userId);
    localStorage.setItem(SAVED_CONFIGS_KEY, JSON.stringify(filteredConfigs));

    console.log('🗑️ User data cleared for:', userId);
  } catch (error) {
    console.error('❌ Failed to clear user data:', error);
  }
};

export const exportBasicUserData = (): string => {
  const userId = getCurrentUserId();
  if (!userId) return '{}';

  try {
    const data = {
      deployments: getBasicDeploymentHistory(),
      configurations: getBasicSavedConfigurations(),
      exported_at: new Date().toISOString(),
      user_id: userId,
    };
    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('❌ Failed to export user data:', error);
    return '{}';
  }
};