import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { useProjectManager } from '../../../hooks/useProjectManager';

type AppLayoutProps = {
    children: ReactNode;
};

export const AppLayout = ({ children }: AppLayoutProps) => {
    const { isAdministrator, canManage } = useProjectManager();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <>
            <svg className="noise">
                <filter id="noiseFilter">
                    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
                </filter>
                <rect width="100%" height="100%" filter="url(#noiseFilter)" />
            </svg>
            <style>{`
        .noise {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          z-index: 100;
          opacity: 0.04;
          pointer-events: none;
          filter: contrast(150%) brightness(1000%);
        }
      `}</style>

            <div className="flex min-h-screen">
                <Sidebar
                    isAdministrator={isAdministrator}
                    canManage={canManage}
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed((prev) => !prev)}
                />
                <main
                    className={`flex-1 p-10 relative z-10 overflow-x-hidden transition-all duration-300 ${sidebarCollapsed ? 'ml-[88px]' : 'ml-[260px]'
                        }`}
                >
                    {children}
                </main>
            </div>
        </>
    );
};
