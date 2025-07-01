import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface DeploymentData {
  deployment_type: 'infrastructure' | 'application';
  project_name: string;
  configuration: any;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  github_repo?: string;
  workflow_url?: string;
  notes?: string;
}

export const useDeploymentTracking = () => {
  const { user } = useAuth();

  const saveDeployment = async (data: DeploymentData) => {
    if (!user) {
      console.error('No user logged in');
      return { error: 'No user logged in' };
    }

    try {
      const { data: deployment, error } = await supabase
        .from('deployment_history')
        .insert([
          {
            user_id: user.id,
            ...data,
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error saving deployment:', error);
        return { error };
      }

      return { deployment, error: null };
    } catch (error) {
      console.error('Error saving deployment:', error);
      return { error };
    }
  };

  const updateDeploymentStatus = async (deploymentId: string, status: 'pending' | 'success' | 'failed' | 'cancelled', workflowUrl?: string) => {
    if (!user) {
      console.error('No user logged in');
      return { error: 'No user logged in' };
    }

    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (workflowUrl) {
        updateData.workflow_url = workflowUrl;
      }

      const { error } = await supabase
        .from('deployment_history')
        .update(updateData)
        .eq('id', deploymentId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating deployment status:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Error updating deployment status:', error);
      return { error };
    }
  };

  const getDeploymentHistory = async () => {
    if (!user) {
      return { deployments: [], error: 'No user logged in' };
    }

    try {
      const { data, error } = await supabase
        .from('deployment_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching deployment history:', error);
        return { deployments: [], error };
      }

      return { deployments: data || [], error: null };
    } catch (error) {
      console.error('Error fetching deployment history:', error);
      return { deployments: [], error };
    }
  };

  return {
    saveDeployment,
    updateDeploymentStatus,
    getDeploymentHistory,
  };
};