import React from 'react';
import type { ProjectStatus } from '../types';
import { formatWeekLabel } from '../utils/format';

const STATUS_META: Record<ProjectStatus, { label: string; className: string }> = {
  active: { label: 'I gang', className: 'bg-green-100 text-green-700 border-green-200' },
  completed: { label: 'Afsluttet', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  'on-hold': { label: 'På hold', className: 'bg-amber-100 text-amber-700 border-amber-200' },
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return '-';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
};

type StatProps = { label: string; value: number | string; hint?: string };

const StatCard = ({ label, value, hint }: StatProps) => (
  <div className="rounded-lg border border-slate-200 bg-white/60 p-3 shadow-sm">
    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    <p className="text-2xl font-semibold text-slate-800">{value}</p>
    {hint && <p className="text-xs text-slate-500">{hint}</p>}
  </div>
);

type ProjectReportHeaderProps = {
  projectName: string;
  projectStatus: ProjectStatus;
  projectStartDate?: string;
  projectEndDate?: string;
  reportWeekKey: string | null;
  stats: {
    risks: number;
    milestones: number;
    deliverables: number;
    phases: number;
    tasks: number;
  };
};

export const ProjectReportHeader = ({
  projectName,
  projectStatus,
  projectStartDate,
  projectEndDate,
  reportWeekKey,
  stats,
}: ProjectReportHeaderProps) => {
  const statusMeta = STATUS_META[projectStatus];
  const weekLabel = reportWeekKey ? formatWeekLabel(reportWeekKey) : 'Ingen rapport valgt';
  const dateRange = `${formatDate(projectStartDate)} – ${formatDate(projectEndDate)}`;

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Projekt</p>
          <h2 className="text-2xl font-bold text-slate-900">{projectName}</h2>
          <p className="text-sm text-slate-500">{weekLabel}</p>
        </div>
        <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}>
            {statusMeta.label}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{dateRange}</span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Risici" value={stats.risks} />
        <StatCard label="Faser" value={stats.phases} />
        <StatCard label="Milepæle" value={stats.milestones} />
        <StatCard label="Leverancer" value={stats.deliverables} />
        <StatCard label="Opgaver" value={stats.tasks} />
      </div>
    </section>
  );
};

export default ProjectReportHeader;
