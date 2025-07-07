import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Scan } from 'lucide-react';

const SecurityScanner: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<any>(null);

  const securityChecks = [
    {
      category: 'Network Security',
      checks: [
        { name: 'Firewall Rules', status: 'pass', description: 'Proper ingress/egress rules configured' },
        { name: 'Network Policies', status: 'warning', description: 'Consider enabling network policies' },
        { name: 'Private Cluster', status: 'fail', description: 'Cluster nodes are publicly accessible' }
      ]
    },
    {
      category: 'Access Control',
      checks: [
        { name: 'RBAC Enabled', status: 'pass', description: 'Role-based access control is active' },
        { name: 'Service Accounts', status: 'pass', description: 'Proper service account configuration' },
        { name: 'Pod Security', status: 'warning', description: 'Pod security standards not enforced' }
      ]
    },
    {
      category: 'Data Protection',
      checks: [
        { name: 'Encryption at Rest', status: 'pass', description: 'Disk encryption enabled' },
        { name: 'Secrets Management', status: 'warning', description: 'Some secrets stored in plain text' },
        { name: 'Backup Strategy', status: 'fail', description: 'No automated backup configured' }
      ]
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Shield className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'fail':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const runSecurityScan = () => {
    setScanning(true);
    // Simulate security scan
    setTimeout(() => {
      setScanning(false);
      setResults(securityChecks);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Security Scanner</h2>
          <p className="text-gray-600">Comprehensive security assessment for your infrastructure</p>
        </div>
        
        <button
          onClick={runSecurityScan}
          disabled={scanning}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
            scanning
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          <Scan className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Scanning...' : 'Run Security Scan'}</span>
        </button>
      </div>

      {scanning && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <Scan className="h-6 w-6 text-blue-600 animate-spin" />
            <div>
              <h3 className="font-medium text-blue-900">Security Scan in Progress</h3>
              <p className="text-blue-700">Analyzing your infrastructure for security vulnerabilities...</p>
            </div>
          </div>
        </div>
      )}

      {results && (
        <div className="space-y-6">
          {/* Security Score */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Score</h3>
            <div className="flex items-center space-x-4">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeDasharray="75, 100"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-900">75%</span>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-900">Good Security Posture</h4>
                <p className="text-gray-600">Your infrastructure has good security practices with some areas for improvement.</p>
              </div>
            </div>
          </div>

          {/* Security Checks */}
          {results.map((category: any, index: number) => (
            <div key={index} className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{category.category}</h3>
              <div className="space-y-3">
                {category.checks.map((check: any, checkIndex: number) => (
                  <div key={checkIndex} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                    {getStatusIcon(check.status)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">{check.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(check.status)}`}>
                          {check.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{check.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SecurityScanner;