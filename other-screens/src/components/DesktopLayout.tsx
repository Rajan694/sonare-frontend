import React from 'react';
import Sidebar from './DesktopSidebar';
import Topbar from './DesktopTopbar';
import BottomPlayer from './DesktopBottomPlayer';

interface DesktopLayoutProps {
  children: React.ReactNode;
}

export default function DesktopLayout({ children }: DesktopLayoutProps) {
  return (
    <div className="scr col" style={{ width: '1440px', height: '900px' }}>
      <div className="row grow" style={{ overflow: 'hidden' }}>
        <Sidebar />
        <div className="col grow" style={{ overflow: 'hidden', minWidth: '0' }}>
          <Topbar />
          <div className="col grow" style={{ overflow: 'hidden', position: 'relative' }}>
            {children}
          </div>
        </div>
      </div>
      <BottomPlayer />
    </div>
  );
}
