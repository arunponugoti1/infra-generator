import React, { useState, useEffect } from 'react';
import { RefreshCw, Cloud, Network, Database, Shield, Settings, ExternalLink, Eye, AlertCircle, CheckCircle, Clock, Server, HardDrive, Cpu, Globe, Play, FileText } from 'lucide-react';
import { GitHubService } from '../utils/githubApi';

interface TerraformResource {
  address: string;
  mode: string;
  type: string;
  name: string;
  provider_name: string;
  schema_version: number;
  values: any;
  depends_on?: string[];
}

interface TerraformState {
  version: number;
  terraform_version: string;
  serial: number;
  lineage: string;
  outputs: any;
  resources: TerraformResource[];
}

interface ResourceMonitoringProps {
  githubConfig: {
    token: string;
    owner: string;
    repo: string;
  };
  terraformConfig: {
    projectId: string;
    clusterName: string;
    region: string;
  };
}

const ResourceMonitoring: React.FC<ResourceMonitoringProps> = ({ githubConfig, terraformConfig }) => {
  const [state, setState] = useState<TerraformState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [workflowRunning, setWorkflowRunning] = useState(false);
  const [workflowUrl, setWorkflowUrl] = useState<string>('');

  const githubService = new GitHubService(githubConfig.token);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadSimulatedState();
      }, 30000); // Refresh every 30 seconds
      setRefreshInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh]);

  const loadSimulatedState = () => {
    setLoading(true);
    setError('');

    try {
      // Generate simulated state based on configuration
      const simulatedState = generateSimulatedState();
      setState(simulatedState);
      setLastUpdated(new Date());
    } catch (error) {
      setError(`Failed to load state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const triggerPlanWorkflow = async () => {
    if (!githubConfig.token || !githubConfig.owner || !githubConfig.repo) {
      setError('GitHub configuration is incomplete');
      return;
    }

    setWorkflowRunning(true);
    setError('');

    try {
      // Trigger a plan workflow to check current infrastructure
      const result = await githubService.triggerWorkflow(
        githubConfig.owner,
        githubConfig.repo,
        'deploy.yml',
        {
          terraform_action: 'plan',
          project_id: terraformConfig.projectId,
          cluster_name: terraformConfig.clusterName,
          region: terraformConfig.region,
          node_count: '2',
          machine_type: 'e2-medium',
          disk_size: '100'
        }
      );

      // Set the workflow URL for user to check
      const workflowUrl = `https://github.com/${githubConfig.owner}/${githubConfig.repo}/actions`;
      setWorkflowUrl(workflowUrl);

      // Load simulated state immediately for demo purposes
      loadSimulatedState();

    } catch (error) {
      setError(`Failed to trigger workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setWorkflowRunning(false);
    }
  };

  const generateSimulatedState = (): TerraformState => {
    return {
      version: 4,
      terraform_version: "1.5.0",
      serial: 1,
      lineage: "abc123-def456-ghi789",
      outputs: {
        cluster_name: {
          value: terraformConfig.clusterName,
          type: "string"
        },
        cluster_endpoint: {
          value: `https://${terraformConfig.clusterName}-endpoint.googleapis.com`,
          type: "string",
          sensitive: true
        },
        cluster_location: {
          value: terraformConfig.region,
          type: "string"
        }
      },
      resources: [
        {
          address: "google_container_cluster.primary",
          mode: "managed",
          type: "google_container_cluster",
          name: "primary",
          provider_name: "registry.terraform.io/hashicorp/google",
          schema_version: 1,
          values: {
            name: terraformConfig.clusterName,
            location: terraformConfig.region,
            project: terraformConfig.projectId,
            network: "default",
            subnetwork: "default",
            node_locations: [`${terraformConfig.region}-a`, `${terraformConfig.region}-c`],
            initial_node_count: 1,
            remove_default_node_pool: true,
            deletion_protection: false,
            endpoint: `https://${terraformConfig.clusterName}-endpoint.googleapis.com`,
            master_version: "1.28.3-gke.1286000",
            current_master_version: "1.28.3-gke.1286000",
            status: "RUNNING"
          }
        },
        {
          address: "google_container_node_pool.primary_nodes",
          mode: "managed",
          type: "google_container_node_pool",
          name: "primary_nodes",
          provider_name: "registry.terraform.io/hashicorp/google",
          schema_version: 1,
          values: {
            name: `${terraformConfig.clusterName}-node-pool`,
            location: terraformConfig.region,
            cluster: terraformConfig.clusterName,
            project: terraformConfig.projectId,
            node_count: 2,
            node_locations: [`${terraformConfig.region}-a`, `${terraformConfig.region}-c`],
            node_config: {
              machine_type: "e2-medium",
              disk_size_gb: 100,
              disk_type: "pd-standard",
              service_account: "githubactions-sa@turnkey-guild-441104-f3.iam.gserviceaccount.com",
              oauth_scopes: ["https://www.googleapis.com/auth/cloud-platform"]
            },
            status: "RUNNING"
          }
        },
        // Simulated VPC and network resources that GKE uses
        {
          address: "data.google_compute_network.default",
          mode: "data",
          type: "google_compute_network",
          name: "default",
          provider_name: "registry.terraform.io/hashicorp/google",
          schema_version: 0,
          values: {
            name: "default",
            project: terraformConfig.projectId,
            self_link: `https://www.googleapis.com/compute/v1/projects/${terraformConfig.projectId}/global/networks/default`,
            auto_create_subnetworks: true,
            routing_mode: "REGIONAL"
          }
        },
        {
          address: "data.google_compute_subnetwork.default",
          mode: "data",
          type: "google_compute_subnetwork",
          name: "default",
          provider_name: "registry.terraform.io/hashicorp/google",
          schema_version: 0,
          values: {
            name: "default",
            project: terraformConfig.projectId,
            region: terraformConfig.region,
            network: "default",
            ip_cidr_range: "10.128.0.0/20",
            self_link: `https://www.googleapis.com/compute/v1/projects/${terraformConfig.projectId}/regions/${terraformConfig.region}/subnetworks/default`
          }
        }
      ]
    };
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'google_container_cluster':
        return <Cloud className="h-5 w-5 text-blue-600" />;
      case 'google_container_node_pool':
        return <Server className="h-5 w-5 text-green-600" />;
      case 'google_compute_network':
        return <Network className="h-5 w-5 text-purple-600" />;
      case 'google_compute_subnetwork':
        return <Globe className="h-5 w-5 text-indigo-600" />;
      case 'google_compute_instance':
        return <Cpu className="h-5 w-5 text-orange-600" />;
      case 'google_compute_disk':
        return <HardDrive className="h-5 w-5 text-gray-600" />;
      default:
        return <Settings className="h-5 w-5 text-gray-500" />;
    }
  };

  const getResourceStatus = (resource: TerraformResource) => {
    const status = resource.values?.status || 'UNKNOWN';
    switch (status.toLowerCase()) {
      case 'running':
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
      case 'creating':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'error':
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Settings className="h-4 w-4 text-gray-500" />;
    }
  };

  const getResourceTypeColor = (type: string) => {
    switch (type) {
      case 'google_container_cluster':
        return 'bg-blue-100 text-blue-800';
      case 'google_container_node_pool':
        return 'bg-green-100 text-green-800';
      case 'google_compute_network':
        return 'bg-purple-100 text-purple-800';
      case 'google_compute_subnetwork':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatResourceValue = (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value);
  };

  const getImportantFields = (resource: TerraformResource) => {
    const type = resource.type;
    const values = resource.values || {};

    switch (type) {
      case 'google_container_cluster':
        return {
          'Name': values.name,
          'Location': values.location,
          'Status': values.status,
          'Endpoint': values.endpoint,
          'Master Version': values.master_version,
          'Network': values.network,
          'Subnetwork': values.subnetwork,
          'Node Locations': values.node_locations
        };
      case 'google_container_node_pool':
        return {
          'Name': values.name,
          'Cluster': values.cluster,
          'Node Count': values.node_count,
          'Machine Type': values.node_config?.machine_type,
          'Disk Size': `${values.node_config?.disk_size_gb}GB`,
          'Disk Type': values.node_config?.disk_type,
          'Status': values.status
        };
      case 'google_compute_network':
        return {
          'Name': values.name,
          'Auto Create Subnets': values.auto_create_subnetworks,
          'Routing Mode': values.routing_mode,
          'Self Link': values.self_link
        };
      case 'google_compute_subnetwork':
        return {
          'Name': values.name,
          'Region': values.region,
          'CIDR Range': values.ip_cidr_range,
          'Network': values.network
        };
      default:
        return Object.keys(values).slice(0, 6).reduce((acc, key) => {
          acc[key] = values[key];
          return acc;
        }, {} as Record<string, any>);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Infrastructure Resources</h2>
          <p className="text-gray-600">View your Terraform-managed GCP resources</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Auto-refresh toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="autoRefresh" className="text-sm text-gray-700">
              Auto-refresh (30s)
            </label>
          </div>
          
          {/* Load state button */}
          <button
            onClick={loadSimulatedState}
            disabled={loading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
              loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Loading...' : 'Load State'}</span>
          </button>

          {/* Trigger plan workflow button */}
          <button
            onClick={triggerPlanWorkflow}
            disabled={workflowRunning || !githubConfig.token}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
              workflowRunning || !githubConfig.token
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <Play className={`h-4 w-4 ${workflowRunning ? 'animate-spin' : ''}`} />
            <span>{workflowRunning ? 'Running Plan...' : 'Run Plan'}</span>
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${state ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium text-gray-700">
                {state ? 'State Loaded' : 'No State Data'}
              </span>
            </div>
            
            {lastUpdated && (
              <div className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}

            {workflowUrl && (
              <a
                href={workflowUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-3 w-3" />
                <span>View Workflows</span>
              </a>
            )}
          </div>
          
          {state && (
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Terraform v{state.terraform_version}</span>
              <span>Serial: {state.serial}</span>
              <span>Resources: {state.resources.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Workflow Status */}
      {workflowRunning && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Play className="h-5 w-5 text-blue-600 animate-spin" />
            <div>
              <p className="text-blue-700 font-medium">Terraform Plan Workflow Running</p>
              <p className="text-blue-600 text-sm">Check the GitHub Actions tab for real-time progress and detailed logs.</p>
            </div>
          </div>
        </div>
      )}

      {/* Resources Grid */}
      {state && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {state.resources.map((resource, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              {/* Resource Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getResourceIcon(resource.type)}
                  <div>
                    <h3 className="font-semibold text-gray-900">{resource.name}</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getResourceTypeColor(resource.type)}`}>
                      {resource.type}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getResourceStatus(resource)}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    resource.mode === 'managed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {resource.mode}
                  </span>
                </div>
              </div>

              {/* Resource Details */}
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Address:</span>
                  <span className="ml-2 font-mono text-gray-600">{resource.address}</span>
                </div>

                {/* Important Fields */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Key Properties</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(getImportantFields(resource)).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-gray-600 font-medium">{key}:</span>
                        <span className="text-gray-900 font-mono max-w-xs truncate" title={String(value)}>
                          {formatResourceValue(key, value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dependencies */}
                {resource.depends_on && resource.depends_on.length > 0 && (
                  <div className="text-xs">
                    <span className="font-medium text-gray-700">Depends on:</span>
                    <div className="mt-1 space-y-1">
                      {resource.depends_on.map((dep, depIndex) => (
                        <span key={depIndex} className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-mono mr-1">
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
                  <button className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800">
                    <Eye className="h-3 w-3" />
                    <span>View Details</span>
                  </button>
                  
                  {resource.values?.self_link && (
                    <a
                      href={resource.values.self_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 text-xs text-green-600 hover:text-green-800"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>GCP Console</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Outputs Section */}
      {state && state.outputs && Object.keys(state.outputs).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Terraform Outputs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(state.outputs).map(([key, output]: [string, any]) => (
              <div key={key} className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm font-medium text-gray-900 mb-1">{key}</div>
                <div className="text-xs text-gray-600 font-mono">
                  {output.sensitive ? '***SENSITIVE***' : String(output.value)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Type: {output.type}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!state && !loading && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Cloud className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Infrastructure State</h3>
          <p className="text-gray-600 mb-4">
            Click "Load State" to view your infrastructure resources, or "Run Plan" to check your actual infrastructure.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={loadSimulatedState}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span>Load Demo State</span>
            </button>
            <button
              onClick={triggerPlanWorkflow}
              disabled={!githubConfig.token}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                githubConfig.token
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Play className="h-4 w-4" />
              <span>Run Real Plan</span>
            </button>
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">📊 Resource Monitoring</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• <strong>Load State:</strong> Shows a demo view of your expected infrastructure resources</p>
          <p>• <strong>Run Plan:</strong> Triggers a real Terraform plan workflow on GitHub Actions</p>
          <p>• <strong>Auto-refresh:</strong> Automatically updates the demo state every 30 seconds</p>
          <p>• <strong>GitHub Integration:</strong> View actual workflow runs and logs in your repository</p>
          <p>• <strong>State Backend:</strong> terraform-statefile-bucket-tf2/terraform/state/gke-cluster</p>
        </div>
      </div>
    </div>
  );
};

export default ResourceMonitoring;