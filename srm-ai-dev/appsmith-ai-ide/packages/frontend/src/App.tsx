import React from 'react';
import { BrowserRouter, useRoutes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './services/api';
import { routeConfig } from './routes';
import { useSessionRecovery } from './hooks/useSessionRecovery';

const AppRoutes: React.FC = () => {
  const routes = useRoutes(routeConfig);
  const { loading, error } = useSessionRecovery();

  if (loading) {
    return (
      <div className="loading-screen on">
        <div className="spin" />
        <div className="load-h">恢复会话中...</div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="toast on red" style={{ position: 'fixed', top: 16, bottom: 'auto' }}>
          {error}
        </div>
      )}
      {routes}
    </>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
};
