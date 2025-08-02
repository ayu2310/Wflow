import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  PlayIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { workflowsApi } from '../services/api';

const Workflows: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const queryClient = useQueryClient();

  const { data: workflows, isLoading } = useQuery(
    ['workflows', searchTerm, statusFilter],
    () => workflowsApi.list({ search: searchTerm, status: statusFilter })
  );

  const deleteMutation = useMutation(
    (id: number) => workflowsApi.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('workflows');
        toast.success('Workflow deleted successfully');
      },
      onError: () => {
        toast.error('Failed to delete workflow');
      },
    }
  );

  const executeMutation = useMutation(
    (id: number) => workflowsApi.execute(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('workflows');
        toast.success('Workflow execution started');
      },
      onError: () => {
        toast.error('Failed to execute workflow');
      },
    }
  );

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleExecute = (id: number) => {
    executeMutation.mutate(id);
  };

  if (isLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-600">Manage your automation workflows</p>
        </div>
        <Link
          to="/workflows/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Workflow
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="Search workflows..."
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Workflows List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-4">
            {workflows?.map((workflow: any) => (
              <div
                key={workflow.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <PlayIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{workflow.name}</h3>
                      <p className="text-sm text-gray-500">{workflow.description}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          workflow.status === 'active' ? 'bg-green-100 text-green-800' :
                          workflow.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                          workflow.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {workflow.status}
                        </span>
                        <span className="text-sm text-gray-500">
                          Success rate: {workflow.success_rate?.toFixed(1)}%
                        </span>
                        {workflow.last_execution && (
                          <span className="text-sm text-gray-500">
                            Last run: {new Date(workflow.last_execution).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleExecute(workflow.id)}
                      disabled={executeMutation.isLoading}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      <PlayIcon className="h-4 w-4 mr-1" />
                      Execute
                    </button>
                    <Link
                      to={`/workflows/${workflow.id}`}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View
                    </Link>
                    <Link
                      to={`/workflows/${workflow.id}`}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(workflow.id)}
                      disabled={deleteMutation.isLoading}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workflows;