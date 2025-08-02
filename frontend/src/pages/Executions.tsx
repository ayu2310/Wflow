import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { executionsApi } from '../services/api';

const Executions: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const queryClient = useQueryClient();

  const { data: executions, isLoading } = useQuery(
    ['executions', statusFilter],
    () => executionsApi.list({ status: statusFilter })
  );

  const deleteMutation = useMutation(
    (id: number) => executionsApi.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('executions');
        toast.success('Execution deleted successfully');
      },
      onError: () => {
        toast.error('Failed to delete execution');
      },
    }
  );

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this execution?')) {
      deleteMutation.mutate(id);
    }
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Executions</h1>
        <p className="text-gray-600">View workflow execution history</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-4">
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Filter by Status
          </label>
          <select
            id="status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className="space-y-4">
          {executions?.map((execution: any) => (
            <div
              key={execution.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {execution.status === 'completed' ? (
                      <CheckCircleIcon className="h-8 w-8 text-green-400" />
                    ) : execution.status === 'failed' ? (
                      <XCircleIcon className="h-8 w-8 text-red-400" />
                    ) : (
                      <ClockIcon className="h-8 w-8 text-yellow-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Workflow #{execution.workflow_id}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {execution.steps_completed}/{execution.total_steps} steps completed
                    </p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        execution.status === 'completed' ? 'bg-green-100 text-green-800' :
                        execution.status === 'failed' ? 'bg-red-100 text-red-800' :
                        execution.status === 'running' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {execution.status}
                      </span>
                      {execution.duration && (
                        <span className="text-sm text-gray-500">
                          Duration: {execution.duration}s
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        {new Date(execution.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDelete(execution.id)}
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
  );
};

export default Executions;