import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './screens/Landing';

const Privacy = lazy(() => import('./screens/Privacy'));

export default function SiteRoot() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/privacy"
          element={
            <Suspense fallback={<div className="min-h-[100dvh] bg-bg" />}>
              <Privacy />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
