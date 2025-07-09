import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle, Info, Clock, RotateCcw } from 'lucide-react';
import { useBasicAuth } from '../../contexts/BasicAuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'signin' }) => {
  const { setUser } = useBasicAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setError('');
    setSuccess('');
    setShowPassword(false);
  };

  const handleClose = () => {
    resetForm();
    setMode(initialMode);
    onClose();
  };

  // Simple hash function for password (basic security)
  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt123'); // Simple salt
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Generate simple user ID
  const generateUserId = (): string => {
    return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // Store user in localStorage (simulating database)
  const storeUser = (user: any, passwordHash: string): void => {
    const users = JSON.parse(localStorage.getItem('iac_users') || '[]');
    const userWithAuth = { ...user, passwordHash };
    users.push(userWithAuth);
    localStorage.setItem('iac_users', JSON.stringify(users));
  };

  // Get user from localStorage
  const getUser = (email: string): any => {
    const users = JSON.parse(localStorage.getItem('iac_users') || '[]');
    return users.find((u: any) => u.email === email);
  };

  // Store current session
  const storeSession = (user: any): void => {
    localStorage.setItem('iac_current_user', JSON.stringify(user));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'reset') {
        // Simulate password reset
        setSuccess('Password reset email sent! Please check your inbox and follow the instructions to reset your password.');
        setLoading(false);
        return;
      }

      if (mode === 'signup') {
        // Sign Up
        if (!fullName.trim()) {
          setError('Full name is required');
          setLoading(false);
          return;
        }

        // Check if user already exists
        const existingUser = getUser(email);
        if (existingUser) {
          setError('User with this email already exists');
          setLoading(false);
          return;
        }

        // Create new user
        const passwordHash = await hashPassword(password);
        const newUser = {
          id: generateUserId(),
          email,
          name: fullName,
          created_at: new Date().toISOString()
        };

        storeUser(newUser, passwordHash);
        storeSession(newUser);
        setUser(newUser);
        setSuccess('Account created successfully!');
        
        // Close modal after success
        setTimeout(() => {
          handleClose();
        }, 1000);

      } else {
        // Sign In
        const user = getUser(email);
        if (!user) {
          setError('User not found. Please sign up first.');
          setLoading(false);
          return;
        }

        // Verify password
        const passwordHash = await hashPassword(password);
        if (user.passwordHash !== passwordHash) {
          setError('Invalid password');
          setLoading(false);
          return;
        }

        // Remove password hash before storing session
        const { passwordHash: _, ...userWithoutPassword } = user;
        storeSession(userWithoutPassword);
        setUser(userWithoutPassword);
        setSuccess('Signed in successfully!');
        
        // Close modal after success
        setTimeout(() => {
          handleClose();
        }, 1000);
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const switchMode = (newMode: 'signin' | 'signup' | 'reset') => {
    setMode(newMode);
    setError('');
    setSuccess('');
  };

  if (!isOpen) return null;

  const getTitle = () => {
    switch (mode) {
      case 'signup': return 'Create Account';
      case 'reset': return 'Reset Password';
      default: return 'Welcome Back';
    }
  };

  const getSubmitText = () => {
    if (loading) {
      switch (mode) {
        case 'signup': return 'Creating Account...';
        case 'reset': return 'Sending Reset Email...';
        default: return 'Signing In...';
      }
    }
    
    switch (mode) {
      case 'signup': return 'Create Account';
      case 'reset': return 'Send Reset Email';
      default: return 'Sign In';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {getTitle()}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Sign in to deploy infrastructure and save configurations
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Deployment Info */}
          <div className="flex items-start space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">Authentication Required for Deployment</p>
              <p>You need to sign in to deploy infrastructure, save configurations, and track deployment history.</p>
            </div>
          </div>

          {/* Full Name (Sign Up only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          {/* Password (not shown for reset) */}
          {mode !== 'reset' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {mode === 'signup' && (
                <p className="text-xs text-gray-500 mt-1">
                  Password must be at least 6 characters long
                </p>
              )}
            </div>
          )}

          {/* Forgot Password Link (Sign In only) */}
          {mode === 'signin' && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => switchMode('reset')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Forgot your password?
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-start space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>{getSubmitText()}</span>
              </div>
            ) : (
              getSubmitText()
            )}
          </button>

          {/* Switch Mode */}
          {!success && (
            <div className="text-center pt-4 border-t border-gray-200">
              {mode === 'reset' ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Remember your password?
                    <button
                      type="button"
                      onClick={() => switchMode('signin')}
                      className="ml-1 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Sign In
                    </button>
                  </p>
                  <p className="text-sm text-gray-600">
                    Don't have an account?
                    <button
                      type="button"
                      onClick={() => switchMode('signup')}
                      className="ml-1 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Sign Up
                    </button>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
                  <button
                    type="button"
                    onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                    className="ml-1 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AuthModal;