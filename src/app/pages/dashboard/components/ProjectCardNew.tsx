
import { useNavigate } from 'react-router-dom';
import type { Project } from '../../../../types';

type ProjectCardProps = {
    project: Project;
    colorTheme?: 'teal' | 'purple' | 'amber';
};

export const ProjectCardNew = ({ project, colorTheme = 'teal' }: ProjectCardProps) => {
    const navigate = useNavigate();

    const getThemeColors = () => {
        switch (colorTheme) {
            case 'purple': return {
                accent: '#7c3aed',
                bg: 'rgba(124, 58, 237, 0.08)',
                border: 'rgba(124, 58, 237, 0.2)'
            };
            case 'amber': return {
                accent: '#f59e0b',
                bg: 'rgba(245, 158, 11, 0.08)',
                border: 'rgba(245, 158, 11, 0.2)'
            };
            case 'teal':
            default: return {
                accent: '#0d9488',
                bg: 'rgba(13, 148, 136, 0.08)',
                border: 'rgba(13, 148, 136, 0.2)'
            };
        }
    };

    const colors = getThemeColors();

    // Find project leader from projectMembers
    const projectLeader = project.projectMembers?.find(m =>
        m.isProjectLead ||
        m.role?.toLowerCase().includes('projektleder') ||
        m.role?.toLowerCase().includes('project manager') ||
        m.role?.toLowerCase().includes('leder')
    );

    // Count team members
    const teamMemberCount = project.projectMembers?.length || 0;

    // Get status label
    const getStatusLabel = () => {
        switch (project.status) {
            case 'active': return 'I gang';
            case 'completed': return 'Fuldført';
            case 'on-hold': return 'På hold';
            default: return project.status;
        }
    };

    const getStatusColor = () => {
        switch (project.status) {
            case 'active': return 'bg-emerald-100 text-emerald-700';
            case 'completed': return 'bg-blue-100 text-blue-700';
            case 'on-hold': return 'bg-amber-100 text-amber-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div
            className="project-card group relative overflow-hidden rounded-xl bg-white border border-slate-200 p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
            onClick={() => navigate(`/projects/${project.id}`)}
        >
            {/* Color Bar */}
            <div
                className="absolute top-0 left-0 w-1 h-full transition-all duration-300"
                style={{ backgroundColor: colors.accent }}
            />

            {/* Header: Name + Status */}
            <div className="flex justify-between items-start mb-4 pl-3">
                <h3 className="text-lg font-semibold text-slate-800 group-hover:text-slate-900 transition-colors pr-2">
                    {project.config?.projectName || 'Projekt'}
                </h3>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${getStatusColor()}`}>
                    {getStatusLabel()}
                </span>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 pl-3 text-sm">
                {/* Project Leader */}
                <div>
                    <span className="block text-xs text-slate-400 mb-0.5">Projektleder</span>
                    <p className="font-medium text-slate-700 truncate">
                        {projectLeader?.role || 'Ikke tildelt'}
                    </p>
                </div>

                {/* Team Members */}
                <div>
                    <span className="block text-xs text-slate-400 mb-0.5">Teammedlemmer</span>
                    <p className="font-medium text-slate-700">
                        {teamMemberCount} {teamMemberCount === 1 ? 'person' : 'personer'}
                    </p>
                </div>

                {/* Start Date */}
                <div>
                    <span className="block text-xs text-slate-400 mb-0.5">Startdato</span>
                    <p className="font-medium text-slate-700">
                        {project.config?.projectStartDate || '-'}
                    </p>
                </div>

                {/* End Date */}
                <div>
                    <span className="block text-xs text-slate-400 mb-0.5">Slutdato</span>
                    <p className="font-medium text-slate-700">
                        {project.config?.projectEndDate || '-'}
                    </p>
                </div>
            </div>

            {/* Bottom accent bar */}
            <div
                className="h-0.5 rounded-full mt-4 ml-3"
                style={{ backgroundColor: colors.accent, width: '40px' }}
            />
        </div>
    );
};
