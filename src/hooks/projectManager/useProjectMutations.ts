// Project mutations module extracted from useWorkspaceModule
import { useCallback, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../api';
import type {
    Project,
    ProjectConfig,
    ProjectState,
    ProjectStatus,
    Report,
    Workstream,
} from '../../types';
import { generateId, getInitialProjectState } from './utils';
import { PROJECT_SYNC_DEBOUNCE_MS, type MutationContext, type ProjectUpdater } from './workspaceUtils';

export interface ProjectMutationsConfig {
    projects: Project[];
    setProjects: (updater: (prev: Project[]) => Project[]) => void;
    mutationContext: MutationContext;
}

export const useProjectMutations = (config: ProjectMutationsConfig) => {
    const { projects, setProjects, mutationContext } = config;
    const { beginMutation, endMutation, handleMutationError, syncWorkspaceCache } = mutationContext;

    // Project CRUD mutations
    const createProjectMutation = useMutation({
        mutationFn: (project: Project) => api.createProject(project),
        onMutate: () => {
            beginMutation();
        },
        onSuccess: (createdProject) => {
            syncWorkspaceCache((previous) => {
                if (!previous) return previous;
                return {
                    ...previous,
                    projects: [...previous.projects.filter((p) => p.id !== createdProject.id), createdProject],
                };
            });
        },
        onError: async (error: unknown) => {
            await handleMutationError(error, 'Kunne ikke oprette projektet.');
        },
        onSettled: () => {
            endMutation();
        },
    });

    const updateProjectMutation = useMutation({
        mutationFn: (project: Partial<Project> & { id: string }) => api.updateProject(project),
        onMutate: () => {
            beginMutation();
        },
        onSuccess: (updatedProject) => {
            syncWorkspaceCache((previous) => {
                if (!previous) return previous;
                return {
                    ...previous,
                    projects: previous.projects.map((p) => (p.id === updatedProject.id ? updatedProject : p)),
                };
            });
        },
        onError: async (error: unknown) => {
            await handleMutationError(error, 'Kunne ikke opdatere projektet.');
        },
        onSettled: () => {
            endMutation();
        },
    });

    const deleteProjectMutation = useMutation({
        mutationFn: (projectId: string) => api.deleteProject(projectId),
        onMutate: () => {
            beginMutation();
        },
        onSuccess: (_, projectId) => {
            syncWorkspaceCache((previous) => {
                if (!previous) return previous;
                return {
                    ...previous,
                    projects: previous.projects.filter((p) => p.id !== projectId),
                };
            });
        },
        onError: async (error: unknown) => {
            await handleMutationError(error, 'Kunne ikke slette projektet.');
        },
        onSettled: () => {
            endMutation();
        },
    });

    // Project sync queue for debounced updates
    const projectSyncQueue = useRef(
        new Map<string, { patch: Partial<Project>; timer: ReturnType<typeof setTimeout> | null }>(),
    );

    const flushProjectSync = useCallback(
        (projectId: string) => {
            const entry = projectSyncQueue.current.get(projectId);
            if (!entry) return;
            if (entry.timer) {
                clearTimeout(entry.timer);
            }
            projectSyncQueue.current.delete(projectId);
            updateProjectMutation.mutate({ id: projectId, ...entry.patch });
        },
        [updateProjectMutation],
    );

    const scheduleProjectSync = useCallback(
        (projectId: string, patch: Partial<Project>) => {
            const existing = projectSyncQueue.current.get(projectId);
            const mergedPatch: Partial<Project> = { ...(existing?.patch ?? {}), ...patch };

            if (existing?.patch?.config || patch.config) {
                mergedPatch.config = {
                    ...(existing?.patch?.config ?? {}),
                    ...(patch.config ?? {}),
                } as ProjectConfig;
            }

            if (patch.reports) {
                mergedPatch.reports = patch.reports;
            }

            if (existing?.timer) {
                clearTimeout(existing.timer);
            }

            const timer = setTimeout(() => flushProjectSync(projectId), PROJECT_SYNC_DEBOUNCE_MS);
            projectSyncQueue.current.set(projectId, { patch: mergedPatch, timer });
        },
        [flushProjectSync],
    );

    // Flush pending syncs on unmount
    useEffect(
        () => () => {
            projectSyncQueue.current.forEach((_, projectId) => flushProjectSync(projectId));
        },
        [flushProjectSync],
    );

    const updateProjects = useCallback(
        (updater: ProjectUpdater) => {
            setProjects((prev) => updater(prev));
        },
        [setProjects],
    );

    // High-level project actions
    const createNewProject = useCallback(
        (name: string): Project | null => {
            const normalizedName = name.trim();
            if (!normalizedName) {
                alert('Projektnavn er påkrævet.');
                return null;
            }

            if (projects.some((p) => p.config.projectName.toLowerCase() === normalizedName.toLowerCase())) {
                alert('Et projekt med dette navn eksisterer allerede.');
                return null;
            }

            const today = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 6);
            const initialPlanState = getInitialProjectState();
            const initialWorkstreams = (initialPlanState.workstreams ?? []).map((stream, index) => ({
                ...stream,
                order: typeof stream.order === 'number' ? stream.order : index,
            }));

            const newProject: Project = {
                id: generateId(),
                config: {
                    projectName: normalizedName,
                    projectStartDate: today.toISOString().split('T')[0],
                    projectEndDate: endDate.toISOString().split('T')[0],
                    heroImageUrl: null,
                    projectGoal: '',
                    businessCase: '',
                    totalBudget: null,
                },
                reports: [],
                projectMembers: [],
                status: 'active',
                permissions: { canEdit: true, canLogTime: true },
                workstreams: initialWorkstreams,
            };

            setProjects((prev) => [...prev, newProject]);
            createProjectMutation.mutate(newProject);
            return newProject;
        },
        [createProjectMutation, projects, setProjects],
    );

    const deleteProject = useCallback(
        (projectId: string) => {
            setProjects((prev) => prev.filter((p) => p.id !== projectId));
            deleteProjectMutation.mutate(projectId);
        },
        [deleteProjectMutation, setProjects],
    );

    const updateProjectConfig = useCallback(
        (projectId: string, newConfig: Partial<ProjectConfig>) => {
            const nextName = typeof newConfig.projectName === 'string' ? newConfig.projectName.trim() : null;
            if (
                nextName &&
                projects.some(
                    (p) => p.id !== projectId && p.config.projectName.trim().toLowerCase() === nextName.toLowerCase(),
                )
            ) {
                alert('Et projekt med dette navn eksisterer allerede.');
                return;
            }

            let nextConfig: ProjectConfig | null = null;
            updateProjects((prevProjects) =>
                prevProjects.map((project) => {
                    if (project.id !== projectId) return project;
                    const normalizedConfig = nextName ? { ...newConfig, projectName: nextName } : newConfig;
                    nextConfig = { ...project.config, ...normalizedConfig };
                    return { ...project, config: nextConfig };
                }),
            );

            if (nextConfig) {
                scheduleProjectSync(projectId, { config: nextConfig });
            }
        },
        [projects, scheduleProjectSync, updateProjects],
    );

    const updateProjectStatus = useCallback(
        (projectId: string, status: ProjectStatus) => {
            let didUpdate = false;
            updateProjects((prevProjects) =>
                prevProjects.map((project) => {
                    if (project.id !== projectId || project.status === status) return project;
                    didUpdate = true;
                    return { ...project, status };
                }),
            );

            if (didUpdate) {
                scheduleProjectSync(projectId, { status });
            }
        },
        [scheduleProjectSync, updateProjects],
    );

    const updateProjectState = useCallback(
        (projectId: string, weekKey: string, updater: (prevState: ProjectState) => ProjectState) => {
            let nextReports: Report[] | null = null;
            updateProjects((prevProjects) =>
                prevProjects.map((project) => {
                    if (project.id !== projectId) return project;
                    const reportIndex = project.reports.findIndex((r) => r.weekKey === weekKey);
                    if (reportIndex === -1) return project;

                    const updatedReport: Report = {
                        ...project.reports[reportIndex],
                        state: updater(project.reports[reportIndex].state),
                    };

                    const updatedReports = [...project.reports];
                    updatedReports[reportIndex] = updatedReport;
                    nextReports = updatedReports;
                    return { ...project, reports: updatedReports };
                }),
            );

            if (nextReports) {
                scheduleProjectSync(projectId, { reports: nextReports });
            }
        },
        [scheduleProjectSync, updateProjects],
    );

    const updateProjectWorkstreams = useCallback(
        (projectId: string, updater: (current: Workstream[]) => Workstream[]) => {
            let nextWorkstreams: Workstream[] | null = null;
            updateProjects((prevProjects) =>
                prevProjects.map((project) => {
                    if (project.id !== projectId) return project;
                    nextWorkstreams = updater(project.workstreams ?? []);
                    return { ...project, workstreams: nextWorkstreams };
                }),
            );

            if (nextWorkstreams) {
                scheduleProjectSync(projectId, { workstreams: nextWorkstreams });
            }
        },
        [scheduleProjectSync, updateProjects],
    );

    return {
        // Mutations
        createProjectMutation,
        updateProjectMutation,
        deleteProjectMutation,
        // Sync utilities
        scheduleProjectSync,
        flushProjectSync,
        updateProjects,
        // High-level actions
        createNewProject,
        deleteProject,
        updateProjectConfig,
        updateProjectStatus,
        updateProjectState,
        updateProjectWorkstreams,
    };
};
