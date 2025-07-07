import React, { useState } from 'react';
import { DollarSign, TrendingDown, Lightbulb, Calculator, PieChart } from 'lucide-react';

const CostOptimizer: React.FC = () => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const recommendations = [
    {
      title: 'Right-size Node Pools',
      savings: '$45.20/month',
      impact: 'high',
      description: 'Your nodes are over-provisioned. Consider using e2-small instead of e2-medium.',
      effort: 'Low'
    },
    {
      title: 'Enable Cluster Autoscaling',
      savings: '$23.80/month',
      impact: 'medium',
      description: 'Automatically scale nodes based on demand to avoid paying for idle resources.',
      effort: 'Medium'
    },
    {
      title: 'Use Preemptible Nodes',
      savings: '$67.50/month',
      impact: 'high',
      description: 'Switch to preemptible nodes for non-critical workloads (up to 80% savings).',
      effort: 'High'
    },
    {
      title: 'Optimize Storage',
      savings: '$12.30/month',
      impact: 'low',
      description: 'Use standard persistent disks instead of SSD for non-performance critical data.',
      effort: 'Low'
    }
  ];

  const costBreakdown = [
    { category: 'Compute Engine', amount: 89.45, percentage: 65 },
    { category: 'Kubernetes Engine', amount: 24.50, percentage: 18 },
    { category: 'Persistent Disks', amount: 15.30, percentage: 11 },
    { category: 'Load Balancing', amount: 8.20, percentage: 6 }
  ];

  const runCostAnalysis = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setAnalysis(true);
    }, 2000);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cost Optimizer</h2>
          <p className="text-gray-600">Analyze and optimize your infrastructure costs</p>
        </div>
        
        <button
          onClick={runCostAnalysis}
          disabled={loading}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
            loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          <Calculator className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Analyzing...' : 'Run Cost Analysis'}</span>
        </button>
      </div>

      {/* Current Costs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h3 className="font-medium text-gray-900">Current Month</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">$137.45</p>
          <p className="text-sm text-green-600">↓ 8% from last month</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingDown className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium text-gray-900">Potential Savings</h3>
          </div>
          <p className="text-2xl font-bold text-blue-600">$148.80</p>
          <p className="text-sm text-gray-600">Per month</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <PieChart className="h-5 w-5 text-purple-600" />
            <h3 className="font-medium text-gray-900">Efficiency Score</h3>
          </div>
          <p className="text-2xl font-bold text-purple-600">72%</p>
          <p className="text-sm text-gray-600">Room for improvement</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            <h3 className="font-medium text-gray-900">Recommendations</h3>
          </div>
          <p className="text-2xl font-bold text-yellow-600">4</p>
          <p className="text-sm text-gray-600">Active suggestions</p>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
        <div className="space-y-4">
          {costBreakdown.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-blue-600 rounded" style={{ 
                  backgroundColor: `hsl(${index * 60}, 70%, 50%)` 
                }}></div>
                <span className="font-medium text-gray-900">{item.category}</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ 
                      width: `${item.percentage}%`,
                      backgroundColor: `hsl(${index * 60}, 70%, 50%)`
                    }}
                  ></div>
                </div>
                <span className="font-bold text-gray-900">${item.amount}</span>
                <span className="text-sm text-gray-600">{item.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Cost Optimization Recommendations</h3>
        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium text-gray-900">{rec.title}</h4>
                    <span className="text-lg font-bold text-green-600">{rec.savings}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(rec.impact)}`}>
                      {rec.impact.toUpperCase()} IMPACT
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                  <div className="flex items-center space-x-4">
                    <span className="text-xs text-gray-500">Effort: {rec.effort}</span>
                  </div>
                </div>
                <button className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
                  Apply
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total Potential Savings */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
        <h3 className="font-semibold text-green-900 mb-2">💰 Total Potential Savings</h3>
        <div className="flex items-center space-x-4">
          <div>
            <p className="text-3xl font-bold text-green-600">$148.80</p>
            <p className="text-green-700">per month</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">$1,785.60</p>
            <p className="text-blue-700">per year</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 mt-2">
          By implementing all recommendations, you could save up to 52% on your infrastructure costs.
        </p>
      </div>
    </div>
  );
};

export default CostOptimizer;