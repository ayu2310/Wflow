import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import {
  PlayIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { api } from '../services/api';

const Dashboard: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useQuery('dashboard-stats', () =>
    api.get('/api/v1/workflows/stats').then(res => res.data)
  );

  const { data: recentWorkflows, isLoading: workflowsLoading } = useQuery('recent-workflows', () =>
    api.get('/api/v1/workflows?limit=5').then(res => res.data)
  );

  const { data: recentExecutions, isLoading: executionsLoading } = useQuery('recent-executions', () =>
    api.get('/api/v1/executions?limit=10').then(res => res.data)
  );

  if (statsLoading || workflowsLoading || executionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your workflow automation</p>
        </div>
        <Link
          to="/workflows/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Workflow
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PlayIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Workflows</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.total_workflows || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Workflows</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.active_workflows || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Success Rate</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.success_rate?.toFixed(1) || 0}%</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Failed Executions</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.failed_executions || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Workflows */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Workflows</h3>
            <div className="space-y-4">
              {recentWorkflows?.map((workflow: any) => (
                <div key={workflow.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <PlayIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{workflow.name}</p>
                      <p className="text-sm text-gray-500">
                        Success rate: {workflow.success_rate?.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/workflows/${workflow.id}`}
                    className="text-sm text-primary-600 hover:text-primary-500"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Executions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Executions</h3>
            <div className="space-y-4">
              {recentExecutions?.map((execution: any) => (
                <div key={execution.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {execution.status === 'completed' ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-400" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        Workflow #{execution.workflow_id}
                      </p>
                      <p className="text-sm text-gray-500">
                        {execution.steps_completed}/{execution.total_steps} steps completed
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    execution.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {execution.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;