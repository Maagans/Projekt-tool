
import React, { useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectManager } from '../../../hooks/useProjectManager';
import { MilestonePlan } from '../../../components/milestone-plan/MilestonePlan';
import { Project as PlanProject, Phase, Milestone, Deliverable, Workstream, ProjectStatus as PlanProjectStatus, ChecklistItem } from '../../../types/milestone-plan';
import { ProjectState, DeliverableChecklistItem } from '../../../types';

export const MilestonePlanPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { projects, projectActions, employees } = useProjectManager();

    const project = useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);

    const latestReport = useMemo(() => {
        if (!project || !project.reports || project.reports.length === 0) return null;
        return [...project.reports].sort((a, b) => b.weekKey.localeCompare(a.weekKey))[0];
    }, [project]);

    const planProject: PlanProject | null = useMemo(() => {
        if (!project || !latestReport) return null;

        const state = latestReport.state;

        const milestones: Milestone[] = state.milestones.map(m => {
            const deliverables: Deliverable[] = state.deliverables
                .filter(d => d.milestoneId === m.id)
                .map(d => ({
                    id: d.id,
                    title: d.text,
                    status: (d.status as Deliverable['status']) || 'Pending',
                    owner: d.owner || undefined,
                    ownerId: d.ownerId || undefined,
                    description: d.description || undefined,
                    notes: d.notes || undefined,
                    checklist: (d.checklist || []).map(i => ({ id: i.id, text: i.text, completed: i.completed })),
                    startDate: d.startDate || undefined,
                    endDate: d.endDate || undefined,
                    progress: d.progress || 0
                }));

            const wsName = state.workstreams?.find(ws => ws.id === m.workstreamId)?.name;

            return {
                id: m.id,
                title: m.text,
                date: m.date || '',
                status: (m.status as Milestone['status']) || 'Pending',
                workstream: wsName,
                deliverables
            };
        });

        const phases: Phase[] = state.phases.map(p => ({
            id: p.id,
            name: p.text,
            startDate: p.startDate || '',
            endDate: p.endDate || '',
            status: (p.status as Phase['status']) || 'Planned'
        }));

        const workstreams: Workstream[] = project.workstreams || [];

        return {
            id: project.id,
            name: project.config.projectName,
            department: '',
            status: PlanProjectStatus.ON_TRACK,
            manager: '',
            risks: [],
            description: '',
            phases,
            workstreams,
            milestones,
            startDate: project.config.projectStartDate,
            endDate: project.config.projectEndDate
        };
    }, [project, latestReport]);

    const projectMembers = useMemo(() => {
        if (!project || !project.projectMembers) return [];
        return project.projectMembers.map(pm => {
            const employee = employees.find(e => e.id === pm.employeeId);
            return {
                id: pm.employeeId, // Use employeeId as the value for the dropdown
                name: employee?.name || 'Unknown',
                role: pm.role
            };
        });
    }, [project, employees]);

    const getActions = useCallback(() => {
        if (!project || !latestReport) return null;
        return projectActions(project.id, latestReport.weekKey);
    }, [project, latestReport, projectActions]);

    const handleUpdateState = useCallback((updates: Partial<ProjectState>) => {
        const actions = getActions();
        if (!actions || !latestReport) return;

        actions.reportsManager.replaceState({
            ...latestReport.state,
            ...updates
        });
    }, [getActions, latestReport]);

    const handleSavePhase = async (phase: Phase) => {
        if (!latestReport) return;
        const currentPhases = latestReport.state.phases;
        const index = currentPhases.findIndex(p => p.id === phase.id);

        const newPhase = {
            id: phase.id,
            text: phase.name,
            start: 0,
            end: 0,
            highlight: 'blue',
            startDate: phase.startDate || null,
            endDate: phase.endDate || null,
            status: phase.status,
            workstreamId: null
        };

        let updatedPhases;
        if (index >= 0) {
            updatedPhases = currentPhases.map((p, i) => i === index ? { ...p, ...newPhase } : p);
        } else {
            updatedPhases = [...currentPhases, newPhase];
        }

        handleUpdateState({ phases: updatedPhases });
    };

    const handleDeletePhase = async (phaseId: string) => {
        if (!latestReport) return;
        const updatedPhases = latestReport.state.phases.filter(p => p.id !== phaseId);
        handleUpdateState({ phases: updatedPhases });
    };

    const handleSaveMilestone = async (milestone: Milestone) => {
        if (!latestReport || !project) return;
        const currentMilestones = latestReport.state.milestones;
        const index = currentMilestones.findIndex(m => m.id === milestone.id);

        const wsId = project.workstreams?.find(ws => ws.name === milestone.workstream)?.id || null;

        const newMilestone = {
            id: milestone.id,
            text: milestone.title,
            position: 0,
            date: milestone.date || null,
            status: milestone.status,
            workstreamId: wsId
        };

        let updatedMilestones;
        if (index >= 0) {
            updatedMilestones = currentMilestones.map((m, i) => i === index ? { ...m, ...newMilestone } : m);
        } else {
            updatedMilestones = [...currentMilestones, newMilestone];
        }

        let updatedDeliverables = latestReport.state.deliverables;
        if (milestone.deliverables) {
            updatedDeliverables = updatedDeliverables.filter(d => d.milestoneId !== milestone.id);
            const newDeliverables = milestone.deliverables.map(d => ({
                id: d.id,
                text: d.title,
                position: 0,
                milestoneId: milestone.id,
                status: d.status,
                owner: d.owner || null,
                ownerId: d.ownerId || null,
                description: d.description || null,
                notes: d.notes || null,
                startDate: d.startDate || null,
                endDate: d.endDate || null,
                progress: d.progress || 0,
                checklist: (d.checklist || []).map(i => ({ id: i.id, text: i.text, completed: i.completed })) as DeliverableChecklistItem[]
            }));
            updatedDeliverables = [...updatedDeliverables, ...newDeliverables];
        }

        handleUpdateState({ milestones: updatedMilestones, deliverables: updatedDeliverables });
    };

    const handleDeleteMilestone = async (milestoneId: string) => {
        if (!latestReport) return;
        const updatedMilestones = latestReport.state.milestones.filter(m => m.id !== milestoneId);
        const updatedDeliverables = latestReport.state.deliverables.filter(d => d.milestoneId !== milestoneId);
        handleUpdateState({ milestones: updatedMilestones, deliverables: updatedDeliverables });
    };

    const handleSaveDeliverable = async (milestoneId: string, deliverable: Deliverable) => {
        if (!latestReport) return;
        const currentDeliverables = latestReport.state.deliverables;
        const index = currentDeliverables.findIndex(d => d.id === deliverable.id);

        const newDeliverable = {
            id: deliverable.id,
            text: deliverable.title,
            position: 0,
            milestoneId: milestoneId,
            status: deliverable.status,
            owner: deliverable.owner || null,
            ownerId: deliverable.ownerId || null,
            description: deliverable.description || null,
            notes: deliverable.notes || null,
            startDate: deliverable.startDate || null,
            endDate: deliverable.endDate || null,
            progress: deliverable.progress || 0,
            checklist: (deliverable.checklist || []).map(i => ({ id: i.id, text: i.text, completed: i.completed })) as DeliverableChecklistItem[]
        };

        let updatedDeliverables;
        if (index >= 0) {
            updatedDeliverables = currentDeliverables.map((d, i) => i === index ? { ...d, ...newDeliverable } : d);
        } else {
            updatedDeliverables = [...currentDeliverables, newDeliverable];
        }

        handleUpdateState({ deliverables: updatedDeliverables });
    };

    const handleDeleteDeliverable = async (milestoneId: string, deliverableId: string) => {
        if (!latestReport) return;
        const updatedDeliverables = latestReport.state.deliverables.filter(d => d.id !== deliverableId);
        handleUpdateState({ deliverables: updatedDeliverables });
    };

    const handleSaveWorkstream = async (ws: Workstream) => {
        const actions = getActions();
        if (!actions) return;

        const currentWorkstreams = project?.workstreams || [];
        const exists = currentWorkstreams.some(w => w.id === ws.id);

        if (exists) {
            actions.workstreamManager.rename(ws.id, ws.name);
        } else {
            actions.workstreamManager.add(ws.name);
        }
    };

    const handleDeleteWorkstream = async (id: string) => {
        const actions = getActions();
        if (actions) {
            actions.workstreamManager.delete(id);
        }
    };

    if (!project) return <div>Projekt ikke fundet</div>;
    if (!planProject) return <div>Ingen rapport data fundet</div>;

    return (
        <div className="p-6 flex flex-col flex-1 h-full w-full">
            <MilestonePlan
                project={planProject}
                onSavePhase={handleSavePhase}
                onDeletePhase={handleDeletePhase}
                onSaveMilestone={handleSaveMilestone}
                onDeleteMilestone={handleDeleteMilestone}
                onSaveDeliverable={handleSaveDeliverable}
                onDeleteDeliverable={handleDeleteDeliverable}
                onSaveWorkstream={handleSaveWorkstream}
                onDeleteWorkstream={handleDeleteWorkstream}
                projectMembers={projectMembers}
            />
        </div>
    );
};
