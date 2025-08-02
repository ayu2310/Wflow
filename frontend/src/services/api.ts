import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const workflowsApi = {
  list: (params?: any) => api.get('/api/v1/workflows', { params }),
  get: (id: number) => api.get(`/api/v1/workflows/${id}`),
  create: (data: any) => api.post('/api/v1/workflows', data),
  update: (id: number, data: any) => api.put(`/api/v1/workflows/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/workflows/${id}`),
  execute: (id: number) => api.post(`/api/v1/workflows/${id}/execute`),
  test: (id: number) => api.post(`/api/v1/workflows/${id}/test`),
  stats: () => api.get('/api/v1/workflows/stats'),
};

export const schedulesApi = {
  list: (params?: any) => api.get('/api/v1/schedules', { params }),
  get: (id: number) => api.get(`/api/v1/schedules/${id}`),
  create: (data: any) => api.post('/api/v1/schedules', data),
  update: (id: number, data: any) => api.put(`/api/v1/schedules/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/schedules/${id}`),
  toggle: (id: number) => api.post(`/api/v1/schedules/${id}/toggle`),
};

export const triggersApi = {
  list: (params?: any) => api.get('/api/v1/triggers', { params }),
  get: (id: number) => api.get(`/api/v1/triggers/${id}`),
  create: (data: any) => api.post('/api/v1/triggers', data),
  delete: (id: number) => api.delete(`/api/v1/triggers/${id}`),
  toggle: (id: number) => api.post(`/api/v1/triggers/${id}/toggle`),
};

export const executionsApi = {
  list: (params?: any) => api.get('/api/v1/executions', { params }),
  get: (id: number) => api.get(`/api/v1/executions/${id}`),
  delete: (id: number) => api.delete(`/api/v1/executions/${id}`),
  stats: (workflowId: number) => api.get(`/api/v1/executions/workflow/${workflowId}/stats`),
};

export const aiApi = {
  interpret: (data: any) => api.post('/api/v1/ai/interpret', data),
  analyzeScreenshot: (taskDescription: string, screenshot: File) => {
    const formData = new FormData();
    formData.append('task_description', taskDescription);
    formData.append('screenshot', screenshot);
    return api.post('/api/v1/ai/analyze-screenshot', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  generateSelector: (elementDescription: string, pageContext: string) =>
    api.post('/api/v1/ai/generate-selector', { elementDescription, pageContext }),
  validateWorkflow: (steps: any[]) => api.post('/api/v1/ai/validate-workflow', steps),
  errorRecovery: (errorDescription: string, workflowContext: string) =>
    api.post('/api/v1/ai/error-recovery', { errorDescription, workflowContext }),
};

export default api;