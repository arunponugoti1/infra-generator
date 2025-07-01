import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  company?: string;
  role?: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface DeploymentHistory {
  id: string;
  user_id: string;
  deployment_type: 'infrastructure' | 'application';
  project_name: string;
  configuration: any;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  github_repo?: string;
  workflow_url?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
}

export interface SavedConfiguration {
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