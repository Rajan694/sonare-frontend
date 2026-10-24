import React, { lazy, Suspense } from 'react';
import Landing from './screens/Landing';

const Privacy = lazy(() => import('./screens/Privacy'));

export interface SiteRootProps {
  pathname?: string;
}

export default function SiteRoot({
  pathname = typeof window !== 'undefined' ? window.location.pathname : '/',
}: SiteRootProps = {}) {
  const isPrivacy = pathname.replace(/\/$/, '') === '/privacy';
  if (isPrivacy) {
    return (
      <Suspense fallback={<div className="min-h-[100dvh] bg-bg" />}>
        <Privacy />
      </Suspense>
    );
  }
  return <Landing />;
}
