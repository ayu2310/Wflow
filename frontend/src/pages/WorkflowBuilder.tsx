import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { workflowsApi, aiApi } from '../services/api';

const WorkflowBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    natural_language_prompt: '',
    browser_type: 'chrome',
    headless: true,
    timeout: 30000,
    max_retries: 3,
    retry_delay: 60,
  });

  const [aiInterpretation, setAiInterpretation] = useState<any>(null);
  const [isInterpreting, setIsInterpreting] = useState(false);

  // Fetch workflow data if editing
  const { data: workflow, isLoading } = useQuery(
    ['workflow', id],
    () => workflowsApi.get(Number(id)),
    {
      enabled: isEditing,
      onSuccess: (data) => {
        setFormData({
          name: data.name,
          description: data.description || '',
          natural_language_prompt: data.natural_language_prompt,
          browser_type: data.browser_type,
          headless: data.headless,
          timeout: data.timeout,
          max_retries: data.max_retries,
          retry_delay: data.retry_delay,
        });
        setAiInterpretation(data.ai_interpreted_steps);
      },
    }
  );

  const createMutation = useMutation(
    (data: any) => workflowsApi.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('workflows');
        toast.success('Workflow created successfully');
        navigate('/workflows');
      },
      onError: () => {
        toast.error('Failed to create workflow');
      },
    }
  );

  const updateMutation = useMutation(
    (data: any) => workflowsApi.update(Number(id), data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('workflows');
        toast.success('Workflow updated successfully');
        navigate('/workflows');
      },
      onError: () => {
        toast.error('Failed to update workflow');
      },
    }
  );

  const handleInterpretPrompt = async () => {
    if (!formData.natural_language_prompt.trim()) {
      toast.error('Please enter a workflow description');
      return;
    }

    setIsInterpreting(true);
    try {
      const result = await aiApi.interpret({
        natural_language_prompt: formData.natural_language_prompt,
      });
      setAiInterpretation(result);
      toast.success('Workflow interpreted successfully');
    } catch (error) {
      toast.error('Failed to interpret workflow');
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!aiInterpretation) {
      toast.error('Please interpret the workflow first');
      return;
    }

    const submitData = {
      ...formData,
      ai_interpreted_steps: aiInterpretation,
    };

    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
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
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Workflow' : 'Create New Workflow'}
        </h1>
        <p className="text-gray-600">
          Describe your workflow in natural language and let AI interpret it
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Workflow Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
                Workflow Description (Natural Language)
              </label>
              <textarea
                id="prompt"
                value={formData.natural_language_prompt}
                onChange={(e) => setFormData({ ...formData, natural_language_prompt: e.target.value })}
                rows={6}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="Describe what you want the workflow to do, e.g., 'Go to example.com, fill out the contact form with my information, and submit it'"
                required
              />
            </div>

            <div>
              <button
                type="button"
                onClick={handleInterpretPrompt}
                disabled={isInterpreting || !formData.natural_language_prompt.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              >
                {isInterpreting ? 'Interpreting...' : 'Interpret with AI'}
              </button>
            </div>
          </div>
        </div>

        {aiInterpretation && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">AI Interpretation</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700">Confidence Score</h4>
                <p className="text-sm text-gray-900">
                  {(aiInterpretation.confidence_score * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700">Estimated Duration</h4>
                <p className="text-sm text-gray-900">{aiInterpretation.estimated_duration} seconds</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700">Steps</h4>
                <div className="space-y-2">
                  {aiInterpretation.interpreted_steps?.map((step: any, index: number) => (
                    <div key={index} className="bg-gray-50 p-3 rounded">
                      <p className="text-sm font-medium text-gray-900">
                        Step {step.step_number}: {step.action_type}
                      </p>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="browser_type" className="block text-sm font-medium text-gray-700">
                Browser Type
              </label>
              <select
                id="browser_type"
                value={formData.browser_type}
                onChange={(e) => setFormData({ ...formData, browser_type: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="chrome">Chrome</option>
                <option value="firefox">Firefox</option>
                <option value="safari">Safari</option>
              </select>
            </div>

            <div>
              <label htmlFor="timeout" className="block text-sm font-medium text-gray-700">
                Timeout (ms)
              </label>
              <input
                type="number"
                id="timeout"
                value={formData.timeout}
                onChange={(e) => setFormData({ ...formData, timeout: Number(e.target.value) })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label htmlFor="max_retries" className="block text-sm font-medium text-gray-700">
                Max Retries
              </label>
              <input
                type="number"
                id="max_retries"
                value={formData.max_retries}
                onChange={(e) => setFormData({ ...formData, max_retries: Number(e.target.value) })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label htmlFor="retry_delay" className="block text-sm font-medium text-gray-700">
                Retry Delay (seconds)
              </label>
              <input
                type="number"
                id="retry_delay"
                value={formData.retry_delay}
                onChange={(e) => setFormData({ ...formData, retry_delay: Number(e.target.value) })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="headless"
                checked={formData.headless}
                onChange={(e) => setFormData({ ...formData, headless: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="headless" className="ml-2 block text-sm text-gray-900">
                Run in headless mode
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/workflows')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!aiInterpretation || createMutation.isLoading || updateMutation.isLoading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            {isEditing ? 'Update Workflow' : 'Create Workflow'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WorkflowBuilder;