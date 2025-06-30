import React from 'react';
import { ArrowLeft, ArrowRight, Copy, Download } from 'lucide-react';

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

interface K8sManifestPreviewProps {
  config: K8sConfig;
  onBack: () => void;
  onNext: () => void;
}

const K8sManifestPreview: React.FC<K8sManifestPreviewProps> = ({ config, onBack, onNext }) => {
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

  const generateNamespace = () => {
    return `apiVersion: v1
kind: Namespace
metadata:
  name: ${config.namespace}
  labels:
    managed-by: iac-generator`;
  };

  const generateFrontendDeployment = (manifest: ManifestConfig) => {
    const { image, port, replicas } = manifest.config;
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: ${config.namespace}
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
  };

  const generateFrontendService = (manifest: ManifestConfig) => {
    const { port, serviceType } = manifest.config;
    return `apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: ${config.namespace}
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
  };

  const generateBackendDeployment = (manifest: ManifestConfig) => {
    const { image, port, replicas } = manifest.config;
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: ${config.namespace}
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
  };

  const generateBackendService = (manifest: ManifestConfig) => {
    const { port, serviceType } = manifest.config;
    return `apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: ${config.namespace}
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
  };

  const generateSecrets = (manifest: ManifestConfig) => {
    const { name, data } = manifest.config;
    return `apiVersion: v1
kind: Secret
metadata:
  name: ${name || 'app-secrets'}
  namespace: ${config.namespace}
  labels:
    managed-by: iac-generator
type: Opaque
data:
${Object.entries(data || {}).map(([key, value]) => 
  `  ${key}: ${encodeToBase64(value as string)}`
).join('\n')}`;
  };

  const generateIngress = (manifest: ManifestConfig) => {
    const { domain, enableSSL } = manifest.config;
    return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: ${config.namespace}
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
  };

  const generateDbInitJob = (manifest: ManifestConfig) => {
    const { image, command, restartPolicy } = manifest.config;
    return `apiVersion: batch/v1
kind: Job
metadata:
  name: db-init-job
  namespace: ${config.namespace}
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
          ${command || 'psql -c "CREATE DATABASE IF NOT EXISTS myapp;"'}
          
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
  };

  // Generate files based on enabled manifests
  const files: { name: string; content: string; type: string }[] = [];
  
  // Always include namespace
  files.push({ name: 'namespace.yaml', content: generateNamespace(), type: 'namespace' });

  // Add files for each enabled manifest
  config.manifests.filter(m => m.enabled).forEach(manifest => {
    switch (manifest.type) {
      case 'frontend':
        files.push(
          { name: 'frontend-deployment.yaml', content: generateFrontendDeployment(manifest), type: 'frontend' },
          { name: 'frontend-service.yaml', content: generateFrontendService(manifest), type: 'frontend' }
        );
        break;
      case 'backend':
        files.push(
          { name: 'backend-deployment.yaml', content: generateBackendDeployment(manifest), type: 'backend' },
          { name: 'backend-service.yaml', content: generateBackendService(manifest), type: 'backend' }
        );
        break;
      case 'secrets':
        files.push({ name: 'secrets.yaml', content: generateSecrets(manifest), type: 'secrets' });
        break;
      case 'ingress':
        files.push({ name: 'ingress.yaml', content: generateIngress(manifest), type: 'ingress' });
        break;
      case 'db-init-job':
        files.push({ name: 'db-init-job.yaml', content: generateDbInitJob(manifest), type: 'db-init-job' });
        break;
    }
  });

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

  const getFileTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'namespace': 'bg-gray-100 text-gray-800',
      'frontend': 'bg-blue-100 text-blue-800',
      'backend': 'bg-green-100 text-green-800',
      'secrets': 'bg-yellow-100 text-yellow-800',
      'ingress': 'bg-purple-100 text-purple-800',
      'db-init-job': 'bg-indigo-100 text-indigo-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getFileTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      'namespace': '📁',
      'frontend': '🌐',
      'backend': '⚙️',
      'secrets': '🔐',
      'ingress': '🌍',
      'db-init-job': '🗄️'
    };
    return icons[type] || '📄';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Generated Kubernetes Manifests</h2>
        <p className="text-gray-600">
          Modular manifests for selected components - deploy only what you need
        </p>
      </div>

      {/* Selected Manifests Summary */}
      <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h3 className="font-semibold text-purple-900 mb-2">📦 Selected Manifests for Deployment</h3>
        <div className="flex flex-wrap gap-2">
          {config.manifests.filter(m => m.enabled).map(manifest => (
            <span
              key={manifest.type}
              className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getFileTypeColor(manifest.type)}`}
            >
              <span>{getFileTypeIcon(manifest.type)}</span>
              <span className="capitalize">{manifest.type.replace('-', ' ')}</span>
            </span>
          ))}
          {config.manifests.filter(m => m.enabled).length === 0 && (
            <span className="text-purple-700">No manifests selected</span>
          )}
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
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{getFileTypeIcon(file.type)}</span>
                <span>{file.name}</span>
              </button>
            ))}
          </nav>
          
          <button
            onClick={downloadAllFiles}
            className="flex items-center space-x-2 px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
          >
            <Download className="h-4 w-4" />
            <span>Download All</span>
          </button>
        </div>
      </div>

      {/* Code Preview */}
      {files.length > 0 && (
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
      )}

      {/* No Manifests Selected */}
      {files.length === 1 && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <span className="text-4xl">📦</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Application Manifests Selected</h3>
          <p className="text-gray-600 mb-4">
            Go back to configuration and select at least one manifest type to deploy.
          </p>
          <button
            onClick={onBack}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Configuration</span>
          </button>
        </div>
      )}

      {/* Deployment Strategy */}
      {files.length > 1 && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Deployment Order */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">📋 Deployment Order</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>1. Namespace:</strong> Create isolated environment</p>
              {config.manifests.find(m => m.enabled && m.type === 'secrets') && (
                <p><strong>2. Secrets:</strong> Environment variables and credentials</p>
              )}
              {config.manifests.find(m => m.enabled && m.type === 'db-init-job') && (
                <p><strong>3. DB Init Job:</strong> Database initialization</p>
              )}
              {config.manifests.find(m => m.enabled && m.type === 'backend') && (
                <p><strong>4. Backend:</strong> API services and deployments</p>
              )}
              {config.manifests.find(m => m.enabled && m.type === 'frontend') && (
                <p><strong>5. Frontend:</strong> Web application and services</p>
              )}
              {config.manifests.find(m => m.enabled && m.type === 'ingress') && (
                <p><strong>6. Ingress:</strong> External routing and SSL</p>
              )}
            </div>
          </div>

          {/* Manifest Features */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">🚀 Manifest Features</h3>
            <div className="text-sm space-y-2">
              {config.manifests.filter(m => m.enabled).map(manifest => (
                <div key={manifest.type} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-800 capitalize">
                    {manifest.type.replace('-', ' ')}: Production-ready configuration
                  </span>
                </div>
              ))}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-800">Health checks & resource limits</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-800">Rolling updates & zero downtime</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deployment Instructions */}
      {files.length > 1 && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-900 mb-2">📋 Manual Deployment Instructions</h3>
          <div className="text-sm text-yellow-800 space-y-2">
            <p><strong>1. Connect to your GKE cluster:</strong></p>
            <code className="block bg-yellow-100 p-2 rounded text-xs font-mono">
              gcloud container clusters get-credentials {config.clusterName} --region {config.region} --project {config.projectId}
            </code>
            
            <p><strong>2. Apply manifests in order:</strong></p>
            <div className="bg-yellow-100 p-2 rounded text-xs font-mono space-y-1">
              {files.map(file => (
                <div key={file.name}>kubectl apply -f {file.name}</div>
              ))}
            </div>
            
            <p><strong>3. Check deployment status:</strong></p>
            <code className="block bg-yellow-100 p-2 rounded text-xs font-mono">
              kubectl get all -n {config.namespace}
            </code>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Configuration</span>
        </button>
        
        {files.length > 1 && (
          <button
            onClick={onNext}
            className="flex items-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <span>Setup GitHub Integration</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default K8sManifestPreview;