import type { CSSProperties } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../../../components/branding/BrandLogo';
import {
    UsersIcon,
    OrganizationIcon,
    UserIcon,
    HomeIcon,
    FolderOpenIcon,
    ClockIcon,
    CalendarIcon,
    WarningTriangleIcon,
    SettingsIcon,
    ArrowLeftIcon
} from '../../../components/Icons';
import { PROJECT_RISK_ANALYSIS_ENABLED } from '../../constants';
import { useProjectManager } from '../../../hooks/useProjectManager';
import { WorkspaceSwitcher } from '../../../components/WorkspaceSwitcher';

type SidebarProps = {
    isAdministrator: boolean;
    canManage: boolean;
    collapsed: boolean;
    onToggle: () => void;
};

export const Sidebar = ({ isAdministrator, canManage, collapsed, onToggle }: SidebarProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { getProjectById } = useProjectManager();

    // Parse projectId from URL path since we're outside the route context
    const projectMatch = location.pathname.match(/^\/projects\/([^/]+)/);
    const projectId = projectMatch ? projectMatch[1] : null;

    // Check if we're viewing a project
    const isProjectView = Boolean(projectId);
    const currentProject = isProjectView && projectId ? getProjectById(projectId) : null;

    const isActive = (path: string, exact = true) => {
        if (exact) {
            return location.pathname === path;
        }
        return location.pathname.startsWith(path);
    };

    const isProjectTabActive = (tabPath: string) => {
        const fullPath = `/projects/${projectId}${tabPath ? `/${tabPath}` : ''}`;
        if (tabPath === '') {
            return location.pathname === `/projects/${projectId}` || location.pathname === `/projects/${projectId}/`;
        }
        return location.pathname.startsWith(fullPath);
    };

    const NavItem = ({
        to,
        icon: Icon,
        label,
        active,
        iconScale = 1,
    }: {
        to: string;
        icon: React.ComponentType<{ className?: string }>;
        label: string;
        active: boolean;
        iconScale?: number;
    }) => {
        const iconStyle = iconScale !== 1 ? ({ '--icon-scale': iconScale } as CSSProperties) : undefined;
        return (
            <Link
                to={to}
                className={`nav-item ${active ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
                title={collapsed ? label : undefined}
                aria-label={collapsed ? label : undefined}
            >
                <span className="nav-icon" style={iconStyle}>
                    <Icon className="w-5 h-5" />
                </span>
                <span className={collapsed ? 'sr-only' : ''}>{label}</span>
            </Link>
        );
    };

    // Project-specific tabs
    const projectTabs = [
        { key: 'overview', label: 'Overblik', path: '', icon: FolderOpenIcon },
        { key: 'reports', label: 'Rapporter', path: 'reports', icon: ClockIcon },
        { key: 'plan', label: 'Tidsplan', path: 'plan', icon: CalendarIcon },
        { key: 'organization', label: 'Ressourcer', path: 'organization', icon: UsersIcon, iconScale: 1.2 },
    ];

    if (PROJECT_RISK_ANALYSIS_ENABLED) {
        projectTabs.push({ key: 'risks', label: 'Risikovurdering', path: 'risks', icon: WarningTriangleIcon });
    }

    if (canManage) {
        projectTabs.push({ key: 'settings', label: 'Indstillinger', path: 'settings', icon: SettingsIcon });
    }

    return (
        <nav
            className={`fixed top-0 left-0 h-screen border-r border-slate-200 bg-white flex flex-col gap-6 z-50 shadow-sm transition-all duration-300 ${collapsed ? 'w-[88px] p-4' : 'w-[260px] p-8'
                }`}
        >
            {/* LOGO */}
            <div className={`mb-2 flex items-center gap-2 ${collapsed ? 'flex-col' : 'justify-between'}`}>
                <div className={`transition-all ${collapsed ? 'w-10' : 'w-36'}`}>
                    <BrandLogo className="w-full text-[var(--fiber-teal)]" />
                </div>
                <button
                    type="button"
                    onClick={onToggle}
                    className="rounded-full border border-slate-200 bg-white p-1 text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700"
                    aria-label={collapsed ? 'Udvid sidebar' : 'Sammenfold sidebar'}
                    title={collapsed ? 'Udvid sidebar' : 'Sammenfold sidebar'}
                >
                    <ArrowLeftIcon className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* WORKSPACE SWITCHER - only on dashboard */}
            {!collapsed && !isProjectView && (
                <WorkspaceSwitcher className="mb-2" />
            )}

            {isProjectView && currentProject ? (
                <>
                    {/* BACK TO DASHBOARD */}
                    <button
                        onClick={() => navigate('/')}
                        className={`back-button flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4 ${collapsed ? 'justify-center' : ''}`}
                        aria-label="Tilbage til dashboard"
                        title="Tilbage til dashboard"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        {!collapsed && <span>Tilbage til dashboard</span>}
                    </button>

                    {/* PROJECT TABS - Main Navigation */}
                    <div className="flex flex-col gap-1">
                        {projectTabs.filter(tab => tab.key !== 'settings').map((tab) => (
                            <NavItem
                                key={tab.key}
                                to={`/projects/${projectId}/${tab.path}`}
                                icon={tab.icon}
                                label={tab.label}
                                active={isProjectTabActive(tab.path)}
                                iconScale={tab.iconScale}
                            />
                        ))}
                    </div>

                    {/* PROJECT SETTINGS - Bottom */}
                    {canManage && (
                        <div className="mt-auto flex flex-col gap-1">
                            <NavItem
                                to={`/projects/${projectId}/settings`}
                                icon={SettingsIcon}
                                label="Indstillinger"
                                active={isProjectTabActive('settings')}
                            />
                        </div>
                    )}
                </>
            ) : (
                <>
                    {/* DASHBOARD NAV GROUP */}
                    <div className="flex flex-col gap-1">
                        <NavItem
                            to="/"
                            icon={HomeIcon}
                            label="Dashboard"
                            active={isActive('/')}
                        />

                        {canManage && (
                            <NavItem
                                to="/pmo"
                                icon={OrganizationIcon}
                                label="PMO Dashboard"
                                active={isActive('/pmo')}
                            />
                        )}

                        {canManage && (
                            <NavItem
                                to="/employees"
                                icon={UsersIcon}
                                label="Medarbejder Database"
                                active={isActive('/employees')}
                            />
                        )}
                    </div>

                    {/* BOTTOM GROUP */}
                    <div className="mt-auto flex flex-col gap-1">
                        {isAdministrator && (
                            <NavItem
                                to="/admin"
                                icon={UserIcon}
                                label="Admin Panel"
                                active={isActive('/admin', false)}
                            />
                        )}
                    </div>
                </>
            )}

            <style>{`
        .nav-item {
          padding: 10px 14px;
          border-radius: 10px;
          color: var(--text-dim);
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nav-item.collapsed {
          justify-content: center;
          padding: 10px;
        }

        .nav-icon {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
          transition: background 0.2s ease, border-color 0.2s ease;
          transform-origin: center;
        }

        .nav-icon svg {
          transform: scale(var(--icon-scale, 1));
          transform-origin: center;
        }

        .nav-item:hover {
          color: var(--text-main);
          background: rgba(0, 0, 0, 0.04);
        }

        .nav-item.active {
          color: var(--fiber-teal);
          background: rgba(13, 148, 136, 0.08);
          font-weight: 600;
        }

        .nav-item.active .nav-icon {
          background: #ffffff;
          border-color: rgba(13, 148, 136, 0.2);
        }

        .back-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }

        .back-button:hover {
          color: var(--fiber-teal);
        }
      `}</style>
        </nav>
    );
};
