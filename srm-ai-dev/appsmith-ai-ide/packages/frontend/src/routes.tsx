import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { Layout } from './components/shared/Layout';

import LoginPage from './pages/LoginPage';
import PageListPage from './pages/PageListPage';
import IDEPage from './pages/IDEPage';
import DepsPage from './pages/DepsPage';
import SkillsPage from './pages/SkillsPage';
import SystemConfigPage from './pages/SystemConfigPage';
import ContainerOpsPage from './pages/ContainerOpsPage';

/**
 * ProtectedRoute checks if user is authenticated.
 * Redirects to /login if not.
 */
export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

/**
 * AdminRoute checks if user has admin role.
 * Redirects to /pages if not admin.
 */
export const AdminRoute: React.FC = () => {
  const { userInfo } = useAuthStore();

  if (userInfo?.role !== 'admin') {
    return <Navigate to="/pages" replace />;
  }

  return <Outlet />;
};

export const routeConfig = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        index: true,
        element: <Navigate to="/pages" replace />,
      },
      {
        path: 'pages',
        element: <PageListPage />,
      },
      {
        path: 'ide/:pageId',
        element: <IDEPage />,
      },
      {
        element: <AdminRoute />,
        children: [
          {
            path: 'deps',
            element: <DepsPage />,
          },
          {
            path: 'skills',
            element: <SkillsPage />,
          },
          {
            path: 'system-config',
            element: <SystemConfigPage />,
          },
          {
            path: 'container-ops',
            element: <ContainerOpsPage />,
          },
        ],
      },
    ],
  },
];
