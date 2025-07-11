import React from 'react';
import { ArrowLeft, ArrowRight, Copy, Download, Pocket as Docker, GitBranch, Package, Shield } from 'lucide-react';

interface DockerConfig {
  enabled: boolean;
  dockerfile: string;
  context: string;
  buildArgs: Record<string, string>;
  target?: string;
  platforms: string[];
}

interface RegistryConfig {
  type: 'gcr' | 'dockerhub' | 'ghcr' | 'ecr';
  registry: string;
  repository: string;
  username?: string;
  enabled: boolean;
}

interface CIConfig {
  projectName: string;
  gitRepo: string;
  branch: string;
  buildTriggers: {
    onPush: boolean;
    onPR: boolean;
    onTag: boolean;
    manual: boolean;
  };
  docker: {
    frontend: DockerConfig;
    backend: DockerConfig;
  };
  registries: RegistryConfig[];
  scanning: {
    enabled: boolean;
    failOnHigh: boolean;
    failOnCritical: boolean;
  };
  notifications: {
    slack?: string;
    email?: string;
    discord?: string;
  };
}

interface CIPipelinePreviewProps {
  config: CIConfig;
  onBack: () => void;
  onNext: () => void;
}

const CIPipelinePreview: React.FC<CIPipelinePreviewProps> = ({ config, onBack, onNext }) => {
  const generateCIWorkflow = () => {
    const enabledRegistries = config.registries.filter(r => r.enabled);
    const frontendEnabled = config.docker.frontend.enabled;
    const backendEnabled = config.docker.backend.enabled;

    return `name: CI/CD Pipeline - Build and Deploy

on:
  push:
    branches: [${config.buildTriggers.onPush ? `'${config.branch}'` : ''}]
    tags: [${config.buildTriggers.onTag ? "'v*'" : ''}]
  pull_request:
    branches: [${config.buildTriggers.onPR ? `'${config.branch}'` : ''}]
  workflow_dispatch:
    inputs:
      build_frontend:
        description: 'Build Frontend'
        required: false
        default: 'true'
        type: boolean
      build_backend:
        description: 'Build Backend'
        required: false
        default: 'true'
        type: boolean
      deploy_to_k8s:
        description: 'Deploy to Kubernetes'
        required: false
        default: 'false'
        type: boolean

env:
  REGISTRY: ${enabledRegistries[0]?.registry || 'gcr.io'}
  PROJECT_ID: \${{ secrets.GCP_PROJECT_ID }}
  FRONTEND_IMAGE: ${enabledRegistries[0]?.repository || 'project-id'}/${config.projectName}-frontend
  BACKEND_IMAGE: ${enabledRegistries[0]?.repository || 'project-id'}/${config.projectName}-backend

jobs:
  # Build Frontend Application
  build-frontend:
    name: 'Build Frontend Docker Image'
    runs-on: ubuntu-latest
    if: ${frontendEnabled ? "github.event.inputs.build_frontend != 'false'" : 'false'}
    
    steps:
    - name: Checkout Repository
      uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: \${{ env.REGISTRY }}
        username: ${enabledRegistries[0]?.type === 'gcr' ? '_json_key' : '${{ secrets.REGISTRY_USERNAME }}'}
        password: ${enabledRegistries[0]?.type === 'gcr' ? '${{ secrets.GCP_SA_KEY }}' : '${{ secrets.REGISTRY_PASSWORD }}'}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: \${{ env.REGISTRY }}/\${{ env.FRONTEND_IMAGE }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}

    - name: Build and push Frontend Docker image
      uses: docker/build-push-action@v5
      with:
        context: ${config.docker.frontend.context}
        file: ${config.docker.frontend.dockerfile}
        ${config.docker.frontend.target ? `target: ${config.docker.frontend.target}` : ''}
        platforms: ${config.docker.frontend.platforms.join(',')}
        push: true
        tags: \${{ steps.meta.outputs.tags }}
        labels: \${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
        build-args: |
          BUILDKIT_INLINE_CACHE=1
          NODE_ENV=production

    ${config.scanning.enabled ? `
    - name: Run Trivy vulnerability scanner (Frontend)
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: \${{ env.REGISTRY }}/\${{ env.FRONTEND_IMAGE }}:latest
        format: 'sarif'
        output: 'trivy-frontend-results.sarif'
        ${config.scanning.failOnCritical ? 'exit-code: 1' : ''}
        severity: '${config.scanning.failOnHigh ? 'HIGH,CRITICAL' : 'CRITICAL'}'

    - name: Upload Trivy scan results (Frontend)
      uses: github/codeql-action/upload-sarif@v2
      if: always()
      with:
        sarif_file: 'trivy-frontend-results.sarif'` : ''}

    outputs:
      image: \${{ env.REGISTRY }}/\${{ env.FRONTEND_IMAGE }}
      digest: \${{ steps.build.outputs.digest }}

  # Build Backend Application
  build-backend:
    name: 'Build Backend Docker Image'
    runs-on: ubuntu-latest
    if: ${backendEnabled ? "github.event.inputs.build_backend != 'false'" : 'false'}
    
    steps:
    - name: Checkout Repository
      uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: \${{ env.REGISTRY }}
        username: ${enabledRegistries[0]?.type === 'gcr' ? '_json_key' : '${{ secrets.REGISTRY_USERNAME }}'}
        password: ${enabledRegistries[0]?.type === 'gcr' ? '${{ secrets.GCP_SA_KEY }}' : '${{ secrets.REGISTRY_PASSWORD }}'}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: \${{ env.REGISTRY }}/\${{ env.BACKEND_IMAGE }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}

    - name: Build and push Backend Docker image
      uses: docker/build-push-action@v5
      with:
        context: ${config.docker.backend.context}
        file: ${config.docker.backend.dockerfile}
        ${config.docker.backend.target ? `target: ${config.docker.backend.target}` : ''}
        platforms: ${config.docker.backend.platforms.join(',')}
        push: true
        tags: \${{ steps.meta.outputs.tags }}
        labels: \${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
        build-args: |
          BUILDKIT_INLINE_CACHE=1
          NODE_ENV=production

    ${config.scanning.enabled ? `
    - name: Run Trivy vulnerability scanner (Backend)
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: \${{ env.REGISTRY }}/\${{ env.BACKEND_IMAGE }}:latest
        format: 'sarif'
        output: 'trivy-backend-results.sarif'
        ${config.scanning.failOnCritical ? 'exit-code: 1' : ''}
        severity: '${config.scanning.failOnHigh ? 'HIGH,CRITICAL' : 'CRITICAL'}'

    - name: Upload Trivy scan results (Backend)
      uses: github/codeql-action/upload-sarif@v2
      if: always()
      with:
        sarif_file: 'trivy-backend-results.sarif'` : ''}

    outputs:
      image: \${{ env.REGISTRY }}/\${{ env.BACKEND_IMAGE }}
      digest: \${{ steps.build.outputs.digest }}

  # Deploy to Kubernetes (Optional)
  deploy-to-kubernetes:
    name: 'Deploy to Kubernetes'
    runs-on: ubuntu-latest
    needs: [${frontendEnabled ? 'build-frontend' : ''}${frontendEnabled && backendEnabled ? ', ' : ''}${backendEnabled ? 'build-backend' : ''}]
    if: github.event.inputs.deploy_to_k8s == 'true' && github.ref == 'refs/heads/${config.branch}'
    
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

    - name: Connect to GKE Cluster
      run: |
        gcloud container clusters get-credentials \${{ secrets.GKE_CLUSTER_NAME }} \\
          --region \${{ secrets.GKE_REGION }} \\
          --project \${{ secrets.GCP_PROJECT_ID }}

    - name: Update Kubernetes manifests with new images
      run: |
        # Update image tags in Kubernetes manifests
        ${frontendEnabled ? `sed -i "s|FRONTEND_IMAGE_PLACEHOLDER|\${{ env.REGISTRY }}/\${{ env.FRONTEND_IMAGE }}:latest|g" k8s/frontend-deployment.yaml` : ''}
        ${backendEnabled ? `sed -i "s|BACKEND_IMAGE_PLACEHOLDER|\${{ env.REGISTRY }}/\${{ env.BACKEND_IMAGE }}:latest|g" k8s/backend-deployment.yaml` : ''}

    - name: Deploy to Kubernetes
      run: |
        kubectl apply -f k8s/namespace.yaml
        ${frontendEnabled ? 'kubectl apply -f k8s/frontend-deployment.yaml' : ''}
        ${frontendEnabled ? 'kubectl apply -f k8s/frontend-service.yaml' : ''}
        ${backendEnabled ? 'kubectl apply -f k8s/backend-deployment.yaml' : ''}
        ${backendEnabled ? 'kubectl apply -f k8s/backend-service.yaml' : ''}
        
        # Wait for deployments to be ready
        kubectl wait --for=condition=available --timeout=300s deployment --all -n \${{ secrets.K8S_NAMESPACE }}

    - name: Get deployment status
      run: |
        echo "🎉 DEPLOYMENT SUCCESSFUL!"
        echo "📊 Deployment Status:"
        kubectl get all -n \${{ secrets.K8S_NAMESPACE }}
        echo ""
        echo "🌐 Service Endpoints:"
        kubectl get services -n \${{ secrets.K8S_NAMESPACE }}

  # Notification Job
  notify:
    name: 'Send Notifications'
    runs-on: ubuntu-latest
    needs: [${frontendEnabled ? 'build-frontend' : ''}${frontendEnabled && backendEnabled ? ', ' : ''}${backendEnabled ? 'build-backend' : ''}]
    if: always()
    
    steps:
    - name: Notify Slack
      if: \${{ needs.build-frontend.result == 'success' || needs.build-backend.result == 'success' }}
      uses: 8398a7/action-slack@v3
      with:
        status: \${{ job.status }}
        channel: '#deployments'
        text: |
          🚀 CI/CD Pipeline completed for ${config.projectName}
          ${frontendEnabled ? '🌐 Frontend: Built and pushed successfully' : ''}
          ${backendEnabled ? '⚙️ Backend: Built and pushed successfully' : ''}
          📦 Images available in ${enabledRegistries[0]?.registry || 'registry'}
      env:
        SLACK_WEBHOOK_URL: \${{ secrets.SLACK_WEBHOOK_URL }}`;
  };

  const generateDockerfiles = () => {
    const files = [];

    if (config.docker.frontend.enabled) {
      const frontendDockerfile = `# Frontend Dockerfile - Multi-stage build for production
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;

      files.push({ name: 'frontend/Dockerfile', content: frontendDockerfile });

      const nginxConfig = `events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    sendfile        on;
    keepalive_timeout  65;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    server {
        listen       80;
        server_name  localhost;
        root         /usr/share/nginx/html;
        index        index.html;
        
        # Handle client-side routing
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        # Cache static assets
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }
}`;

      files.push({ name: 'frontend/nginx.conf', content: nginxConfig });
    }

    if (config.docker.backend.enabled) {
      const backendDockerfile = `# Backend Dockerfile - Multi-stage build for production
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 8080
CMD ["npm", "run", "dev"]

# Build stage (if TypeScript)
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001

# Copy built application
COPY --from=build --chown=backend:nodejs /app/dist ./dist
COPY --from=build --chown=backend:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=backend:nodejs /app/package*.json ./

USER backend
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["node", "dist/index.js"]`;

      files.push({ name: 'backend/Dockerfile', content: backendDockerfile });
    }

    return files;
  };

  const generateDockerCompose = () => {
    return `version: '3.8'

services:
${config.docker.frontend.enabled ? `  frontend:
    build:
      context: ${config.docker.frontend.context}
      dockerfile: ${config.docker.frontend.dockerfile}
      target: development
    ports:
      - "3000:3000"
    volumes:
      - ${config.docker.frontend.context}:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    depends_on:
      - backend` : ''}

${config.docker.backend.enabled ? `  backend:
    build:
      context: ${config.docker.backend.context}
      dockerfile: ${config.docker.backend.dockerfile}
      target: development
    ports:
      - "8080:8080"
    volumes:
      - ${config.docker.backend.context}:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/myapp
    depends_on:
      - postgres` : ''}

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:`;
  };

  const files = [
    { name: '.github/workflows/ci-cd.yml', content: generateCIWorkflow() },
    { name: 'docker-compose.yml', content: generateDockerCompose() },
    ...generateDockerfiles()
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

  const downloadAllFiles = () => {
    files.forEach(file => {
      downloadFile(file.name, file.content);
    });
  };

  const getFileIcon = (filename: string) => {
    if (filename.includes('workflow') || filename.includes('.yml')) return <GitBranch className="h-4 w-4" />;
    if (filename.includes('Dockerfile')) return <Docker className="h-4 w-4" />;
    if (filename.includes('docker-compose')) return <Package className="h-4 w-4" />;
    return <Package className="h-4 w-4" />;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Generated CI/CD Pipeline</h2>
        <p className="text-gray-600">
          Complete CI/CD pipeline with Docker builds, container registry integration, and Kubernetes deployment
        </p>
      </div>

      {/* Pipeline Summary */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">🚀 CI/CD Pipeline Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-blue-700 font-medium">Project:</span>
            <p className="text-blue-900">{config.projectName}</p>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Repository:</span>
            <p className="text-blue-900">{config.gitRepo}</p>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Services:</span>
            <p className="text-blue-900">
              {[
                config.docker.frontend.enabled && 'Frontend',
                config.docker.backend.enabled && 'Backend'
              ].filter(Boolean).join(', ')}
            </p>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Registries:</span>
            <p className="text-blue-900">{config.registries.filter(r => r.enabled).length} configured</p>
          </div>
        </div>
      </div>

      {/* File Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <div className="flex items-center justify-between mb-2">
          <nav className="-mb-px flex space-x-4 overflow-x-auto">
            {files.map((file, index) => (
              <button
                key={file.name}
                onClick={() => setActiveFile(index)}
                className={`py-2 px-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center space-x-2 ${
                  activeFile === index
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {getFileIcon(file.name)}
                <span>{file.name}</span>
              </button>
            ))}
          </nav>
          
          <button
            onClick={downloadAllFiles}
            className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            <Download className="h-4 w-4" />
            <span>Download All</span>
          </button>
        </div>
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
        
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm max-h-96 overflow-y-auto">
          <code>{files[activeFile].content}</code>
        </pre>
      </div>

      {/* Pipeline Features */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Build Features */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">🔨 Build Features</h3>
          <div className="text-sm text-green-800 space-y-1">
            <p>✅ Multi-stage Docker builds for optimization</p>
            <p>✅ Multi-platform support (AMD64, ARM64)</p>
            <p>✅ Build caching for faster builds</p>
            <p>✅ Parallel frontend and backend builds</p>
            <p>✅ Automated image tagging (git-based)</p>
            <p>✅ Production-ready optimizations</p>
          </div>
        </div>

        {/* Security Features */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-900 mb-2">🔒 Security Features</h3>
          <div className="text-sm text-yellow-800 space-y-1">
            {config.scanning.enabled ? (
              <>
                <p>✅ Trivy vulnerability scanning enabled</p>
                <p>✅ SARIF security reports</p>
                <p>✅ {config.scanning.failOnCritical ? 'Fail on critical vulnerabilities' : 'Report critical vulnerabilities'}</p>
                <p>✅ {config.scanning.failOnHigh ? 'Fail on high severity issues' : 'Report high severity issues'}</p>
                <p>✅ Security headers in Nginx config</p>
                <p>✅ Non-root container users</p>
              </>
            ) : (
              <>
                <p>⚠️ Vulnerability scanning disabled</p>
                <p>✅ Security headers in Nginx config</p>
                <p>✅ Non-root container users</p>
                <p>💡 Enable scanning for better security</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Registry Configuration */}
      <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h3 className="font-semibold text-purple-900 mb-2">📦 Container Registry Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {config.registries.filter(r => r.enabled).map((registry, index) => (
            <div key={index} className="bg-white p-3 rounded border">
              <h4 className="font-medium text-purple-800">{registry.type.toUpperCase()}</h4>
              <p className="text-sm text-purple-700">{registry.registry}/{registry.repository}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Required Secrets */}
      <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="font-semibold text-red-900 mb-2">🔐 Required GitHub Secrets</h3>
        <div className="text-sm text-red-800 space-y-1">
          <p><code className="bg-red-100 px-1 rounded">GCP_SA_KEY</code> - Service Account JSON key</p>
          <p><code className="bg-red-100 px-1 rounded">GCP_PROJECT_ID</code> - Your GCP Project ID</p>
          <p><code className="bg-red-100 px-1 rounded">GKE_CLUSTER_NAME</code> - GKE cluster name</p>
          <p><code className="bg-red-100 px-1 rounded">GKE_REGION</code> - GKE cluster region</p>
          <p><code className="bg-red-100 px-1 rounded">K8S_NAMESPACE</code> - Kubernetes namespace</p>
          {config.registries.some(r => r.enabled && r.type !== 'gcr') && (
            <>
              <p><code className="bg-red-100 px-1 rounded">REGISTRY_USERNAME</code> - Registry username</p>
              <p><code className="bg-red-100 px-1 rounded">REGISTRY_PASSWORD</code> - Registry password/token</p>
            </>
          )}
          {config.notifications.slack && (
            <p><code className="bg-red-100 px-1 rounded">SLACK_WEBHOOK_URL</code> - Slack webhook URL</p>
          )}
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

export default CIPipelinePreview;