import React, { useState, useEffect } from 'react';
import { BasicAuthProvider, useBasicAuth } from './contexts/BasicAuthContext';
import BasicAuth from './components/auth/BasicAuth';
import EnhancedMainApp from './components/enhanced/EnhancedMainApp';

interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

const App: React.FC = () => {
  return (
    <BasicAuthProvider>
      <AuthWrapper />
    </BasicAuthProvider>
  );
};

const AuthWrapper: React.FC = () => {
  const { user, loading } = useBasicAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
            <div className="relative bg-gradient-to-r from-blue-500 to-purple-500 p-6 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          </div>
          <p className="text-gray-600 text-lg">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <BasicAuth onAuthSuccess={() => {}} />;
  }

  return <EnhancedMainApp />;
};

export default App;