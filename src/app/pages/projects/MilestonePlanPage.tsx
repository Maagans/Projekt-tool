import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { planApi, type PlanSnapshot, type PlanPhase, type PlanMilestone, type PlanDeliverable } from '../../../api/plan';
import { useProjectManager } from '../../../hooks/useProjectManager';
import { MilestonePlan } from '../../../components/milestone-plan/MilestonePlan';
import {
  Project as PlanProject,
  Phase,
  Milestone,
  Deliverable,
  Workstream,
  ProjectStatus as PlanProjectStatus,
} from '../../../types/milestone-plan';

const dateOnly = (value?: string | null) => (value ? value.substring(0, 10) : '');

export const MilestonePlanPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { projects, projectActions, employees, canManage } = useProjectManager();

  const project = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);

  const [planProject, setPlanProject] = useState<PlanProject | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phasePalette = useMemo(
    () => ['#e2e8f0', '#fee2e2', '#ffedd5', '#fef9c3', '#dcfce7', '#dbeafe', '#e0e7ff', '#f3e8ff', '#fae8ff'],
    [],
  );

  const sanitizePhaseColor = useCallback(
    (color?: string | null) => {
      if (!color) return phasePalette[0];
      const normalized = color.trim().toLowerCase();
      const mapped: Record<string, string> = {
        completed: '#dcfce7',
        active: '#dbeafe',
        planned: '#e2e8f0',
        green: '#dcfce7',
        blue: '#dbeafe',
        red: '#fee2e2',
        yellow: '#fef9c3',
      };
      const fromMap = mapped[normalized];
      if (fromMap) return fromMap;
      const exact = phasePalette.find((c) => c.toLowerCase() === normalized);
      return exact ?? phasePalette[0];
    },
    [phasePalette],
  );

  const projectMembers = useMemo(() => {
    if (!project || !project.projectMembers) return [];
    return project.projectMembers.map((pm) => {
      const employee = employees.find((e) => e.id === pm.employeeId);
      return {
        id: pm.employeeId,
        name: employee?.name || 'Unknown',
        role: pm.role,
      };
    });
  }, [project, employees]);

  const computePercentage = useCallback(
    (dateValue?: string | null) => {
      if (!project?.config.projectStartDate || !project?.config.projectEndDate || !dateValue) return null;
      const startMs = new Date(project.config.projectStartDate).getTime();
      const endMs = new Date(project.config.projectEndDate).getTime();
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
      const valueMs = new Date(dateValue).getTime();
      if (!Number.isFinite(valueMs)) return null;
      const pct = ((valueMs - startMs) / (endMs - startMs)) * 100;
      return Math.min(100, Math.max(0, Math.round(pct)));
    },
    [project],
  );

  const deriveDateFromPercentage = useCallback(
    (pct?: number | null) => {
      if (!project?.config.projectStartDate || !project?.config.projectEndDate || pct === undefined || pct === null)
        return '';
      const startMs = new Date(project.config.projectStartDate).getTime();
      const endMs = new Date(project.config.projectEndDate).getTime();
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return '';
      const clamped = Math.min(100, Math.max(0, pct));
      const dateMs = startMs + ((endMs - startMs) * clamped) / 100;
      return new Date(dateMs).toISOString().substring(0, 10);
    },
    [project],
  );

  const mapSnapshotToPlan = useCallback(
    (snapshot: PlanSnapshot): PlanProject => {
      const workstreamById: Record<string, string> =
        project?.workstreams?.reduce((acc, ws) => {
          if (ws.id) acc[ws.id] = ws.name;
          return acc;
        }, {} as Record<string, string>) ?? {};

      const phases: Phase[] = (snapshot.phases ?? []).map((p) => {
        const startDate = dateOnly(p.startDate) || deriveDateFromPercentage(p.startPercentage);
        const endDate = dateOnly(p.endDate) || deriveDateFromPercentage(p.endPercentage);
        return {
          id: p.id,
          name: p.label,
          startDate: startDate || '',
          endDate: endDate || '',
          status: (p.status as Phase['status']) || 'Planned',
          color: sanitizePhaseColor(p.highlight),
        };
      });

      const milestonesBase: Milestone[] = (snapshot.milestones ?? []).map((m) => ({
        id: m.id,
        title: m.label,
        date: dateOnly(m.dueDate) || '',
        status: (m.status as Milestone['status']) || 'Pending',
        workstream: m.workstreamId ? workstreamById[m.workstreamId] : undefined,
        deliverables: [],
      }));

      const milestoneById: Record<string, Milestone> = milestonesBase.reduce((acc, m) => {
        acc[m.id] = m;
        return acc;
      }, {} as Record<string, Milestone>);

      (snapshot.deliverables ?? []).forEach((d) => {
        if (!d.milestoneId || !milestoneById[d.milestoneId]) return;
        const deliverable: Deliverable = {
          id: d.id,
          title: d.label,
          status: (d.status as Deliverable['status']) || 'Pending',
          owner: d.ownerName || undefined,
          ownerId: d.ownerEmployeeId || undefined,
          description: d.description || undefined,
          notes: d.notes || undefined,
          startDate: dateOnly(d.startDate) || '',
          endDate: dateOnly(d.endDate) || '',
          progress: typeof d.progress === 'number' ? d.progress : 0,
          checklist: (d.checklist ?? []).map((i) => ({ id: i.id, text: i.text, completed: !!i.completed })),
        };
        milestoneById[d.milestoneId].deliverables = [
          ...(milestoneById[d.milestoneId].deliverables ?? []),
          deliverable,
        ];
      });

      return {
        id: snapshot.projectId,
        name: project?.config.projectName ?? '',
        department: '',
        status: PlanProjectStatus.ON_TRACK,
        manager: '',
        risks: [],
        description: '',
        phases,
        workstreams: project?.workstreams ?? [],
        milestones: Object.values(milestoneById),
        startDate: project?.config.projectStartDate,
        endDate: project?.config.projectEndDate,
      };
    },
    [deriveDateFromPercentage, project, sanitizePhaseColor],
  );

  const buildPayload = useCallback(
    (nextPlan: PlanProject) => {
      const workstreamLookup =
        project?.workstreams?.reduce((acc, ws) => {
          if (ws.id) acc[ws.name] = ws.id;
          return acc;
        }, {} as Record<string, string>) ?? {};

      const phases: PlanPhase[] = (nextPlan.phases ?? []).map((p, index) => ({
        id: p.id,
        label: p.name,
        startDate: p.startDate || null,
        endDate: p.endDate || null,
        startPercentage: computePercentage(p.startDate),
        endPercentage: computePercentage(p.endDate),
        highlight: p.color,
        status: p.status,
        workstreamId: null,
        sortOrder: index,
      }));

      const milestones: PlanMilestone[] = (nextPlan.milestones ?? []).map((m, index) => ({
        id: m.id,
        label: m.title,
        dueDate: m.date || null,
        position: index,
        status: m.status,
        workstreamId: m.workstream ? workstreamLookup[m.workstream] ?? null : null,
      }));

      const deliverables: PlanDeliverable[] = (nextPlan.milestones ?? []).flatMap((m, milestoneIndex) =>
        (m.deliverables ?? []).map((d, index) => ({
          id: d.id,
          milestoneId: m.id,
          label: d.title,
          position: index + milestoneIndex * 1000,
          status: d.status,
          ownerName: d.owner || null,
          ownerEmployeeId: d.ownerId || null,
          description: d.description || null,
          notes: d.notes || null,
          startDate: d.startDate || null,
          endDate: d.endDate || null,
          progress: typeof d.progress === 'number' ? d.progress : null,
          checklist: (d.checklist ?? []).map((i) => ({
            id: i.id,
            text: i.text,
            completed: !!i.completed,
          })),
        })),
      );

      return { phases, milestones, deliverables };
    },
    [computePercentage, project?.workstreams],
  );

  useEffect(() => {
    const loadSnapshot = async () => {
      if (!projectId || !project) return;
      setLoading(true);
      try {
        const snapshot = await planApi.getSnapshot(projectId);
        setGeneratedAt(snapshot.generatedAt);
        setPlanProject(mapSnapshotToPlan(snapshot));
        setError(null);
      } catch (err) {
        setError('Kunne ikke hente planen.');
        setPlanProject(null);
      } finally {
        setLoading(false);
      }
    };
    loadSnapshot();
  }, [mapSnapshotToPlan, project, projectId]);

  const persistPlan = useCallback(
    async (nextPlan: PlanProject) => {
      if (!project) return;
      setPlanProject(nextPlan);
      setSaving(true);
      try {
        const payload = buildPayload(nextPlan);
        await planApi.savePlan(project.id, payload);
        setError(null);
      } catch (err) {
        setError('Kunne ikke gemme planen.');
      } finally {
        setSaving(false);
      }
    },
    [buildPayload, project],
  );

  const handleSavePhase = async (phase: Phase) => {
    if (!planProject) return;
    const sanitized: Phase = {
      ...phase,
      color: sanitizePhaseColor(phase.color),
    };
    const index = planProject.phases.findIndex((p) => p.id === phase.id);
    const nextPhases = index >= 0
      ? planProject.phases.map((p, i) => (i === index ? sanitized : p))
      : [...planProject.phases, sanitized];
    await persistPlan({ ...planProject, phases: nextPhases });
  };

  const handleDeletePhase = async (phaseId: string) => {
    if (!planProject) return;
    await persistPlan({ ...planProject, phases: planProject.phases.filter((p) => p.id !== phaseId) });
  };

  const handleSaveMilestone = async (milestone: Milestone) => {
    if (!planProject) return;
    const index = planProject.milestones.findIndex((m) => m.id === milestone.id);
    const nextMilestone: Milestone = {
      ...milestone,
      deliverables: milestone.deliverables ?? planProject.milestones[index]?.deliverables ?? [],
    };
    const nextMilestones =
      index >= 0
        ? planProject.milestones.map((m, i) => (i === index ? nextMilestone : m))
        : [...planProject.milestones, nextMilestone];
    await persistPlan({ ...planProject, milestones: nextMilestones });
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!planProject) return;
    const nextMilestones = planProject.milestones.filter((m) => m.id !== milestoneId);
    await persistPlan({ ...planProject, milestones: nextMilestones });
  };

  const handleSaveDeliverable = async (milestoneId: string, deliverable: Deliverable) => {
    if (!planProject) return;
    const nextMilestones = planProject.milestones.map((m) => {
      if (m.id !== milestoneId) return m;
      const idx = (m.deliverables ?? []).findIndex((d) => d.id === deliverable.id);
      const nextDeliverable: Deliverable = {
        ...deliverable,
        checklist: (deliverable.checklist ?? []).map((i) => ({ ...i, completed: !!i.completed })),
      };
      const nextDeliverables =
        idx >= 0
          ? (m.deliverables ?? []).map((d, i) => (i === idx ? nextDeliverable : d))
          : [...(m.deliverables ?? []), nextDeliverable];
      return { ...m, deliverables: nextDeliverables };
    });
    await persistPlan({ ...planProject, milestones: nextMilestones });
  };

  const handleDeleteDeliverable = async (milestoneId: string, deliverableId: string) => {
    if (!planProject) return;
    const nextMilestones = planProject.milestones.map((m) =>
      m.id === milestoneId ? { ...m, deliverables: (m.deliverables ?? []).filter((d) => d.id !== deliverableId) } : m,
    );
    await persistPlan({ ...planProject, milestones: nextMilestones });
  };

  const handleSaveWorkstream = async (ws: Workstream) => {
    const actions = project && projectActions(project.id, null);
    if (!actions) return;
    const currentWorkstreams = project?.workstreams || [];
    const exists = currentWorkstreams.some((w) => w.id === ws.id);
    if (exists) {
      actions.workstreamManager.rename(ws.id, ws.name);
    } else {
      actions.workstreamManager.add(ws.name);
    }
  };

  const handleDeleteWorkstream = async (id: string) => {
    const actions = project && projectActions(project.id, null);
    if (actions) {
      actions.workstreamManager.delete(id);
    }
  };

  if (!project) return <div className="p-6">Projekt ikke fundet</div>;
  if (loading || !planProject) {
    return <div className="p-6">{error ?? 'Henter plan...'}</div>;
  }

  return (
    <div className="p-6 flex flex-col flex-1 h-full w-full">
      {generatedAt && (
        <div className="text-sm text-slate-500 mb-2">
          Snapshot genereret: {new Date(generatedAt).toLocaleString('da-DK')}
          {saving ? ' (gemmer...)' : ''}
          {error ? ` – ${error}` : ''}
        </div>
      )}
      <MilestonePlan
        project={planProject}
        readOnly={!canManage}
        onSavePhase={canManage ? handleSavePhase : async () => {}}
        onDeletePhase={canManage ? handleDeletePhase : async () => {}}
        onSaveMilestone={canManage ? handleSaveMilestone : async () => {}}
        onDeleteMilestone={canManage ? handleDeleteMilestone : async () => {}}
        onSaveDeliverable={canManage ? handleSaveDeliverable : async () => {}}
        onDeleteDeliverable={canManage ? handleDeleteDeliverable : async () => {}}
        onSaveWorkstream={canManage ? handleSaveWorkstream : () => {}}
        onDeleteWorkstream={canManage ? handleDeleteWorkstream : () => {}}
        projectMembers={projectMembers}
      />
      {error && <div className="text-red-600 text-sm mt-3">{error}</div>}
    </div>
  );
};
