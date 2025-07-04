import React, { useState, useEffect } from 'react';
import { Clock, GitBranch, CheckCircle, XCircle, AlertCircle, ExternalLink, Filter, Search, Trash2, Download, User } from 'lucide-react';
import { useBasicAuth } from '../../contexts/BasicAuthContext';
import { 
  getBasicDeploymentHistory, 
  deleteBasicDeployment, 
  exportBasicUserData 
} from '../../utils/basicDeploymentTracking';

interface DeploymentRecord {
  id: string;
  user_id: string;
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

const BasicDeploymentHistory: React.FC = () => {
  const { user } = useBasicAuth();
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'infrastructure' | 'application'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDeployments();
  }, [user]);

  const loadDeployments = () => {
    const history = getBasicDeploymentHistory();
    setDeployments(history);
  };

  const handleDelete = (deploymentId: string) => {
    if (confirm('Are you sure you want to delete this deployment record?')) {
      deleteBasicDeployment(deploymentId);
      loadDeployments();
    }
  };

  const handleExport = () => {
    const data = exportBasicUserData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${user?.name || 'user'}-deployment-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredDeployments = deployments.filter(deployment => {
    const matchesType = filter === 'all' || deployment.deployment_type === filter;
    const matchesStatus = statusFilter === 'all' || deployment.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      deployment.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (deployment.github_repo && deployment.github_repo.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesType && matchesStatus && matchesSearch;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'infrastructure' 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-purple-100 text-purple-800';
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
        <p className="text-gray-600">Please sign in to view your deployment history.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Deployment History</h2>
          <p className="text-gray-600">Welcome back, <strong>{user.name}</strong>! Track all your infrastructure and application deployments</p>
        </div>
        
        {/* Export Button */}
        <button
          onClick={handleExport}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Export Data</span>
        </button>
      </div>

      {/* User Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-full">
            <User className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900">{user.name}</h4>
            <p className="text-sm text-blue-700">{user.email}</p>
            <p className="text-xs text-blue-600">Member since {new Date(user.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by project name or repository..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="application">Application</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Deployment List */}
      {filteredDeployments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Deployments Found</h3>
          <p className="text-gray-600">
            {deployments.length === 0 
              ? "You haven't created any deployments yet. Start by creating your first infrastructure or application deployment."
              : "No deployments match your current filters. Try adjusting your search criteria."
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDeployments.map((deployment) => (
            <div key={deployment.id} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{deployment.project_name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(deployment.deployment_type)}`}>
                      {deployment.deployment_type}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deployment.status)}`}>
                      {deployment.status}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(deployment.created_at).toLocaleString()}</span>
                    </div>
                    {deployment.github_repo && (
                      <div className="flex items-center space-x-1">
                        <GitBranch className="h-4 w-4" />
                        <span>{deployment.github_repo}</span>
                      </div>
                    )}
                  </div>

                  {deployment.notes && (
                    <p className="text-sm text-gray-700 mb-3">{deployment.notes}</p>
                  )}

                  {/* Configuration Preview */}
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Configuration</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {deployment.deployment_type === 'infrastructure' ? (
                        <>
                          <div>
                            <span className="text-gray-500">Project:</span>
                            <p className="font-medium">{deployment.configuration?.projectId || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Cluster:</span>
                            <p className="font-medium">{deployment.configuration?.clusterName || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Region:</span>
                            <p className="font-medium">{deployment.configuration?.region || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Machine:</span>
                            <p className="font-medium">{deployment.configuration?.machineType || 'N/A'}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="text-gray-500">Namespace:</span>
                            <p className="font-medium">{deployment.configuration?.namespace || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Manifests:</span>
                            <p className="font-medium">{deployment.configuration?.manifests?.filter((m: any) => m.enabled).length || 0}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Cluster:</span>
                            <p className="font-medium">{deployment.configuration?.clusterName || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Zone:</span>
                            <p className="font-medium">{deployment.configuration?.zone || 'N/A'}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {getStatusIcon(deployment.status)}
                  {deployment.workflow_url && (
                    <a
                      href={deployment.workflow_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="View workflow"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(deployment.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete deployment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Storage Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-900 mb-2">💾 Personal Data Storage</h4>
        <div className="text-sm text-green-800">
          <p>• Your deployment history is stored securely in your browser</p>
          <p>• Data is isolated per user account for privacy</p>
          <p>• Export your data anytime for backup or sharing</p>
          <p>• Total deployments: <strong>{deployments.length}</strong></p>
        </div>
      </div>
    </div>
  );
};

export default BasicDeploymentHistory;