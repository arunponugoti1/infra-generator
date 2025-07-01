/*
  # User Management System

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text)
      - `company` (text, optional)
      - `role` (text, optional)
      - `phone` (text, optional)
      - `avatar_url` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `deployment_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `deployment_type` (text, infrastructure or application)
      - `project_name` (text)
      - `configuration` (jsonb)
      - `status` (text, pending/success/failed/cancelled)
      - `github_repo` (text, optional)
      - `workflow_url` (text, optional)
      - `notes` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `saved_configurations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `name` (text)
      - `description` (text, optional)
      - `type` (text, infrastructure or application)
      - `configuration` (jsonb)
      - `is_template` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for reading public templates
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  company text,
  role text,
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create deployment_history table
CREATE TABLE IF NOT EXISTS deployment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  deployment_type text NOT NULL CHECK (deployment_type IN ('infrastructure', 'application')),
  project_name text NOT NULL,
  configuration jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
  github_repo text,
  workflow_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create saved_configurations table
CREATE TABLE IF NOT EXISTS saved_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('infrastructure', 'application')),
  configuration jsonb NOT NULL,
  is_template boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policies for deployment_history
CREATE POLICY "Users can read own deployment history"
  ON deployment_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deployment history"
  ON deployment_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deployment history"
  ON deployment_history
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own deployment history"
  ON deployment_history
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for saved_configurations
CREATE POLICY "Users can read own configurations"
  ON saved_configurations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read public templates"
  ON saved_configurations
  FOR SELECT
  TO authenticated
  USING (is_template = true);

CREATE POLICY "Users can insert own configurations"
  ON saved_configurations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own configurations"
  ON saved_configurations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own configurations"
  ON saved_configurations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deployment_history_user_id ON deployment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_deployment_history_created_at ON deployment_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployment_history_status ON deployment_history(status);
CREATE INDEX IF NOT EXISTS idx_deployment_history_type ON deployment_history(deployment_type);

CREATE INDEX IF NOT EXISTS idx_saved_configurations_user_id ON saved_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_configurations_type ON saved_configurations(type);
CREATE INDEX IF NOT EXISTS idx_saved_configurations_is_template ON saved_configurations(is_template);
CREATE INDEX IF NOT EXISTS idx_saved_configurations_created_at ON saved_configurations(created_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deployment_history_updated_at
  BEFORE UPDATE ON deployment_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_configurations_updated_at
  BEFORE UPDATE ON saved_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();