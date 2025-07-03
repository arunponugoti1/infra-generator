import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, UserProfile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Handle different auth events
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await fetchProfile(session.user.id);
          } else if (event === 'SIGNED_UP') {
            // For new signups, wait a moment for triggers to complete
            setTimeout(() => fetchProfile(session.user.id), 2000);
          }
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, try to create it
          console.log('Profile not found, attempting to create...');
          await createProfileFallback(userId);
        } else {
          console.error('Error fetching profile:', error);
        }
      } else if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProfileFallback = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fullName = user.user_metadata?.full_name || 
                      user.email?.split('@')[0] || 'User';

      // Try using the RPC function first
      const { error: rpcError } = await supabase.rpc('create_user_profile', {
        user_id: userId,
        user_email: user.email || '',
        user_full_name: fullName
      });

      if (rpcError) {
        console.error('RPC profile creation failed:', rpcError);
        
        // Fallback to direct insert
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert([
            {
              id: userId,
              email: user.email || '',
              full_name: fullName,
            }
          ]);

        if (insertError) {
          console.error('Direct profile creation failed:', insertError);
        } else {
          console.log('Profile created successfully via direct insert');
          await fetchProfile(userId);
        }
      } else {
        console.log('Profile created successfully via RPC');
        await fetchProfile(userId);
      }
    } catch (error) {
      console.error('Profile creation fallback failed:', error);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { error: { message: 'Please enter a valid email address' } };
      }

      // Prevent common test emails that Supabase rejects
      const testEmails = ['test@example.com', 'user@example.com', 'admin@example.com', 'demo@example.com'];
      if (testEmails.includes(email.toLowerCase())) {
        return { error: { message: 'Please use a real email address. Test emails like "test@example.com" are not allowed.' } };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) {
        console.error('Signup error:', error);
        
        // Handle specific error cases
        if (error.message.includes('email_address_invalid')) {
          return { error: { message: 'Please enter a valid email address' } };
        }
        if (error.message.includes('weak_password')) {
          return { error: { message: 'Password is too weak. Please choose a stronger password (at least 6 characters).' } };
        }
        if (error.message.includes('over_email_send_rate_limit')) {
          return { error: { message: 'Too many signup attempts. Please wait 60 seconds before trying again.' } };
        }
        if (error.message.includes('User already registered')) {
          return { error: { message: 'An account with this email already exists. Please sign in instead.' } };
        }
        
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Unexpected signup error:', error);
      return { error: { message: 'An unexpected error occurred during signup' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        
        // Handle specific error cases
        if (error.message.includes('email_not_confirmed')) {
          return { error: { message: 'Please check your email and click the confirmation link before signing in. Check your spam folder if needed.' } };
        }
        if (error.message.includes('invalid_credentials') || error.message.includes('Invalid login credentials')) {
          return { error: { message: 'Invalid email or password. Please check your credentials and try again.' } };
        }
        
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Unexpected sign in error:', error);
      return { error: { message: 'An unexpected error occurred during sign in' } };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { error: { message: 'Please enter a valid email address' } };
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Password reset error:', error);
        
        // Handle specific error cases
        if (error.message.includes('email_address_invalid')) {
          return { error: { message: 'Please enter a valid email address' } };
        }
        if (error.message.includes('over_email_send_rate_limit')) {
          return { error: { message: 'Too many password reset attempts. Please wait before trying again.' } };
        }
        
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Unexpected password reset error:', error);
      return { error: { message: 'An unexpected error occurred while sending the password reset email' } };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: { message: 'No user logged in' } };

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (!error) {
        await refreshProfile();
      }

      return { error };
    } catch (error) {
      return { error: { message: 'Failed to update profile' } };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};