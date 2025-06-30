interface ManifestConfig {
  type: 'frontend' | 'backend' | 'secrets' | 'ingress' | 'db-init-job';
  enabled: boolean;
  config: Record<string, any>;
}

interface K8sConfig {
  projectId: string;
  clusterName: string;
  region: string;
  zone: string;
  namespace: string;
  manifests: ManifestConfig[];
}

// Browser-compatible base64 encoding function
const encodeToBase64 = (str: string): string => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = '';
  const len = data.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
};

export const generateK8sFiles = (config: K8sConfig) => {
  const files: { path: string; content: string }[] = [];

  // Always create namespace
  const namespace = `apiVersion: v1
kind: Namespace
metadata:
  name: ${config.namespace}
  labels:
    managed-by: iac-generator`;
  
  files.push({ path: 'k8s/namespace.yaml', content: namespace });

  // Generate manifests based on selected types
  config.manifests.filter(m => m.enabled).forEach(manifest => {
    switch (manifest.type) {
      case 'frontend':
        files.push(...generateFrontendManifests(manifest, config.namespace));
        break;
      case 'backend':
        files.push(...generateBackendManifests(manifest, config.namespace));
        break;
      case 'secrets':
        files.push(...generateSecretsManifests(manifest, config.namespace));
        break;
      case 'ingress':
        files.push(...generateIngressManifests(manifest, config.namespace));
        break;
      case 'db-init-job':
        files.push(...generateDbInitJobManifests(manifest, config.namespace));
        break;
    }
  });

  // Generate GitHub Actions workflow
  const workflowYml = generateWorkflowYml(config);
  files.push({ path: '.github/workflows/k8s-deploy.yml', content: workflowYml });

  return files;
};

const generateFrontendManifests = (manifest: ManifestConfig, namespace: string) => {
  const { image, port, replicas, serviceType } = manifest.config;
  
  const deployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: ${namespace}
  labels:
    app: frontend
    component: frontend
spec:
  replicas: ${replicas || 2}
  selector:
    matchLabels:
      app: frontend
      component: frontend
  template:
    metadata:
      labels:
        app: frontend
        component: frontend
    spec:
      containers:
      - name: frontend
        image: ${image}
        ports:
        - containerPort: ${port || 80}
          name: http
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: ${port || 80}
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: ${port || 80}
          initialDelaySeconds: 5
          periodSeconds: 5`;

  const service = `apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: ${namespace}
  labels:
    app: frontend
    component: frontend
spec:
  type: ${serviceType || 'LoadBalancer'}
  ports:
  - port: 80
    targetPort: ${port || 80}
    protocol: TCP
    name: http
  selector:
    app: frontend
    component: frontend`;

  return [
    { path: 'k8s/frontend-deployment.yaml', content: deployment },
    { path: 'k8s/frontend-service.yaml', content: service }
  ];
};

const generateBackendManifests = (manifest: ManifestConfig, namespace: string) => {
  const { image, port, replicas, serviceType } = manifest.config;
  
  const deployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: ${namespace}
  labels:
    app: backend
    component: backend
spec:
  replicas: ${replicas || 2}
  selector:
    matchLabels:
      app: backend
      component: backend
  template:
    metadata:
      labels:
        app: backend
        component: backend
    spec:
      containers:
      - name: backend
        image: ${image}
        ports:
        - containerPort: ${port || 8080}
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: ${port || 8080}
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: ${port || 8080}
          initialDelaySeconds: 5
          periodSeconds: 5`;

  const service = `apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: ${namespace}
  labels:
    app: backend
    component: backend
spec:
  type: ${serviceType || 'ClusterIP'}
  ports:
  - port: ${port || 8080}
    targetPort: ${port || 8080}
    protocol: TCP
    name: http
  selector:
    app: backend
    component: backend`;

  return [
    { path: 'k8s/backend-deployment.yaml', content: deployment },
    { path: 'k8s/backend-service.yaml', content: service }
  ];
};

const generateSecretsManifests = (manifest: ManifestConfig, namespace: string) => {
  const { name, data } = manifest.config;
  
  const secret = `apiVersion: v1
kind: Secret
metadata:
  name: ${name || 'app-secrets'}
  namespace: ${namespace}
  labels:
    managed-by: iac-generator
type: Opaque
data:
${Object.entries(data || {}).map(([key, value]) => 
  `  ${key}: ${encodeToBase64(value as string)}`
).join('\n')}`;

  return [
    { path: 'k8s/secrets.yaml', content: secret }
  ];
};

const generateIngressManifests = (manifest: ManifestConfig, namespace: string) => {
  const { domain, enableSSL } = manifest.config;
  const files = [];
  
  const ingress = `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: ${namespace}
  labels:
    managed-by: iac-generator
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - host: ${domain || 'example.com'}
    http:
      paths:
      # Backend API routes
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 8080
      # Frontend static files (must be last)
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80${enableSSL ? `
  tls:
  - hosts:
    - ${domain || 'example.com'}
    secretName: app-tls-secret` : ''}`;

  files.push({ path: 'k8s/ingress.yaml', content: ingress });

  return files;
};

const generateDbInitJobManifests = (manifest: ManifestConfig, namespace: string) => {
  const { image, command, restartPolicy } = manifest.config;
  
  const job = `apiVersion: batch/v1
kind: Job
metadata:
  name: db-init-job
  namespace: ${namespace}
  labels:
    managed-by: iac-generator
spec:
  template:
    spec:
      containers:
      - name: postgres-client
        image: ${image || 'postgres:15'}
        env:
        - name: PGHOST
          value: "127.0.0.1"
        - name: PGPORT
          value: "5432"
        - name: PGDATABASE
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: DB_NAME
        - name: PGUSER
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: DB_USER
        - name: PGPASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: DB_PASSWORD
        command:
        - /bin/bash
        - -c
        - |
          echo "Waiting for database connection..."
          until psql -c '\\q'; do
            echo "PostgreSQL is unavailable - sleeping"
            sleep 1
          done
          
          echo "PostgreSQL is up - executing commands"
          ${command || `psql <<EOF
          -- Create messages table if it doesn't exist
          CREATE TABLE IF NOT EXISTS messages (
              id SERIAL PRIMARY KEY,
              author VARCHAR(100) NOT NULL,
              content TEXT NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          -- Add some initial data
          INSERT INTO messages (author, content) VALUES
          ('System', 'Welcome to the Cloud SQL message board!'),
          ('CloudSQL', 'Now running on Google Cloud SQL!')
          ON CONFLICT DO NOTHING;
          
          -- Show the data
          SELECT * FROM messages;
          EOF`}
          
      # Cloud SQL Proxy sidecar
      - name: cloudsql-proxy
        image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.8.0
        args:
          - "--structured-logs"
          - "--port=5432"
          - "--private-ip"
          - "$(INSTANCE_CONNECTION_NAME)"
        env:
        - name: INSTANCE_CONNECTION_NAME
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: INSTANCE_CONNECTION_NAME
        - name: GOOGLE_APPLICATION_CREDENTIALS
          value: /secrets/service-account.json
        volumeMounts:
        - name: cloudsql-key
          mountPath: /secrets
          readOnly: true
      
      volumes:
      - name: cloudsql-key
        secret:
          secretName: cloudsql-key
      
      restartPolicy: ${restartPolicy || 'Never'}
  backoffLimit: 4`;

  return [
    { path: 'k8s/db-init-job.yaml', content: job }
  ];
};

const generateWorkflowYml = (config: K8sConfig) => {
  const enabledManifests = config.manifests.filter(m => m.enabled);
  const manifestTypes = enabledManifests.map(m => m.type).join(', ');
  const manifestFiles = enabledManifests.map(m => {
    switch (m.type) {
      case 'frontend': return 'frontend-deployment.yaml frontend-service.yaml';
      case 'backend': return 'backend-deployment.yaml backend-service.yaml';
      case 'secrets': return 'secrets.yaml';
      case 'ingress': return 'ingress.yaml';
      case 'db-init-job': return 'db-init-job.yaml';
      default: return '';
    }
  }).join(' ').split(' ').filter(f => f).join(' ');

  return `name: Kubernetes Modular Deployment

on:
  workflow_dispatch:
    inputs:
      k8s_action:
        description: 'Kubernetes Action'
        required: true
        default: 'deploy'
        type: choice
        options:
          - deploy
          - update
          - delete
          - status
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
      zone:
        description: 'GCP Zone'
        required: true
        default: '${config.zone}'
      namespace:
        description: 'Kubernetes Namespace'
        required: true
        default: '${config.namespace}'

env:
  PROJECT_ID: \${{ github.event.inputs.project_id }}
  CLUSTER_NAME: \${{ github.event.inputs.cluster_name }}
  REGION: \${{ github.event.inputs.region }}
  ZONE: \${{ github.event.inputs.zone }}
  NAMESPACE: \${{ github.event.inputs.namespace }}

jobs:
  kubernetes-operations:
    name: 'Kubernetes \${{ github.event.inputs.k8s_action }}'
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout Repository
      uses: actions/checkout@v4

    - name: Authenticate to Google Cloud
      uses: google-github-actions/auth@v2
      with:
        credentials_json: \${{ secrets.GCP_SA_KEY }}

    - name: Set up Cloud SDK
      uses: google-github-actions/setup-gcloud@v2

    - name: Install kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'v1.28.0'

    - name: Verify Authentication and Project Access
      run: |
        echo "🔐 Verifying authentication..."
        gcloud auth list
        echo ""
        echo "📋 Checking project access for: \${{ github.event.inputs.project_id }}"
        gcloud projects describe \${{ github.event.inputs.project_id }} || {
          echo "❌ ERROR: Cannot access project \${{ github.event.inputs.project_id }}"
          echo "🔧 SOLUTION: Ensure the service account has access to the project"
          exit 1
        }
        echo "✅ Project access verified"

    - name: Connect to GKE Cluster
      run: |
        echo "🔗 Connecting to GKE cluster..."
        gcloud container clusters get-credentials \${{ github.event.inputs.cluster_name }} \
          --region \${{ github.event.inputs.region }} \
          --project \${{ github.event.inputs.project_id }}
        
        echo "✅ Connected to cluster: \${{ github.event.inputs.cluster_name }}"
        kubectl cluster-info
        kubectl get nodes

    # STATUS OPERATION
    - name: Check Deployment Status
      if: github.event.inputs.k8s_action == 'status'
      run: |
        echo "📊 Checking deployment status for selected manifests..."
        echo "🎯 Selected manifests: ${manifestTypes}"
        echo ""
        echo "🔍 Namespace status:"
        kubectl get namespace \${{ github.event.inputs.namespace }} || echo "Namespace does not exist"
        echo ""
        echo "🚀 Deployment status:"
        kubectl get deployments -n \${{ github.event.inputs.namespace }} || echo "No deployments found"
        echo ""
        echo "🌐 Service status:"
        kubectl get services -n \${{ github.event.inputs.namespace }} || echo "No services found"
        echo ""
        echo "📦 Pod status:"
        kubectl get pods -n \${{ github.event.inputs.namespace }} || echo "No pods found"
        echo ""
        echo "🔐 Secret status:"
        kubectl get secrets -n \${{ github.event.inputs.namespace }} || echo "No secrets found"
        echo ""
        echo "🌍 Ingress status:"
        kubectl get ingress -n \${{ github.event.inputs.namespace }} || echo "No ingress found"
        echo ""
        echo "🗄️ Job status:"
        kubectl get jobs -n \${{ github.event.inputs.namespace }} || echo "No jobs found"

    # DEPLOY OPERATION
    - name: Deploy Selected Manifests
      if: github.event.inputs.k8s_action == 'deploy'
      run: |
        echo "🚀 Deploying selected manifests: ${manifestTypes}"
        echo "📁 Creating namespace..."
        kubectl apply -f k8s/namespace.yaml
        
        # Deploy only selected manifest files
        MANIFEST_FILES="${manifestFiles}"
        for file in \$MANIFEST_FILES; do
          if [ -f "k8s/\$file" ]; then
            echo "📦 Applying k8s/\$file..."
            kubectl apply -f "k8s/\$file"
          else
            echo "⚠️ File k8s/\$file not found, skipping..."
          fi
        done
        
        echo "⏳ Waiting for deployments to be ready..."
        kubectl wait --for=condition=available --timeout=300s deployment --all -n \${{ github.event.inputs.namespace }} || true
        
        echo "✅ Selected manifests deployed successfully!"
        echo ""
        echo "📊 DEPLOYMENT SUMMARY:"
        kubectl get all -n \${{ github.event.inputs.namespace }}

    # UPDATE OPERATION
    - name: Update Selected Manifests
      if: github.event.inputs.k8s_action == 'update'
      run: |
        echo "🔄 Updating selected manifests: ${manifestTypes}"
        
        # Update only selected manifest files
        MANIFEST_FILES="${manifestFiles}"
        for file in \$MANIFEST_FILES; do
          if [ -f "k8s/\$file" ]; then
            echo "🔧 Updating k8s/\$file..."
            kubectl apply -f "k8s/\$file"
          else
            echo "⚠️ File k8s/\$file not found, skipping..."
          fi
        done
        
        # Restart deployments for rolling update
        kubectl rollout restart deployment --all -n \${{ github.event.inputs.namespace }} || true
        
        echo "⏳ Waiting for rolling update to complete..."
        kubectl rollout status deployment --all -n \${{ github.event.inputs.namespace }} || true
        
        echo "✅ Selected manifests updated successfully!"

    # DELETE OPERATION
    - name: Delete Selected Manifests
      if: github.event.inputs.k8s_action == 'delete'
      run: |
        echo "🗑️ Deleting selected manifests: ${manifestTypes}"
        
        # Delete only selected manifest files (in reverse order)
        MANIFEST_FILES="${manifestFiles}"
        for file in \$MANIFEST_FILES; do
          if [ -f "k8s/\$file" ]; then
            echo "🗑️ Deleting k8s/\$file..."
            kubectl delete -f "k8s/\$file" --ignore-not-found=true
          else
            echo "⚠️ File k8s/\$file not found, skipping..."
          fi
        done
        
        echo "⏳ Waiting for resources to be deleted..."
        kubectl wait --for=delete pod --all -n \${{ github.event.inputs.namespace }} --timeout=120s || true
        
        echo "✅ Selected manifests deleted successfully!"

    # FINAL SUMMARY
    - name: Operation Summary
      if: always()
      run: |
        echo ""
        echo "📊 KUBERNETES MODULAR OPERATION SUMMARY"
        echo "========================================"
        echo "🎯 Action: \${{ github.event.inputs.k8s_action }}"
        echo "📍 Project: \${{ github.event.inputs.project_id }}"
        echo "🏷️ Cluster: \${{ github.event.inputs.cluster_name }}"
        echo "🌍 Region: \${{ github.event.inputs.region }}"
        echo "📦 Namespace: \${{ github.event.inputs.namespace }}"
        echo "🚀 Selected Manifests: ${manifestTypes}"
        echo "📄 Deployed Files: ${manifestFiles}"
        echo ""
        
        if [ "\${{ github.event.inputs.k8s_action }}" = "deploy" ]; then
          echo "🎉 SUCCESS: Selected manifests have been deployed!"
          echo "🌐 Check service endpoints:"
          echo "kubectl get services -n \${{ github.event.inputs.namespace }}"
        elif [ "\${{ github.event.inputs.k8s_action }}" = "update" ]; then
          echo "🔄 SUCCESS: Selected manifests have been updated!"
          echo "📊 Check rollout status:"
          echo "kubectl get pods -n \${{ github.event.inputs.namespace }}"
        elif [ "\${{ github.event.inputs.k8s_action }}" = "delete" ]; then
          echo "🗑️ SUCCESS: Selected manifests have been deleted!"
          echo "🧹 Selected resources cleaned up from namespace"
        elif [ "\${{ github.event.inputs.k8s_action }}" = "status" ]; then
          echo "📊 SUCCESS: Status check completed for selected manifests!"
          echo "👀 Review the detailed status information above"
        fi
        
        echo ""
        echo "🔗 Workflow URL: \${{ github.server_url }}/\${{ github.repository }}/actions/runs/\${{ github.run_id }}"`;
};