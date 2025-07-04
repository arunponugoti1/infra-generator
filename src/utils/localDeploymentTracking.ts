interface DeploymentRecord {
  id: string;
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
  name: string;
  description?: string;
  type: 'infrastructure' | 'application';
  configuration: any;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

const DEPLOYMENT_HISTORY_KEY = 'iac-generator-deployment-history';
const SAVED_CONFIGS_KEY = 'iac-generator-saved-configs';

// Deployment History Functions
export const saveDeployment = (data: Omit<DeploymentRecord, 'id' | 'created_at' | 'updated_at'>): DeploymentRecord => {
  try {
    const deployments = getDeploymentHistory();
    const newDeployment: DeploymentRecord = {
      ...data,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    deployments.unshift(newDeployment); // Add to beginning
    localStorage.setItem(DEPLOYMENT_HISTORY_KEY, JSON.stringify(deployments));
    
    console.log('💾 Deployment saved to local storage');
    return newDeployment;
  } catch (error) {
    console.error('❌ Failed to save deployment:', error);
    throw error;
  }
};

export const updateDeploymentStatus = (
  deploymentId: string, 
  status: 'pending' | 'success' | 'failed' | 'cancelled', 
  workflowUrl?: string
): void => {
  try {
    const deployments = getDeploymentHistory();
    const index = deployments.findIndex(d => d.id === deploymentId);
    
    if (index !== -1) {
      deployments[index].status = status;
      deployments[index].updated_at = new Date().toISOString();
      if (workflowUrl) {
        deployments[index].workflow_url = workflowUrl;
      }
      
      localStorage.setItem(DEPLOYMENT_HISTORY_KEY, JSON.stringify(deployments));
      console.log('📊 Deployment status updated');
    }
  } catch (error) {
    console.error('❌ Failed to update deployment status:', error);
  }
};

export const getDeploymentHistory = (): DeploymentRecord[] => {
  try {
    const stored = localStorage.getItem(DEPLOYMENT_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('❌ Failed to load deployment history:', error);
    return [];
  }
};

export const deleteDeployment = (deploymentId: string): void => {
  try {
    const deployments = getDeploymentHistory();
    const filtered = deployments.filter(d => d.id !== deploymentId);
    localStorage.setItem(DEPLOYMENT_HISTORY_KEY, JSON.stringify(filtered));
    console.log('🗑️ Deployment deleted');
  } catch (error) {
    console.error('❌ Failed to delete deployment:', error);
  }
};

// Saved Configurations Functions
export const saveConfiguration = (data: Omit<SavedConfig, 'id' | 'created_at' | 'updated_at'>): SavedConfig => {
  try {
    const configs = getSavedConfigurations();
    const newConfig: SavedConfig = {
      ...data,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    configs.unshift(newConfig); // Add to beginning
    localStorage.setItem(SAVED_CONFIGS_KEY, JSON.stringify(configs));
    
    console.log('💾 Configuration saved to local storage');
    return newConfig;
  } catch (error) {
    console.error('❌ Failed to save configuration:', error);
    throw error;
  }
};

export const updateConfiguration = (configId: string, updates: Partial<SavedConfig>): void => {
  try {
    const configs = getSavedConfigurations();
    const index = configs.findIndex(c => c.id === configId);
    
    if (index !== -1) {
      configs[index] = {
        ...configs[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      localStorage.setItem(SAVED_CONFIGS_KEY, JSON.stringify(configs));
      console.log('📝 Configuration updated');
    }
  } catch (error) {
    console.error('❌ Failed to update configuration:', error);
  }
};

export const getSavedConfigurations = (): SavedConfig[] => {
  try {
    const stored = localStorage.getItem(SAVED_CONFIGS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('❌ Failed to load saved configurations:', error);
    return [];
  }
};

export const deleteConfiguration = (configId: string): void => {
  try {
    const configs = getSavedConfigurations();
    const filtered = configs.filter(c => c.id !== configId);
    localStorage.setItem(SAVED_CONFIGS_KEY, JSON.stringify(filtered));
    console.log('🗑️ Configuration deleted');
  } catch (error) {
    console.error('❌ Failed to delete configuration:', error);
  }
};

export const loadConfiguration = (configId: string): SavedConfig | null => {
  try {
    const configs = getSavedConfigurations();
    return configs.find(c => c.id === configId) || null;
  } catch (error) {
    console.error('❌ Failed to load configuration:', error);
    return null;
  }
};

// Utility Functions
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const clearAllData = (): void => {
  try {
    localStorage.removeItem(DEPLOYMENT_HISTORY_KEY);
    localStorage.removeItem(SAVED_CONFIGS_KEY);
    console.log('🗑️ All deployment data cleared');
  } catch (error) {
    console.error('❌ Failed to clear data:', error);
  }
};

export const exportAllData = (): string => {
  try {
    const data = {
      deployments: getDeploymentHistory(),
      configurations: getSavedConfigurations(),
      exported_at: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('❌ Failed to export data:', error);
    return '{}';
  }
};

export const importAllData = (jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString);
    
    if (data.deployments && Array.isArray(data.deployments)) {
      localStorage.setItem(DEPLOYMENT_HISTORY_KEY, JSON.stringify(data.deployments));
    }
    
    if (data.configurations && Array.isArray(data.configurations)) {
      localStorage.setItem(SAVED_CONFIGS_KEY, JSON.stringify(data.configurations));
    }
    
    console.log('📥 Data imported successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to import data:', error);
    return false;
  }
};