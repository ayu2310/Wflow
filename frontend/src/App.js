import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Workflows from './pages/Workflows';
import WorkflowDetail from './pages/WorkflowDetail';
import WorkflowCreate from './pages/WorkflowCreate';
import Schedules from './pages/Schedules';
import ScheduleDetail from './pages/ScheduleDetail';
import ScheduleCreate from './pages/ScheduleCreate';
import Executions from './pages/Executions';
import ExecutionDetail from './pages/ExecutionDetail';
import Profile from './pages/Profile';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/dashboard" replace /> : <Register />}
      />

      {/* Protected routes */}
      <Route
        path="/*"
        element={
          user ? (
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/workflows" element={<Workflows />} />
                <Route path="/workflows/create" element={<WorkflowCreate />} />
                <Route path="/workflows/:id" element={<WorkflowDetail />} />
                <Route path="/schedules" element={<Schedules />} />
                <Route path="/schedules/create" element={<ScheduleCreate />} />
                <Route path="/schedules/:id" element={<ScheduleDetail />} />
                <Route path="/executions" element={<Executions />} />
                <Route path="/executions/:id" element={<ExecutionDetail />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;