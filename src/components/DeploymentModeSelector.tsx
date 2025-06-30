import React from 'react';
import { Cloud, Layers, ArrowRight } from 'lucide-react';

interface DeploymentModeSelectorProps {
  mode: 'infrastructure' | 'application';
  onChange: (mode: 'infrastructure' | 'application') => void;
}

const DeploymentModeSelector: React.FC<DeploymentModeSelectorProps> = ({ mode, onChange }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Deployment Mode</h2>
        <p className="text-gray-600">Select whether you want to create infrastructure or deploy applications</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Infrastructure Mode */}
        <div
          onClick={() => onChange('infrastructure')}
          className={`relative p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
            mode === 'infrastructure'
              ? 'border-blue-500 bg-blue-50 shadow-md'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className={`p-3 rounded-lg ${
              mode === 'infrastructure' ? 'bg-blue-600' : 'bg-gray-400'
            }`}>
              <Cloud className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Infrastructure Creation</h3>
              <p className="text-sm text-gray-500">GKE Cluster & Resources</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-2">What you'll create:</p>
              <ul className="space-y-1">
                <li>• Google Kubernetes Engine (GKE) cluster</li>
                <li>• Node pools with optimized configuration</li>
                <li>• Networking and security settings</li>
                <li>• Terraform state management</li>
                <li>• GitHub Actions CI/CD pipeline</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm text-green-800">
                <strong>Perfect for:</strong> Setting up new GKE clusters, managing infrastructure as code, 
                and establishing the foundation for your Kubernetes workloads.
              </p>
            </div>
          </div>

          {mode === 'infrastructure' && (
            <div className="absolute top-4 right-4">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
          )}
        </div>

        {/* Application Mode */}
        <div
          onClick={() => onChange('application')}
          className={`relative p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
            mode === 'application'
              ? 'border-purple-500 bg-purple-50 shadow-md'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className={`p-3 rounded-lg ${
              mode === 'application' ? 'bg-purple-600' : 'bg-gray-400'
            }`}>
              <Layers className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Application Deployment</h3>
              <p className="text-sm text-gray-500">K8s Manifests & Apps</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-2">What you'll deploy:</p>
              <ul className="space-y-1">
                <li>• Frontend and backend applications</li>
                <li>• Kubernetes deployments & services</li>
                <li>• Persistent volumes and storage</li>
                <li>• Ingress controllers and load balancers</li>
                <li>• ConfigMaps and secrets management</li>
              </ul>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
              <p className="text-sm text-purple-800">
                <strong>Perfect for:</strong> Deploying applications to existing GKE clusters, 
                managing Kubernetes manifests, and automating application deployments.
              </p>
            </div>
          </div>

          {mode === 'application' && (
            <div className="absolute top-4 right-4">
              <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Flow Indicator */}
      <div className="mt-8 flex items-center justify-center space-x-4 text-sm text-gray-500">
        <div className="flex items-center space-x-2">
          <Cloud className="h-4 w-4" />
          <span>Create Infrastructure</span>
        </div>
        <ArrowRight className="h-4 w-4" />
        <div className="flex items-center space-x-2">
          <Layers className="h-4 w-4" />
          <span>Deploy Applications</span>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          <strong>Recommended flow:</strong> Start with Infrastructure Creation to set up your GKE cluster, 
          then switch to Application Deployment to deploy your apps.
        </p>
      </div>
    </div>
  );
};

export default DeploymentModeSelector;