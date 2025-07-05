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

export const generateTerraformFiles = (config: TerraformConfig) => {
  const backendTf = `terraform {
  backend "gcs" {
    bucket = "terraform-statefile-bucket-tf2"
    prefix = "terraform/state/gke-cluster"
  }
}`;

  const mainTf = `terraform {
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

  const variablesTf = `variable "project_id" {
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

  const outputsTf = `output "cluster_name" {
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

  const terraformTfvars = `project_id = "${config.projectId}"
cluster_name = "${config.clusterName}"
region = "${config.region}"
node_count = 2
machine_type = "${config.machineType}"
disk_size = ${config.diskSize}
service_account_email = "githubactions-sa@turnkey-guild-441104-f3.iam.gserviceaccount.com"`;

  const workflowYml = `name: Terraform GKE Operations

on:
  workflow_dispatch:
    inputs:
      terraform_action:
        description: 'Terraform Action'
        required: true
        default: 'plan'
        type: choice
        options:
          - plan
          - apply
          - destroy
          - show-state
      project_id:
        description: 'GCP Project ID'
        required: true
        default: '${config.projectId}'
      cluster_name:
        description: 'GKE Cluster Name'
        required: true
        default: '${config.clusterName}'
      region:
        description: 'GCP Region'
        required: true
        default: '${config.region}'
      node_count:
        description: 'Number of nodes'
        required: true
        default: '2'
      machine_type:
        description: 'Machine type'
        required: true
        default: '${config.machineType}'
      disk_size:
        description: 'Disk size in GB'
        required: true
        default: '${config.diskSize}'

env:
  TF_VAR_project_id: \${{ github.event.inputs.project_id }}
  TF_VAR_cluster_name: \${{ github.event.inputs.cluster_name }}
  TF_VAR_region: \${{ github.event.inputs.region }}
  TF_VAR_node_count: \${{ github.event.inputs.node_count }}
  TF_VAR_machine_type: \${{ github.event.inputs.machine_type }}
  TF_VAR_disk_size: \${{ github.event.inputs.disk_size }}
  TF_VAR_service_account_email: "githubactions-sa@turnkey-guild-441104-f3.iam.gserviceaccount.com"

jobs:
  terraform:
    name: 'Terraform \${{ github.event.inputs.terraform_action }}'
    runs-on: ubuntu-latest
    
    defaults:
      run:
        shell: bash
        working-directory: ./terraform

    steps:
    - name: Checkout Repository
      uses: actions/checkout@v4

    - name: Setup Terraform
      uses: hashicorp/setup-terraform@v3
      with:
        terraform_version: 1.5.0

    - name: Authenticate to Google Cloud
      uses: google-github-actions/auth@v2
      with:
        credentials_json: \${{ secrets.GCP_SA_KEY }}

    - name: Set up Cloud SDK
      uses: google-github-actions/setup-gcloud@v2

    - name: Verify Authentication and Project Access
      run: |
        echo "🔐 Verifying authentication..."
        gcloud auth list
        echo ""
        echo "📋 Checking project access for: \${{ github.event.inputs.project_id }}"
        gcloud projects describe \${{ github.event.inputs.project_id }} || {
          echo "❌ ERROR: Cannot access project \${{ github.event.inputs.project_id }}"
          echo "🔧 SOLUTION: Ensure the service account has the following roles on project \${{ github.event.inputs.project_id }}:"
          echo "   • Kubernetes Engine Admin (roles/container.admin)"
          echo "   • Compute Admin (roles/compute.admin)" 
          echo "   • Service Account User (roles/iam.serviceAccountUser)"
          echo "   • Project IAM Admin (if creating service accounts)"
          echo ""
          echo "📋 Run these commands in Google Cloud Console:"
          echo "gcloud projects add-iam-policy-binding \${{ github.event.inputs.project_id }} \\\\"
          echo "  --member='serviceAccount:githubactions-sa@turnkey-guild-441104-f3.iam.gserviceaccount.com' \\\\"
          echo "  --role='roles/container.admin'"
          echo ""
          echo "gcloud projects add-iam-policy-binding \${{ github.event.inputs.project_id }} \\\\"
          echo "  --member='serviceAccount:githubactions-sa@turnkey-guild-441104-f3.iam.gserviceaccount.com' \\\\"
          echo "  --role='roles/compute.admin'"
          echo ""
          echo "gcloud projects add-iam-policy-binding \${{ github.event.inputs.project_id }} \\\\"
          echo "  --member='serviceAccount:githubactions-sa@turnkey-guild-441104-f3.iam.gserviceaccount.com' \\\\"
          echo "  --role='roles/iam.serviceAccountUser'"
          exit 1
        }
        echo "✅ Project access verified"

    - name: Check Required APIs
      run: |
        echo "🔌 Checking required APIs..."
        gcloud services list --enabled --project=\${{ github.event.inputs.project_id }} --filter="name:container.googleapis.com OR name:compute.googleapis.com" --format="value(name)" > enabled_apis.txt
        
        if ! grep -q "container.googleapis.com" enabled_apis.txt; then
          echo "❌ Kubernetes Engine API is not enabled"
          echo "🔧 Enable it with: gcloud services enable container.googleapis.com --project=\${{ github.event.inputs.project_id }}"
          exit 1
        fi
        
        if ! grep -q "compute.googleapis.com" enabled_apis.txt; then
          echo "❌ Compute Engine API is not enabled"  
          echo "🔧 Enable it with: gcloud services enable compute.googleapis.com --project=\${{ github.event.inputs.project_id }}"
          exit 1
        fi
        
        echo "✅ Required APIs are enabled"

    - name: Verify Service Account Configuration
      run: |
        echo "🔧 Service Account Configuration:"
        echo "📧 Using: githubactions-sa@turnkey-guild-441104-f3.iam.gserviceaccount.com"
        echo "🎯 Target Project: \${{ github.event.inputs.project_id }}"
        echo "⚠️  Cross-project service account usage - ensure proper IAM bindings"
        echo ""
        echo "🔍 Checking if service account has required permissions..."
        gcloud projects get-iam-policy \${{ github.event.inputs.project_id }} \
          --flatten="bindings[].members" \
          --format="table(bindings.role)" \
          --filter="bindings.members:githubactions-sa@turnkey-guild-441104-f3.iam.gserviceaccount.com" || {
          echo "⚠️ Could not verify service account permissions"
          echo "🔧 Ensure the service account has the required roles listed above"
        }

    - name: Check Regional Quotas and Resources
      run: |
        echo "📊 Checking regional quotas for \${{ github.event.inputs.region }}..."
        gcloud compute regions describe \${{ github.event.inputs.region }} --project=\${{ github.event.inputs.project_id }} || {
          echo "❌ Cannot access region \${{ github.event.inputs.region }}"
          exit 1
        }
        echo "💾 Using pd-standard disks to avoid SSD quota issues"
        echo "🌐 Target zones: \${{ github.event.inputs.region }}-a, \${{ github.event.inputs.region }}-c"
        echo "🔧 Service Account: githubactions-sa@turnkey-guild-441104-f3.iam.gserviceaccount.com"
        echo "⚡ Simplified configuration for faster creation"
        echo "✅ Region and quota check completed"

    - name: Terraform Format Check
      id: fmt
      run: |
        echo "🎨 Checking Terraform formatting..."
        terraform fmt -check
      continue-on-error: true

    - name: Terraform Init
      id: init
      run: |
        echo "🚀 Initializing Terraform with remote state backend..."
        terraform init
        echo "✅ Terraform initialized successfully"
        echo "📦 Backend: GCS bucket terraform-statefile-bucket-tf2"
        echo "📁 State prefix: terraform/state/gke-cluster"

    - name: Terraform Validate
      id: validate
      run: |
        echo "✅ Validating Terraform configuration..."
        terraform validate -no-color
        echo "✅ Configuration is valid"

    # SHOW STATE OPERATION (for resource monitoring)
    - name: Show Terraform State
      id: show_state
      if: github.event.inputs.terraform_action == 'show-state'
      run: |
        echo "📊 Retrieving current Terraform state..."
        terraform show -json > terraform-state.json
        echo "✅ State retrieved successfully"
        echo ""
        echo "📋 CURRENT INFRASTRUCTURE STATE:"
        echo "================================"
        
        # Show resources summary
        echo "🏗️ MANAGED RESOURCES:"
        terraform state list || echo "No resources found in state"
        echo ""
        
        # Show outputs if any
        echo "📤 TERRAFORM OUTPUTS:"
        terraform output -json || echo "No outputs defined"
        echo ""
        
        # Show resource details
        echo "📊 RESOURCE DETAILS:"
        terraform show || echo "No resources to show"
        echo ""
        
        # List GCP resources directly
        echo "☁️ GCP RESOURCES IN PROJECT \${{ github.event.inputs.project_id }}:"
        echo "GKE Clusters:"
        gcloud container clusters list --project=\${{ github.event.inputs.project_id }} --format="table(name,location,status,currentMasterVersion,currentNodeVersion,numNodes)" || echo "No GKE clusters found"
        echo ""
        echo "Compute Instances:"
        gcloud compute instances list --project=\${{ github.event.inputs.project_id }} --format="table(name,zone,machineType,status,internalIP,externalIP)" || echo "No compute instances found"
        echo ""
        echo "Networks:"
        gcloud compute networks list --project=\${{ github.event.inputs.project_id }} --format="table(name,subnet_mode,bgp_routing_mode,firewall_rules.len():label=FIREWALL_RULES_COUNT)" || echo "No networks found"
        echo ""
        echo "Subnets:"
        gcloud compute networks subnets list --project=\${{ github.event.inputs.project_id }} --format="table(name,region,network,range)" || echo "No subnets found"

    # PLAN OPERATION
    - name: Terraform Plan
      id: plan
      if: github.event.inputs.terraform_action == 'plan' || github.event.inputs.terraform_action == 'apply'
      run: |
        echo "📋 Creating Terraform plan..."
        terraform plan -no-color -input=false -out=tfplan
        echo "✅ Plan created successfully"
        echo ""
        echo "📊 SIMPLIFIED PLAN SUMMARY:"
        echo "🎯 Target: GKE cluster '\${{ github.event.inputs.cluster_name }}'"
        echo "📍 Region: \${{ github.event.inputs.region }}"
        echo "🌐 Zones: \${{ github.event.inputs.region }}-a, \${{ github.event.inputs.region }}-c"
        echo "🖥️ Machine Type: \${{ github.event.inputs.machine_type }}"
        echo "💾 Disk Type: pd-standard (avoids SSD quota issues)"
        echo "🔐 Service Account: githubactions-sa@turnkey-guild-441104-f3.iam.gserviceaccount.com"
        echo "🗑️ Deletion Protection: disabled"
        echo "📊 Fixed Nodes: \${{ github.event.inputs.node_count }}"
        echo "⚡ Optimized: Removed complex features for faster creation"
      continue-on-error: false

    # APPLY OPERATION
    - name: Terraform Apply
      id: apply
      if: github.event.inputs.terraform_action == 'apply'
      run: |
        echo "🚀 Applying simplified Terraform configuration..."
        terraform apply -auto-approve -input=false tfplan
        echo "✅ Apply completed successfully"
        echo ""
        echo "🎉 SIMPLIFIED INFRASTRUCTURE CREATED:"
        echo "✅ GKE cluster '\${{ github.event.inputs.cluster_name }}' is now running"
        echo "📍 Location: \${{ github.event.inputs.region }}"
        echo "🌐 Zones: \${{ github.event.inputs.region }}-a, \${{ github.event.inputs.region }}-c"
        echo "🔐 Service Account: githubactions-sa@turnkey-guild-441104-f3.iam.gserviceaccount.com"
        echo "📊 Nodes: \${{ github.event.inputs.node_count }} (fixed count)"
        echo "💾 State stored in: terraform-statefile-bucket-tf2/terraform/state/gke-cluster"
        echo "⚡ Fast creation with minimal configuration"

    # DESTROY OPERATIONS
    - name: Terraform Destroy Plan
      id: destroy_plan
      if: github.event.inputs.terraform_action == 'destroy'
      run: |
        echo "🗑️ Creating destruction plan..."
        terraform plan -destroy -no-color -input=false -out=destroy-plan
        echo "✅ Destroy plan created successfully"
        echo ""
        echo "⚠️ DESTRUCTION PLAN SUMMARY:"
        echo "🗑️ Will destroy: GKE cluster '\${{ github.event.inputs.cluster_name }}'"
        echo "📍 Region: \${{ github.event.inputs.region }}"
        echo "🌐 Zones: \${{ github.event.inputs.region }}-a, \${{ github.event.inputs.region }}-c"
        echo "💾 State will be updated in: terraform-statefile-bucket-tf2"
        echo "⚠️ This action cannot be undone!"
      continue-on-error: false

    - name: Terraform Destroy
      id: destroy
      if: github.event.inputs.terraform_action == 'destroy'
      run: |
        echo "🗑️ Destroying infrastructure..."
        terraform apply -auto-approve -input=false destroy-plan
        echo "✅ Destroy completed successfully"
        echo ""
        echo "🗑️ INFRASTRUCTURE DESTROYED:"
        echo "✅ GKE cluster '\${{ github.event.inputs.cluster_name }}' has been removed"
        echo "✅ All node pools and associated resources cleaned up"
        echo "✅ Zones \${{ github.event.inputs.region }}-a, \${{ github.event.inputs.region }}-c are now clean"
        echo "💾 Remote state updated in: terraform-statefile-bucket-tf2"
        echo "💰 All resources have been cleaned up to avoid charges"

    # FINAL SUMMARY
    - name: Operation Summary
      if: always()
      run: |
        echo ""
        echo "📊 TERRAFORM OPERATION SUMMARY"
        echo "================================"
        echo "🎯 Action: \${{ github.event.inputs.terraform_action }}"
        echo "📍 Project: \${{ github.event.inputs.project_id }}"
        echo "🏷️ Cluster: \${{ github.event.inputs.cluster_name }}"
        echo "🌍 Region: \${{ github.event.inputs.region }}"
        echo "🔧 Nodes: \${{ github.event.inputs.node_count }} (fixed count)"
        echo "🔐 Service Account: githubactions-sa@turnkey-guild-441104-f3.iam.gserviceaccount.com"
        echo "💾 Backend: GCS (terraform-statefile-bucket-tf2)"
        echo "⚡ Configuration: Simplified for fast creation"
        echo ""
        
        if [ "\${{ github.event.inputs.terraform_action }}" = "apply" ] && [ "\${{ steps.apply.outcome }}" = "success" ]; then
          echo "🎉 SUCCESS: Simplified infrastructure has been created!"
          echo "🔧 Next step: Configure kubectl to connect to your cluster"
          echo "📋 Command: gcloud container clusters get-credentials \${{ github.event.inputs.cluster_name }} --region \${{ github.event.inputs.region }} --project \${{ github.event.inputs.project_id }}"
        elif [ "\${{ github.event.inputs.terraform_action }}" = "destroy" ] && [ "\${{ steps.destroy.outcome }}" = "success" ]; then
          echo "🗑️ SUCCESS: Infrastructure has been destroyed!"
          echo "💰 All resources cleaned up to avoid charges"
          echo "🔄 You can now create new infrastructure with different configuration"
        elif [ "\${{ github.event.inputs.terraform_action }}" = "plan" ] && [ "\${{ steps.plan.outcome }}" = "success" ]; then
          echo "📋 SUCCESS: Plan has been generated!"
          echo "👀 Review the plan output above"
          echo "🚀 If everything looks good, run 'apply' to create the infrastructure"
        elif [ "\${{ github.event.inputs.terraform_action }}" = "show-state" ] && [ "\${{ steps.show_state.outcome }}" = "success" ]; then
          echo "📊 SUCCESS: Current infrastructure state has been retrieved!"
          echo "👀 Review the state and resource details above"
          echo "🔄 State is synced with remote backend: terraform-statefile-bucket-tf2"
        else
          echo "❌ Operation completed with issues - check the logs above"
        fi
        
        echo ""
        echo "🔗 Workflow URL: \${{ github.server_url }}/\${{ github.repository }}/actions/runs/\${{ github.run_id }}"`;

  return [
    { path: 'terraform/backend.tf', content: backendTf },
    { path: 'terraform/main.tf', content: mainTf },
    { path: 'terraform/variables.tf', content: variablesTf },
    { path: 'terraform/outputs.tf', content: outputsTf },
    { path: 'terraform/terraform.tfvars', content: terraformTfvars },
    { path: '.github/workflows/deploy.yml', content: workflowYml },
  ];
};