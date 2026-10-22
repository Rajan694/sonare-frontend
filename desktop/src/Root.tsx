import React, { lazy, Suspense } from 'react';
import { CAPS } from './lib/caps';
import SiteRoot from './SiteRoot';

export const isSiteRoute = (pathname: string, caps = CAPS): boolean => {
  return caps.landing && (pathname === '/' || pathname.replace(/\/$/, '') === '/privacy');
};

export const isAdminRoute = (pathname: string, caps = CAPS): boolean => {
  return caps.admin && /^\/admin(\/|$)/.test(pathname);
};

export interface RootProps {
  pathname?: string;
  caps?: typeof CAPS;
  loadAppRoot?: () => Promise<{ default: React.ComponentType }>;
  loadAdminApp?: () => Promise<{ default: React.ComponentType }>;
}

const defaultLoadAdminApp = () => import('./admin/AdminApp');
const defaultLoadAppRoot = () => import('./AppRoot');

export const Root = ({
  pathname = typeof window !== 'undefined' ? window.location.pathname : '/',
  caps = CAPS,
  loadAppRoot = defaultLoadAppRoot,
  loadAdminApp = defaultLoadAdminApp,
}: RootProps) => {
  const isSite = isSiteRoute(pathname, caps);
  const isAdmin = isAdminRoute(pathname, caps);

  const AdminApp = React.useMemo(() => lazy(loadAdminApp), [loadAdminApp]);
  const AppRoot = React.useMemo(() => lazy(loadAppRoot), [loadAppRoot]);

  if (isAdmin) {
    return (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    );
  }

  if (isSite) {
    return <SiteRoot />;
  }

  return (
    <Suspense fallback={null}>
      <AppRoot />
    </Suspense>
  );
};
