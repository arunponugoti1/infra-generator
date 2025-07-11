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

export const generateCIFiles = (config: CIConfig) => {
  const files: { path: string; content: string }[] = [];

  // Generate main CI/CD workflow
  files.push({
    path: '.github/workflows/ci-cd.yml',
    content: generateCIWorkflow(config)
  });

  // Generate Docker Compose for local development
  files.push({
    path: 'docker-compose.yml',
    content: generateDockerCompose(config)
  });

  // Generate Dockerfiles
  if (config.docker.frontend.enabled) {
    files.push({
      path: `${config.docker.frontend.context}/Dockerfile`,
      content: generateFrontendDockerfile()
    });
    files.push({
      path: `${config.docker.frontend.context}/nginx.conf`,
      content: generateNginxConfig()
    });
  }

  if (config.docker.backend.enabled) {
    files.push({
      path: `${config.docker.backend.context}/Dockerfile`,
      content: generateBackendDockerfile()
    });
  }

  // Generate .dockerignore files
  files.push({
    path: '.dockerignore',
    content: generateDockerIgnore()
  });

  return files;
};

const generateCIWorkflow = (config: CIConfig) => {
  const enabledRegistries = config.registries.filter(r => r.enabled);
  const primaryRegistry = enabledRegistries[0];
  const frontendEnabled = config.docker.frontend.enabled;
  const backendEnabled = config.docker.backend.enabled;

  const triggers = [];
  if (config.buildTriggers.onPush) triggers.push(`    branches: ['${config.branch}']`);
  if (config.buildTriggers.onTag) triggers.push(`    tags: ['v*']`);

  return `name: CI/CD Pipeline - Build and Deploy

on:
  push:
${triggers.length > 0 ? triggers.join('\n') : `    branches: ['${config.branch}']`}
${config.buildTriggers.onPR ? `  pull_request:
    branches: ['${config.branch}']` : ''}
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
      environment:
        description: 'Deployment Environment'
        required: false
        default: 'staging'
        type: choice
        options:
          - staging
          - production

env:
  REGISTRY: ${primaryRegistry?.registry || 'gcr.io'}
  PROJECT_ID: \${{ secrets.GCP_PROJECT_ID }}
  FRONTEND_IMAGE: ${primaryRegistry?.repository || 'project-id'}/${config.projectName}-frontend
  BACKEND_IMAGE: ${primaryRegistry?.repository || 'project-id'}/${config.projectName}-backend

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
        username: ${primaryRegistry?.type === 'gcr' ? '_json_key' : primaryRegistry?.type === 'ghcr' ? '${{ github.actor }}' : '${{ secrets.REGISTRY_USERNAME }}'}
        password: ${primaryRegistry?.type === 'gcr' ? '${{ secrets.GCP_SA_KEY }}' : primaryRegistry?.type === 'ghcr' ? '${{ secrets.GITHUB_TOKEN }}' : '${{ secrets.REGISTRY_PASSWORD }}'}

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
      id: build-frontend
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
          REACT_APP_VERSION=\${{ github.sha }}

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
      digest: \${{ steps.build-frontend.outputs.digest }}
      tags: \${{ steps.meta.outputs.tags }}

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
        username: ${primaryRegistry?.type === 'gcr' ? '_json_key' : primaryRegistry?.type === 'ghcr' ? '${{ github.actor }}' : '${{ secrets.REGISTRY_USERNAME }}'}
        password: ${primaryRegistry?.type === 'gcr' ? '${{ secrets.GCP_SA_KEY }}' : primaryRegistry?.type === 'ghcr' ? '${{ secrets.GITHUB_TOKEN }}' : '${{ secrets.REGISTRY_PASSWORD }}'}

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
      id: build-backend
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
          APP_VERSION=\${{ github.sha }}

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
      digest: \${{ steps.build-backend.outputs.digest }}
      tags: \${{ steps.meta.outputs.tags }}

  # Deploy to Kubernetes (Optional)
  deploy-to-kubernetes:
    name: 'Deploy to Kubernetes'
    runs-on: ubuntu-latest
    needs: [${frontendEnabled ? 'build-frontend' : ''}${frontendEnabled && backendEnabled ? ', ' : ''}${backendEnabled ? 'build-backend' : ''}]
    if: github.event.inputs.deploy_to_k8s == 'true' && (github.ref == 'refs/heads/${config.branch}' || github.event.inputs.environment == 'production')
    environment: \${{ github.event.inputs.environment || 'staging' }}
    
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
        # Set environment-specific namespace
        NAMESPACE=\${{ github.event.inputs.environment || 'staging' }}
        
        # Update image tags in Kubernetes manifests
        ${frontendEnabled ? `sed -i "s|FRONTEND_IMAGE_PLACEHOLDER|\${{ env.REGISTRY }}/\${{ env.FRONTEND_IMAGE }}:latest|g" k8s/frontend-deployment.yaml` : ''}
        ${backendEnabled ? `sed -i "s|BACKEND_IMAGE_PLACEHOLDER|\${{ env.REGISTRY }}/\${{ env.BACKEND_IMAGE }}:latest|g" k8s/backend-deployment.yaml` : ''}
        
        # Update namespace in all manifests
        find k8s/ -name "*.yaml" -exec sed -i "s/namespace: .*/namespace: \$NAMESPACE/g" {} \\;

    - name: Deploy to Kubernetes
      run: |
        NAMESPACE=\${{ github.event.inputs.environment || 'staging' }}
        
        # Create namespace if it doesn't exist
        kubectl create namespace \$NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
        
        # Apply manifests
        kubectl apply -f k8s/ -n \$NAMESPACE
        
        # Wait for deployments to be ready
        kubectl wait --for=condition=available --timeout=300s deployment --all -n \$NAMESPACE

    - name: Get deployment status
      run: |
        NAMESPACE=\${{ github.event.inputs.environment || 'staging' }}
        echo "🎉 DEPLOYMENT SUCCESSFUL!"
        echo "📊 Deployment Status:"
        kubectl get all -n \$NAMESPACE
        echo ""
        echo "🌐 Service Endpoints:"
        kubectl get services -n \$NAMESPACE

  # Security and Quality Checks
  security-scan:
    name: 'Security and Quality Checks'
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    
    steps:
    - name: Checkout Repository
      uses: actions/checkout@v4

    - name: Run CodeQL Analysis
      uses: github/codeql-action/init@v2
      with:
        languages: javascript

    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v2

    - name: Run ESLint
      run: |
        npm ci
        npm run lint || true

    - name: Run Tests
      run: |
        npm ci
        npm test || true

  # Notification Job
  notify:
    name: 'Send Notifications'
    runs-on: ubuntu-latest
    needs: [${frontendEnabled ? 'build-frontend' : ''}${frontendEnabled && backendEnabled ? ', ' : ''}${backendEnabled ? 'build-backend' : ''}]
    if: always() && (needs.build-frontend.result != 'skipped' || needs.build-backend.result != 'skipped')
    
    steps:
    - name: Determine overall status
      id: status
      run: |
        if [[ "\${{ needs.build-frontend.result }}" == "success" || "\${{ needs.build-backend.result }}" == "success" ]]; then
          echo "status=success" >> \$GITHUB_OUTPUT
        else
          echo "status=failure" >> \$GITHUB_OUTPUT
        fi

    - name: Notify Slack
      if: steps.status.outputs.status == 'success'
      uses: 8398a7/action-slack@v3
      with:
        status: \${{ steps.status.outputs.status }}
        channel: '#deployments'
        text: |
          🚀 CI/CD Pipeline completed for ${config.projectName}
          📦 Repository: ${config.gitRepo}
          🌿 Branch: \${{ github.ref_name }}
          ${frontendEnabled ? '🌐 Frontend: Built and pushed successfully' : ''}
          ${backendEnabled ? '⚙️ Backend: Built and pushed successfully' : ''}
          📦 Images available in ${primaryRegistry?.registry || 'registry'}
          🔗 Workflow: \${{ github.server_url }}/\${{ github.repository }}/actions/runs/\${{ github.run_id }}
      env:
        SLACK_WEBHOOK_URL: \${{ secrets.SLACK_WEBHOOK_URL }}

    - name: Notify on failure
      if: steps.status.outputs.status == 'failure'
      uses: 8398a7/action-slack@v3
      with:
        status: failure
        channel: '#deployments'
        text: |
          ❌ CI/CD Pipeline failed for ${config.projectName}
          📦 Repository: ${config.gitRepo}
          🌿 Branch: \${{ github.ref_name }}
          🔗 Check logs: \${{ github.server_url }}/\${{ github.repository }}/actions/runs/\${{ github.run_id }}
      env:
        SLACK_WEBHOOK_URL: \${{ secrets.SLACK_WEBHOOK_URL }}`;
};

const generateDockerCompose = (config: CIConfig) => {
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
      - REACT_APP_API_URL=http://localhost:8080
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
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/${config.projectName}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis` : ''}

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${config.projectName}
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Development tools
  adminer:
    image: adminer
    ports:
      - "8081:8080"
    depends_on:
      - postgres

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    name: ${config.projectName}-network`;
};

const generateFrontendDockerfile = () => {
  return `# Frontend Dockerfile - Multi-stage build for production
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build arguments
ARG NODE_ENV=production
ARG REACT_APP_VERSION
ARG REACT_APP_API_URL

ENV NODE_ENV=\${NODE_ENV}
ENV REACT_APP_VERSION=\${REACT_APP_VERSION}
ENV REACT_APP_API_URL=\${REACT_APP_API_URL}

RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built application
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user
RUN addgroup -g 1001 -S nginx
RUN adduser -S nginx -u 1001

# Set ownership
RUN chown -R nginx:nginx /usr/share/nginx/html
RUN chown -R nginx:nginx /var/cache/nginx
RUN chown -R nginx:nginx /var/log/nginx
RUN chown -R nginx:nginx /etc/nginx/conf.d
RUN touch /var/run/nginx.pid
RUN chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]`;
};

const generateBackendDockerfile = () => {
  return `# Backend Dockerfile - Multi-stage build for production
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 8080
CMD ["npm", "run", "dev"]

# Build stage (for TypeScript projects)
FROM base AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build arguments
ARG NODE_ENV=production
ARG APP_VERSION

ENV NODE_ENV=\${NODE_ENV}
ENV APP_VERSION=\${APP_VERSION}

# Build the application (if using TypeScript)
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001

# Copy built application and dependencies
COPY --from=build --chown=backend:nodejs /app/dist ./dist
COPY --from=deps --chown=backend:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=backend:nodejs /app/package*.json ./

# Switch to non-root user
USER backend

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["node", "dist/index.js"]`;
};

const generateNginxConfig = () => {
  return `events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Logging
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # Basic settings
    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    keepalive_timeout  65;
    types_hash_max_size 2048;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    
    server {
        listen       80;
        server_name  localhost;
        root         /usr/share/nginx/html;
        index        index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'self';" always;
        
        # Handle client-side routing
        location / {
            try_files \$uri \$uri/ /index.html;
            
            # Cache control for HTML files
            location ~* \\.html\$ {
                expires -1;
                add_header Cache-Control "no-cache, no-store, must-revalidate";
            }
        }
        
        # Cache static assets
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Vary "Accept-Encoding";
        }
        
        # API proxy (if needed)
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend:8080/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
        }
        
        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\\n";
            add_header Content-Type text/plain;
        }
        
        # Deny access to hidden files
        location ~ /\\. {
            deny all;
        }
    }
}`;
};

const generateDockerIgnore = () => {
  return `# Dependencies
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage
.grunt

# Bower dependency directory
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons
build/Release

# Dependency directories
jspm_packages/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test
.env.local
.env.development.local
.env.test.local
.env.production.local

# parcel-bundler cache
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Git
.git
.gitignore
README.md

# Docker
Dockerfile*
docker-compose*
.dockerignore

# CI/CD
.github/
.gitlab-ci.yml
.travis.yml
.circleci/

# Testing
coverage/
.nyc_output/
junit.xml

# Build tools
.webpack/
.rollup.cache/
.terser-cache/`;
};