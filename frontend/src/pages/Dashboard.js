import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  Workflow, 
  Calendar, 
  Activity, 
  Plus, 
  Play, 
  Clock, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useQuery(
    'userStats',
    () => axios.get('/api/users/stats').then(res => res.data.stats),
    { refetchInterval: 30000 }
  );

  const { data: recentExecutions, isLoading: executionsLoading } = useQuery(
    'recentExecutions',
    () => axios.get('/api/executions?limit=5').then(res => res.data.executions),
    { refetchInterval: 10000 }
  );

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Play className="h-5 w-5 text-blue-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Dashboard
          </h2>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <Link
            to="/workflows/create"
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Workflow className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Workflows
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.workflows || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Schedules
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.schedules || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Executions
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.executions || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Success Rate
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.executionBreakdown?.find(s => s._id === 'completed')?.count || 0}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Executions */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Recent Executions</h3>
          </div>
          <div className="card-body">
            {executionsLoading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner />
              </div>
            ) : recentExecutions?.length > 0 ? (
              <div className="space-y-4">
                {recentExecutions.map((execution) => (
                  <div key={execution._id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(execution.status)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {execution.workflowId?.name || 'Unknown Workflow'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(execution.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className={`badge ${getStatusColor(execution.status)}`}>
                      {execution.status}
                    </span>
                  </div>
                ))}
                <div className="pt-4 border-t border-gray-200">
                  <Link
                    to="/executions"
                    className="text-sm text-primary-600 hover:text-primary-500 font-medium"
                  >
                    View all executions →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No executions</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first workflow.
                </p>
                <div className="mt-6">
                  <Link
                    to="/workflows/create"
                    className="btn-primary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Workflow
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <Link
                to="/workflows/create"
                className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Workflow className="h-5 w-5 text-primary-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Create Workflow</p>
                  <p className="text-xs text-gray-500">Build a new automation workflow</p>
                </div>
              </Link>
              
              <Link
                to="/schedules/create"
                className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Calendar className="h-5 w-5 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Schedule Workflow</p>
                  <p className="text-xs text-gray-500">Set up automated scheduling</p>
                </div>
              </Link>
              
              <Link
                to="/workflows"
                className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <BarChart3 className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">View Workflows</p>
                  <p className="text-xs text-gray-500">Manage your existing workflows</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;