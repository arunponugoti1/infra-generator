import React from 'react';
import { ArrowLeft, ArrowRight, Copy, Download } from 'lucide-react';

interface TerraformConfig {
  projectId: string;
  clusterName: string;
  region: string;
  nodeCount: number;
  machineType: string;
  diskSize: number;
  enableAutoscaling: boolean;
  minNodes: number;
  maxNodes: number;
}

interface TerraformPreviewProps {
  config: TerraformConfig;
  onBack: () => void;
  onNext: () => void;
}

const TerraformPreview: React.FC<TerraformPreviewProps> = ({ config, onBack, onNext }) => {
  const generateBackendTf = () => {
    return `terraform {
  backend "gcs" {
    bucket = "terraform-statefile-bucket-tf2"
    prefix = "terraform/state/gke-cluster"
  }
}`;
  };

  const generateMainTf = () => {
    return `terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Define local values for zones (a and c)
locals {
  node_zones = [
    "\${var.region}-a",
    "\${var.region}-c"
  ]
}

# Create the GKE cluster with minimal configuration for fast creation
resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.region

  # Allow deletion without protection
  deletion_protection = false

  # Specify node locations (zones) for the cluster
  node_locations = local.node_zones

  # We can't create a cluster with no node pool defined, but we want to only use
  # separately managed node pools. So we create the smallest possible default
  # node pool and immediately delete it.
  remove_default_node_pool = true
  initial_node_count       = 1

  network    = "default"
  subnetwork = "default"

  # CRITICAL: Specify service account for the cluster's default node pool
  # Even though we remove it, we need to specify the SA to avoid using default
  node_config {
    service_account = var.service_account_email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
}

# Create the node pool with explicit service account and simplified configuration
resource "google_container_node_pool" "primary_nodes" {
  name       = "\${var.cluster_name}-node-pool"
  location   = var.region
  cluster    = google_container_cluster.primary.name
  node_count = var.node_count  # Fixed count, no autoscaling complexity

  # Specify node locations (zones) for the node pool
  node_locations = local.node_zones

  node_config {
    preemptible  = false
    machine_type = var.machine_type
    disk_size_gb = var.disk_size
    disk_type    = "pd-standard"

    # CRITICAL: Use the GitHub Actions service account for node pool
    service_account = var.service_account_email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    labels = {
      env = "production"
    }

    tags = ["gke-node", "\${var.cluster_name}-node"]

    metadata = {
      disable-legacy-endpoints = "true"
    }
  }
}`;
  };

  const generateVariablesTf = () => {
    return `variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "cluster_name" {
  description = "The name of the GKE cluster"
  type        = string
  default     = "${config.clusterName}"
}

variable "region" {
  description = "The GCP region for the cluster"
  type        = string
  default     = "${config.region}"
}

variable "node_count" {
  description = "Number of nodes in the node pool"
  type        = number
  default     = 2
}

variable "machine_type" {
  description = "Machine type for the nodes"
  type        = string
  default     = "${config.machineType}"
}

variable "disk_size" {
  description = "Disk size in GB for each node"
  type        = number
  default     = ${config.diskSize}
}

variable "service_account_email" {
  description = "Service account email for GKE cluster and nodes"
  type        = string
  default     = "githubactions-sa@turnkey-guild-441104-f3.iam.gserviceaccount.com"
}`;
  };

  const generateOutputsTf = () => {
    return `output "cluster_name" {
  description = "GKE cluster name"
  value       = google_container_cluster.primary.name
}

output "cluster_endpoint" {
  description = "GKE cluster endpoint"
  value       = google_container_cluster.primary.endpoint
  sensitive   = true
}

output "cluster_location" {
  description = "GKE cluster location"
  value       = google_container_cluster.primary.location
}

output "cluster_ca_certificate" {
  description = "GKE cluster CA certificate"
  value       = google_container_cluster.primary.master_auth.0.cluster_ca_certificate
  sensitive   = true
}

output "node_pool_name" {
  description = "GKE node pool name"
  value       = google_container_node_pool.primary_nodes.name
}

output "service_account_email" {
  description = "Service account email used by cluster and nodes"
  value       = var.service_account_email
}

output "node_zones" {
  description = "Node zones for the cluster"
  value       = local.node_zones
}

output "deletion_protection" {
  description = "Deletion protection status"
  value       = google_container_cluster.primary.deletion_protection
}`;
  };

  const generateTerraformTfvars = () => {
    return `project_id = "${config.projectId}"
cluster_name = "${config.clusterName}"
region = "${config.region}"
node_count = 2
machine_type = "${config.machineType}"
disk_size = ${config.diskSize}
service_account_email = "githubactions-sa@turnkey-guild-441104-f3.iam.gserviceaccount.com"`;
  };

  const files = [
    { name: 'backend.tf', content: generateBackendTf() },
    { name: 'main.tf', content: generateMainTf() },
    { name: 'variables.tf', content: generateVariablesTf() },
    { name: 'outputs.tf', content: generateOutputsTf() },
    { name: 'terraform.tfvars', content: generateTerraformTfvars() }
  ];

  const [activeFile, setActiveFile] = React.useState(0);

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Generated Terraform Code</h2>
        <p className="text-gray-600">Simplified configuration for fast GKE cluster creation</p>
      </div>

      {/* File Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          {files.map((file, index) => (
            <button
              key={file.name}
              onClick={() => setActiveFile(index)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeFile === index
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {file.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Code Preview */}
      <div className="relative">
        <div className="absolute top-2 right-2 flex space-x-2 z-10">
          <button
            onClick={() => copyToClipboard(files[activeFile].content)}
            className="p-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
            title="Copy to clipboard"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={() => downloadFile(files[activeFile].name, files[activeFile].content)}
            className="p-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
            title="Download file"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
        
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
          <code>{files[activeFile].content}</code>
        </pre>
      </div>

      {/* Configuration Summary */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Infrastructure Configuration */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Simplified Infrastructure Configuration</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700 font-medium">Project:</span>
              <p className="text-blue-900">{config.projectId}</p>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Cluster:</span>
              <p className="text-blue-900">{config.clusterName}</p>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Region:</span>
              <p className="text-blue-900">{config.region}</p>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Zones:</span>
              <p className="text-blue-900">{config.region}-a, {config.region}-c</p>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Nodes:</span>
              <p className="text-blue-900">2 (fixed count)</p>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Machine Type:</span>
              <p className="text-blue-900">{config.machineType}</p>
            </div>
          </div>
        </div>

        {/* Service Account & State Configuration */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">Service Account & Backend</h3>
          <div className="text-sm space-y-2">
            <div>
              <span className="text-green-700 font-medium">Service Account:</span>
              <p className="text-green-900 font-mono text-xs">githubactions-sa@turnkey-guild-441104-f3.iam.gserviceaccount.com</p>
              <p className="text-green-700 text-xs">Used for BOTH cluster and node pool</p>
            </div>
            <div>
              <span className="text-green-700 font-medium">Backend:</span>
              <p className="text-green-900">Google Cloud Storage</p>
            </div>
            <div>
              <span className="text-green-700 font-medium">State Bucket:</span>
              <p className="text-green-900 font-mono text-xs">terraform-statefile-bucket-tf2</p>
            </div>
            <div>
              <span className="text-green-700 font-medium">State Prefix:</span>
              <p className="text-green-900 font-mono text-xs">terraform/state/gke-cluster</p>
            </div>
          </div>
        </div>
      </div>

      {/* Optimizations Applied */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-900 mb-2">⚡ Performance Optimizations Applied</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-800">
          <ul className="space-y-1">
            <li>✅ <strong>Removed:</strong> network_policy (faster creation)</li>
            <li>✅ <strong>Removed:</strong> ip_allocation_policy (faster creation)</li>
            <li>✅ <strong>Removed:</strong> workload_identity_config (faster creation)</li>
            <li>✅ <strong>Removed:</strong> custom logging/monitoring (uses defaults)</li>
          </ul>
          <ul className="space-y-1">
            <li>✅ <strong>Removed:</strong> management block (auto-repair/upgrade)</li>
            <li>✅ <strong>Removed:</strong> autoscaling complexity</li>
            <li>✅ <strong>Fixed:</strong> node_count = 2 (simple configuration)</li>
            <li>✅ Service account for BOTH cluster and nodes</li>
          </ul>
        </div>
      </div>

      {/* Service Account Fix Notice */}
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="font-semibold text-green-900 mb-2">🚀 Simplified & Optimized Configuration</h3>
        <div className="text-sm text-green-800">
          <p className="mb-2">
            <strong>Faster Creation:</strong> Removed complex features that slow down cluster provisioning
          </p>
          <p className="mb-2">
            <strong>Fixed Node Count:</strong> Always creates exactly 2 nodes (no autoscaling complexity)
          </p>
          <p className="mb-2">
            <strong>Service Account:</strong> Uses <code className="bg-green-100 px-1 rounded">githubactions-sa@turnkey-guild-441104-f3.iam.gserviceaccount.com</code> for both cluster and nodes
          </p>
          <p className="mb-2">
            <strong>Minimal Configuration:</strong> Only essential settings for a working GKE cluster
          </p>
          <p>
            <strong>Result:</strong> Much faster cluster creation with reliable service account configuration
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Configuration</span>
        </button>
        
        <button
          onClick={onNext}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <span>Setup GitHub Integration</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default TerraformPreview;