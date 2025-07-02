/*
  # Fix User Profiles RLS Policies

  1. Security Updates
    - Update RLS policies for user_profiles table to allow proper user registration
    - Add policy for users to insert their own profile during signup
    - Ensure existing policies work correctly with auth.uid()

  2. Changes
    - Drop existing INSERT policy that may be too restrictive
    - Create new INSERT policy that allows users to create their own profile
    - Verify other policies are working correctly
*/

-- Drop the existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Create a new INSERT policy that allows users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Ensure the SELECT policy exists and is correct
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Ensure the UPDATE policy exists and is correct
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Make sure RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;