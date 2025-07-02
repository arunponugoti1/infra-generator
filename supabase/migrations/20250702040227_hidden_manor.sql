/*
  # Fix RLS policies for user_profiles table

  1. Security Updates
    - Drop existing problematic policies
    - Create new policies that properly handle user profile creation and access
    - Ensure authenticated users can create and manage their own profiles
    - Fix the policy logic to work with Supabase auth.uid()

  2. Policy Changes
    - Allow users to insert their own profile during signup
    - Allow users to read their own profile data
    - Allow users to update their own profile information
    - Maintain security by preventing access to other users' data
*/

-- Drop existing policies to recreate them with correct logic
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create new policies with proper auth.uid() handling
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled (should already be enabled based on schema)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;