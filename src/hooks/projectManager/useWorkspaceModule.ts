import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { DEFAULT_EMPLOYEE_CAPACITY } from '../../constants';
import {
  Deliverable,
  Employee,
  KanbanTask,
  Location,
  Milestone,
  Phase,
  Project,
  ProjectConfig,
  ProjectMember,
  ProjectState,
  ProjectStatus,
  Report,
  Workstream,
  locations,
} from '../../types';
import type { WorkspaceData, WorkspaceSettings } from '../../types';
import type { ProjectManagerStore } from './store';
import {
  TimelineItemType,
  TimelineUpdatePayload,
  cloneStateWithNewIds,
  generateId,
  getErrorMessage,
  getInitialProjectState,
  getWeekKey,
} from './utils';

type ProjectUpdater = (prev: Project[]) => Project[];
type EmployeeUpdater = (prev: Employee[]) => Employee[];
const WORKSPACE_QUERY_KEY = ['workspace'] as const;

const PROJECT_SYNC_DEBOUNCE_MS = 400;
const clampPercentage = (value: number) => Math.max(0, Math.min(100, value));
const parseDateOnlyToUtcDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number.parseInt(yearStr ?? '', 10);
  const month = Number.parseInt(monthStr ?? '', 10);
  const day = Number.parseInt(dayStr ?? '', 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return new Date(Date.UTC(year, month - 1, day));
};
const toUtcTimestamp = (value?: string | null): number | null => {
  const date = parseDateOnlyToUtcDate(value);
  return date ? date.getTime() : null;
};

const sanitizeHours = (value: number | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;

const sanitizeCapacity = (value: unknown, fallback: number = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
};

const CSV_CAPACITY_HEADERS = new Set([
  'kapacitet',
  'kapacitet (timer/uge)',
  'kapacitet (timer per uge)',
  'kapacitet timer/uge',
]);

const parseCapacityFromCsv = (value: string | undefined, fallback: number) => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.replace(',', '.').trim();
  if (normalized === '') {
    return fallback;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
};

export const useWorkspaceModule = (store: ProjectManagerStore) => {
  const {
    projects,
    setProjects,
    setEmployees,
    isAuthenticated,
    setIsSaving,
    setApiError,
    isBootstrapping,
    setIsBootstrapping,
  } = store;

  const setWorkspaceSettingsState = store.setWorkspaceSettings;

  const queryClient = useQueryClient();
  const pendingMutations = useRef(0);
  const beginMutation = () => {
    pendingMutations.current += 1;
    setIsSaving(true);
    setApiError(null);
  };

  const endMutation = () => {
    pendingMutations.current = Math.max(0, pendingMutations.current - 1);
    if (pendingMutations.current === 0) {
      setIsSaving(false);
    }
  };

  const invalidateWorkspace = async () => {
    await queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_KEY });
  };

  const handleMutationError = async (error: unknown, fallbackMessage: string) => {
    console.error(fallbackMessage, error);
    setApiError(fallbackMessage);
    await invalidateWorkspace();
  };

  const createEmployeeMutation = useMutation({
    mutationFn: (employee: Partial<Employee> & { name: string; email: string; id?: string }) =>
      api.createEmployee(employee),
    onMutate: () => {
      beginMutation();
    },
    onSuccess: (createdEmployee) => {
      syncWorkspaceCache((previous) => {
        if (!previous) {
          return previous;
        }
        return {
          ...previous,
          employees: [...previous.employees.filter((employee) => employee.id !== createdEmployee.id), createdEmployee],
        };
      });
    },
    onError: async (error: unknown) => {
      await handleMutationError(error, 'Kunne ikke oprette medarbejderen.');
    },
    onSettled: () => {
      endMutation();
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ employeeId, updates }: { employeeId: string; updates: Partial<Employee> }) =>
      api.updateEmployee(employeeId, updates),
    onMutate: () => {
      beginMutation();
    },
    onSuccess: (updatedEmployee) => {
      syncWorkspaceCache((previous) => {
        if (!previous) {
          return previous;
        }
        return {
          ...previous,
          employees: previous.employees.map((employee) => (employee.id === updatedEmployee.id ? updatedEmployee : employee)),
        };
      });
    },
    onError: async (error: unknown) => {
      await handleMutationError(error, 'Kunne ikke opdatere medarbejderen.');
    },
    onSettled: () => {
      endMutation();
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: (employeeId: string) => api.deleteEmployee(employeeId),
    onMutate: () => {
      beginMutation();
    },
    onSuccess: (_, employeeId) => {
      syncWorkspaceCache((previous) => {
        if (!previous) {
          return previous;
        }
        return {
          ...previous,
          employees: previous.employees.filter((employee) => employee.id !== employeeId),
        };
      });
    },
    onError: async (error: unknown) => {
      await handleMutationError(error, 'Kunne ikke slette medarbejderen.');
    },
    onSettled: () => {
      endMutation();
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: (project: Project) => api.createProject(project),
    onMutate: () => {
      beginMutation();
    },
    onSuccess: (createdProject) => {
      syncWorkspaceCache((previous) => {
        if (!previous) {
          return previous;
        }
        return {
          ...previous,
          projects: [...previous.projects.filter((project) => project.id !== createdProject.id), createdProject],
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
          projects: previous.projects.map((project) => (project.id === updatedProject.id ? updatedProject : project)),
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
          projects: previous.projects.filter((project) => project.id !== projectId),
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

  const createProjectMemberMutation = useMutation({
    mutationFn: (variables: {
      projectId: string;
      member: { employeeId: string; role?: string; group?: ProjectMember['group']; id?: string };
    }) => api.addProjectMember(variables.projectId, variables.member),
    onMutate: () => {
      beginMutation();
    },
    onSuccess: (member, variables) => {
      syncWorkspaceCache((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          projects: previous.projects.map((project) =>
            project.id === variables.projectId
              ? {
                  ...project,
                  projectMembers: [...project.projectMembers.filter((projMember) => projMember.id !== member.id), member],
                }
              : project,
          ),
        };
      });
    },
    onError: async (error: unknown) => {
      await handleMutationError(error, 'Kunne ikke tilføje projektmedlemmet.');
    },
    onSettled: () => {
      endMutation();
    },
  });

  const patchProjectMemberMutation = useMutation({
    mutationFn: (variables: {
      projectId: string;
      memberId: string;
      updates: { role?: string; group?: ProjectMember['group']; isProjectLead?: boolean };
    }) => api.updateProjectMember(variables.projectId, variables.memberId, variables.updates),
    onMutate: () => {
      beginMutation();
    },
    onSuccess: (updatedMember, variables) => {
      syncWorkspaceCache((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          projects: previous.projects.map((project) =>
            project.id === variables.projectId
              ? {
                  ...project,
                  projectMembers: project.projectMembers.map((member) =>
                    member.id === updatedMember.id ? { ...member, ...updatedMember } : member,
                  ),
                }
              : project,
          ),
        };
      });
    },
    onError: async (error: unknown) => {
      await handleMutationError(error, 'Kunne ikke opdatere projektmedlemmet.');
    },
    onSettled: () => {
      endMutation();
    },
  });

  const deleteProjectMemberMutation = useMutation({
    mutationFn: ({ projectId, memberId }: { projectId: string; memberId: string }) =>
      api.deleteProjectMember(projectId, memberId),
    onMutate: () => {
      beginMutation();
    },
    onSuccess: (_, variables) => {
      syncWorkspaceCache((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          projects: previous.projects.map((project) =>
            project.id === variables.projectId
              ? {
                  ...project,
                  projectMembers: project.projectMembers.filter((member) => member.id !== variables.memberId),
                }
              : project,
          ),
        };
      });
    },
    onError: async (error: unknown) => {
      await handleMutationError(error, 'Kunne ikke fjerne projektmedlemmet.');
    },
    onSettled: () => {
      endMutation();
    },
  });

  const updateWorkspaceSettingsMutation = useMutation({
    mutationFn: (settings: Partial<WorkspaceSettings>) => api.updateWorkspaceSettings(settings),
    onMutate: () => {
      beginMutation();
    },
    onSuccess: (settings) => {
      syncWorkspaceCache((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          settings,
        };
      });
    },
    onError: async (error: unknown) => {
      await handleMutationError(error, 'Kunne ikke opdatere indstillingerne.');
    },
    onSettled: () => {
      endMutation();
    },
  });

  const workspaceQuery = useQuery<WorkspaceData>({
    queryKey: WORKSPACE_QUERY_KEY,
    queryFn: api.getWorkspace,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const syncWorkspaceCache = useCallback(
    (updater: (prev: WorkspaceData | undefined) => WorkspaceData | undefined) => {
      queryClient.setQueryData<WorkspaceData | undefined>(WORKSPACE_QUERY_KEY, (previous) =>
        updater(previous as WorkspaceData | undefined),
      );
    },
    [queryClient],
  );
  const projectSyncQueue = useRef(
    new Map<string, { patch: Partial<Project>; timer: ReturnType<typeof setTimeout> | null }>(),
  );

  const flushProjectSync = useCallback(
    (projectId: string) => {
      const entry = projectSyncQueue.current.get(projectId);
      if (!entry) {
        return;
      }
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
  const workspaceData = workspaceQuery.data;
  const workspaceStatus = workspaceQuery.status;
  const workspaceError = workspaceQuery.error;
  const isWorkspaceFetching = workspaceQuery.isFetching && !isBootstrapping;

  useEffect(() => {
    if (!isAuthenticated) {
      setIsBootstrapping(false);
      return;
    }

    if (workspaceStatus === 'success' && workspaceData) {
      setProjects(workspaceData.projects ?? []);
      setEmployees(workspaceData.employees ?? []);
      const nextSettings = workspaceData.settings ?? { pmoBaselineHoursWeek: 0 };
      if (setWorkspaceSettingsState) {
        setWorkspaceSettingsState(nextSettings);
      }
      setApiError(null);
      setIsBootstrapping(false);
      return;
    }

    if (workspaceStatus === 'error' && workspaceError) {
      console.error('Kunne ikke hente workspace-data:', workspaceError);
      setApiError(getErrorMessage(workspaceError));
      setIsBootstrapping(false);
    }
  }, [
    isAuthenticated,
    setApiError,
    setEmployees,
    setIsBootstrapping,
    setProjects,
    setWorkspaceSettingsState,
    workspaceData,
    workspaceError,
    workspaceStatus,
  ]);

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

  const updateEmployees = useCallback(
    (updater: EmployeeUpdater) => {
      setEmployees((prev) => updater(prev));
    },
    [setEmployees],
  );

  const addEmployee = useCallback(
    (name: string, location: Location, email: string, maxCapacityHoursWeek: number = DEFAULT_EMPLOYEE_CAPACITY) => {
      const sanitizedCapacity = sanitizeCapacity(maxCapacityHoursWeek, DEFAULT_EMPLOYEE_CAPACITY);
      const candidateEmployee: Employee = {
        id: generateId(),
        name,
        location,
        email,
        maxCapacityHoursWeek: sanitizedCapacity,
      };

      let didCreate = false;
      updateEmployees((prev) => {
        if (prev.some((employee) => employee.email.toLowerCase() === email.toLowerCase())) {
          alert('En medarbejder med denne email findes allerede.');
          return prev;
        }
        didCreate = true;
        return [...prev, candidateEmployee];
      });

      if (!didCreate) {
        return;
      }

      const payload: Partial<Employee> & { name: string; email: string; id?: string } = {
        id: candidateEmployee.id,
        name: candidateEmployee.name,
        email: candidateEmployee.email,
      };
      if (candidateEmployee.location) {
        payload.location = candidateEmployee.location;
      }
      if (typeof candidateEmployee.maxCapacityHoursWeek === 'number') {
        payload.maxCapacityHoursWeek = candidateEmployee.maxCapacityHoursWeek;
      }

      createEmployeeMutation.mutate(payload);
    },
    [createEmployeeMutation, updateEmployees],
  );

  const updateEmployee = useCallback(
    (id: string, updates: Partial<Employee>) => {
      let updatesPayload: { employeeId: string; updates: Partial<Employee> } | null = null;
      updateEmployees((prev) => {
        if (
          updates.email &&
          prev.some((employee) => employee.id !== id && employee.email.toLowerCase() === updates.email!.toLowerCase())
        ) {
          alert('En anden medarbejder med denne email findes allerede.');
          return prev;
        }

        return prev.map((employee) => {
          if (employee.id !== id) {
            return employee;
          }

          const next: Partial<Employee> = { ...updates };
          if (next.maxCapacityHoursWeek !== undefined) {
            next.maxCapacityHoursWeek = sanitizeCapacity(next.maxCapacityHoursWeek, employee.maxCapacityHoursWeek ?? 0);
          }

          const merged = { ...employee, ...next };
          const mutationPayload: Partial<Employee> = {
            name: merged.name,
            email: merged.email,
          };
          if (merged.location) {
            mutationPayload.location = merged.location;
          }
          if (merged.department !== undefined) {
            mutationPayload.department = merged.department;
          }
          if (typeof merged.maxCapacityHoursWeek === 'number') {
            mutationPayload.maxCapacityHoursWeek = merged.maxCapacityHoursWeek;
          }

          updatesPayload = {
            employeeId: id,
            updates: mutationPayload,
          };
          return merged;
        });
      });

      if (!updatesPayload) {
        return;
      }

      updateEmployeeMutation.mutate(updatesPayload);
    },
    [updateEmployeeMutation, updateEmployees],
  );

  const deleteEmployee = useCallback(
    (id: string) => {
      const assignedProjects = projects.filter((project) =>
        project.projectMembers.some((member) => member.employeeId === id),
      );

      if (
        assignedProjects.length > 0 &&
        !window.confirm(
          'Denne medarbejder er tilknyttet et eller flere projekter. Vil du fjerne dem fra alle projekter og slette dem permanent?',
        )
      ) {
        return;
      }

      const assignedProjectIds = new Set(assignedProjects.map((project) => project.id));
      if (assignedProjectIds.size > 0) {
        updateProjects((prevProjects) =>
          prevProjects.map((project) =>
            assignedProjectIds.has(project.id)
              ? {
                  ...project,
                  projectMembers: project.projectMembers.filter((member) => member.employeeId !== id),
                }
              : project,
          ),
        );
      }

      updateEmployees((prev) => prev.filter((employee) => employee.id !== id));
      deleteEmployeeMutation.mutate(id);
    },
    [deleteEmployeeMutation, projects, updateEmployees, updateProjects],
  );


  const importEmployeesFromCsv = useCallback(
    (csvContent: string) => {
      const lines = csvContent.split('\n').filter((line) => line.trim() !== '');
      if (lines.length <= 1) {
        alert('CSV-filen er tom eller indeholder kun en overskriftsraekke.');
        return;
      }

      const rawHeader = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
      const normalizedHeader = rawHeader.map((h) => h.toLowerCase());
      if (normalizedHeader[0] !== 'navn' || normalizedHeader[1] !== 'lokation' || normalizedHeader[2] !== 'email') {
        alert('CSV-filen skal have kolonnerne: Navn,Lokation,Email og valgfrit Kapacitet.');
        return;
      }
      const capacityIndex = normalizedHeader.findIndex((column) => CSV_CAPACITY_HEADERS.has(column));

      const employeesToCreate: (Partial<Employee> & {
        id: string;
        name: string;
        email: string;
        location: Location;
        maxCapacityHoursWeek: number;
      })[] = [];
      const employeesToUpdatePayload: { employeeId: string; updates: Partial<Employee> }[] = [];

      updateEmployees((currentEmployees) => {
        const newEmployeesList = [...currentEmployees];
        const existingEmailMap = new Map(newEmployeesList.map((employee) => [employee.email.toLowerCase(), employee]));
        const rows = lines.slice(1);

        let updatedCount = 0;
        let addedCount = 0;
        let skippedCount = 0;

        for (const row of rows) {
          const cells = row.split(',').map((value) => value.trim().replace(/"/g, ''));
          const name = cells[0] ?? '';
          const location = cells[1] ?? '';
          const email = cells[2] ?? '';
          if (!name || !location || !email || !locations.includes(location as Location)) {
            skippedCount += 1;
            continue;
          }

          const normalizedLocation = location as Location;
          const existingEmployee = existingEmailMap.get(email.toLowerCase());
          if (existingEmployee) {
            const index = newEmployeesList.findIndex((employee) => employee.id === existingEmployee.id);
            const updatedEmployee: Employee = { ...existingEmployee, name, location: normalizedLocation };
            if (capacityIndex >= 0) {
              updatedEmployee.maxCapacityHoursWeek = parseCapacityFromCsv(
                cells[capacityIndex],
                existingEmployee.maxCapacityHoursWeek ?? DEFAULT_EMPLOYEE_CAPACITY,
              );
            }
            newEmployeesList[index] = updatedEmployee;
            const updatesForEmployee: Partial<Employee> = {
              name: updatedEmployee.name,
            };
            if (updatedEmployee.location) {
              updatesForEmployee.location = updatedEmployee.location;
            }
            if (typeof updatedEmployee.maxCapacityHoursWeek === 'number') {
              updatesForEmployee.maxCapacityHoursWeek = updatedEmployee.maxCapacityHoursWeek;
            }
            employeesToUpdatePayload.push({
              employeeId: updatedEmployee.id,
              updates: updatesForEmployee,
            });
            updatedCount += 1;
          } else {
            const capacity =
              capacityIndex >= 0
                ? parseCapacityFromCsv(cells[capacityIndex], DEFAULT_EMPLOYEE_CAPACITY)
                : DEFAULT_EMPLOYEE_CAPACITY;
            const newEmployee: Employee = {
              id: generateId(),
              name,
              location: normalizedLocation,
              email,
              maxCapacityHoursWeek: capacity,
            };
            newEmployeesList.push(newEmployee);
            employeesToCreate.push({
              id: newEmployee.id,
              name: newEmployee.name,
              email: newEmployee.email,
              location: normalizedLocation,
              maxCapacityHoursWeek: capacity,
            });
            addedCount += 1;
          }
        }

        alert(
          `Import faerdig.\n- ${addedCount} nye medarbejdere tilfoejet.\n- ${updatedCount} eksisterende medarbejdere opdateret.\n- ${skippedCount} raekker sprunget over pga. fejl.`,
        );

        return newEmployeesList;
      });

      employeesToCreate.forEach((payload) => {
        createEmployeeMutation.mutate(payload);
      });
      employeesToUpdatePayload.forEach((payload) => {
        updateEmployeeMutation.mutate(payload);
      });
    },
    [createEmployeeMutation, updateEmployeeMutation, updateEmployees],
  );
  const createNewProject = useCallback(
    (name: string): Project | null => {
      const normalizedName = name.trim();
      if (!normalizedName) {
        alert('Projektnavn er påkrævet.');
        return null;
      }

      if (projects.some((project) => project.config.projectName.toLowerCase() === normalizedName.toLowerCase())) {
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
      setProjects((prev) => prev.filter((project) => project.id !== projectId));
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
          (project) => project.id !== projectId && project.config.projectName.trim().toLowerCase() === nextName.toLowerCase(),
        )
      ) {
        alert('Et projekt med dette navn eksisterer allerede.');
        return;
      }

      let nextConfig: ProjectConfig | null = null;
      updateProjects((prevProjects) =>
        prevProjects.map((project) => {
          if (project.id !== projectId) {
            return project;
          }
          const normalizedConfig = nextName ? { ...newConfig, projectName: nextName } : newConfig;
          nextConfig = { ...project.config, ...normalizedConfig };
          return {
            ...project,
            config: nextConfig,
          };
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
          if (project.id !== projectId || project.status === status) {
            return project;
          }
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

  const getProjectById = useCallback(
    (projectId: string | null) => (projectId ? store.projects.find((project) => project.id === projectId) ?? null : null),
    [store.projects],
  );

  const updateProjectState = useCallback(
    (projectId: string, weekKey: string, updater: (prevState: ProjectState) => ProjectState) => {
      let nextReports: Report[] | null = null;
      updateProjects((prevProjects) =>
        prevProjects.map((project) => {
          if (project.id !== projectId) {
            return project;
          }
          const reportIndex = project.reports.findIndex((report) => report.weekKey === weekKey);
          if (reportIndex === -1) {
            return project;
          }

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

  const assignEmployeeToProject = useCallback(
    (projectId: string, employeeId: string) => {
      const project = projects.find((candidate) => candidate.id === projectId);
      if (!project) {
        return;
      }
      if (project.projectMembers.some((member) => member.employeeId === employeeId)) {
        alert('Medarbejderen er allerede tilknyttet projektet.');
        return;
      }

      const newMember: ProjectMember = {
        id: generateId(),
        employeeId,
        role: 'Ny rolle',
        group: 'unassigned',
        timeEntries: [],
        isProjectLead: false,
      };

      updateProjects((prevProjects) =>
        prevProjects.map((candidate) =>
          candidate.id === projectId
            ? { ...candidate, projectMembers: [...candidate.projectMembers, newMember] }
            : candidate,
        ),
      );

      createProjectMemberMutation.mutate({
        projectId,
        member: {
          id: newMember.id,
          employeeId,
          role: newMember.role,
          group: newMember.group,
        },
      });
    },
    [createProjectMemberMutation, projects, updateProjects],
  );

  const updateProjectMember = useCallback(
    (projectId: string, memberId: string, updates: Partial<ProjectMember>) => {
      updateProjects((prevProjects) =>
        prevProjects.map((project) =>
          project.id !== projectId
            ? project
            : {
                ...project,
                projectMembers: project.projectMembers.map((member) =>
                  member.id === memberId ? { ...member, ...updates } : member,
                ),
              },
        ),
      );

      const payload: { role?: string; group?: ProjectMember['group']; isProjectLead?: boolean } = {};
      if (updates.role !== undefined) {
        payload.role = updates.role;
      }
      if (updates.group !== undefined) {
        payload.group = updates.group;
      }
      if (updates.isProjectLead !== undefined) {
        payload.isProjectLead = updates.isProjectLead;
      }

      if (Object.keys(payload).length === 0) {
        return;
      }

      patchProjectMemberMutation.mutate({ projectId, memberId, updates: payload });
    },
    [patchProjectMemberMutation, updateProjects],
  );

  const deleteProjectMember = useCallback(
    (projectId: string, memberId: string) => {
      updateProjects((prevProjects) =>
        prevProjects.map((project) =>
          project.id !== projectId
            ? project
            : {
                ...project,
                projectMembers: project.projectMembers.filter((member) => member.id !== memberId),
              },
        ),
      );

      deleteProjectMemberMutation.mutate({ projectId, memberId });
    },
    [deleteProjectMemberMutation, updateProjects],
  );

  const updateTimeLogForMember = useCallback(
    (projectId: string, memberId: string, weekKey: string, hours: { planned?: number; actual?: number }) => {
      updateProjects((prevProjects) =>
        prevProjects.map((project) => {
          if (project.id !== projectId) return project;

          return {
            ...project,
            projectMembers: project.projectMembers.map((member) => {
              if (member.id !== memberId) {
                return member;
              }

              const entryIndex = member.timeEntries.findIndex((entry) => entry.weekKey === weekKey);
              let updatedEntries = member.timeEntries;

              if (entryIndex > -1) {
                updatedEntries = [...member.timeEntries];
                const existingEntry = updatedEntries[entryIndex];
                updatedEntries[entryIndex] = {
                  ...existingEntry,
                  plannedHours:
                    typeof hours.planned === 'number'
                      ? Math.max(0, hours.planned)
                      : existingEntry.plannedHours,
                  actualHours:
                    typeof hours.actual === 'number'
                      ? Math.max(0, hours.actual)
                      : existingEntry.actualHours,
                };
              } else {
                updatedEntries = [
                  ...member.timeEntries,
                  {
                    weekKey,
                    plannedHours: sanitizeHours(hours.planned),
                    actualHours: sanitizeHours(hours.actual),
                  },
                ];
              }

              const normalisedEntries = updatedEntries
                .filter((entry) => entry.plannedHours > 0 || entry.actualHours > 0)
                .sort((a, b) => a.weekKey.localeCompare(b.weekKey));

              return { ...member, timeEntries: normalisedEntries };
            }),
          };
        }),
      );

      const payload: { plannedHours?: number; actualHours?: number } = {};
      if (typeof hours.planned === 'number' && Number.isFinite(hours.planned)) {
        payload.plannedHours = Math.max(0, hours.planned);
      }
      if (typeof hours.actual === 'number' && Number.isFinite(hours.actual)) {
        payload.actualHours = Math.max(0, hours.actual);
      }

      if (Object.keys(payload).length === 0) {
        return;
      }

      api
        .logTimeEntry(projectId, memberId, weekKey, payload)
        .then((response) => {
          if (!response?.member) {
            return;
          }

          updateProjects((prevProjects) =>
            prevProjects.map((project) =>
              project.id !== projectId
                ? project
                : {
                    ...project,
                    projectMembers: project.projectMembers.map((member) =>
                      member.id === memberId ? { ...member, timeEntries: response.member!.timeEntries } : member,
                    ),
                  },
            ),
          );
        })
        .catch((error) => {
          console.error('Time log sync failed:', error);
          setApiError('Kunne ikke synkronisere timeregistrering. Prøv igen.');
        });
    },
    [setApiError, updateProjects],
  );

  const bulkUpdateTimeLogForMember = useCallback(
    (projectId: string, memberId: string, entriesToUpdate: { weekKey: string; plannedHours: number }[]) => {
      updateProjects((prevProjects) =>
        prevProjects.map((project) => {
          if (project.id !== projectId) return project;
          return {
            ...project,
            projectMembers: project.projectMembers.map((member) => {
              if (member.id !== memberId) return member;
              const entriesMap = new Map(member.timeEntries.map((entry) => [entry.weekKey, entry]));
              for (const { weekKey, plannedHours } of entriesToUpdate) {
                const existing = entriesMap.get(weekKey) || { weekKey, plannedHours: 0, actualHours: 0 };
                entriesMap.set(weekKey, { ...existing, plannedHours });
              }
              const updatedEntries = Array.from(entriesMap.values())
                .filter((entry) => entry.plannedHours > 0 || entry.actualHours > 0)
                .sort((a, b) => a.weekKey.localeCompare(b.weekKey));
              return { ...member, timeEntries: updatedEntries };
            }),
          };
        }),
      );

      const payloads = entriesToUpdate
        .filter((entry) => Number.isFinite(entry.plannedHours))
        .map(({ weekKey, plannedHours }) => ({
          weekKey,
          plannedHours: Math.max(0, plannedHours),
        }));

      if (!payloads.length) {
        return;
      }

      void Promise.all(
        payloads.map(({ weekKey, plannedHours }) =>
          api.logTimeEntry(projectId, memberId, weekKey, { plannedHours }),
        ),
      ).catch((error) => {
        console.error('Time log sync failed:', error);
        setApiError('Kunne ikke synkronisere timeregistrering. Proev igen.');
      });
    },
    [setApiError, updateProjects],
  );

  const projectActions = useCallback(
    (projectId: string, weekKey: string | null) => {
      const project = projects.find((candidate) => candidate.id === projectId);
      if (!project) return null;

      const sanitizeWorkstreamList = (streams: Workstream[]): Workstream[] =>
        streams
          .map((stream, index) => {
            const name = typeof stream?.name === 'string' ? stream.name.trim() : '';
            if (!name) {
              return null;
            }
            return {
              id: stream.id ?? generateId(),
              name,
              order: typeof stream.order === 'number' ? stream.order : index,
            };
          })
          .filter((stream): stream is Workstream => Boolean(stream))
          .sort((a, b) => a.order - b.order)
          .map((stream, index) => ({ ...stream, order: index }));

      const cloneStreamsForState = (streams: Workstream[]) =>
        streams.map((stream, index) => ({
          ...stream,
          order: typeof stream.order === 'number' ? stream.order : index,
        }));

      const applyWorkstreamsUpdate = (updater: (current: Workstream[]) => Workstream[]) => {
        let nextStreams: Workstream[] | null = null;
        updateProjects((prevProjects) =>
          prevProjects.map((candidate) => {
            if (candidate.id !== projectId) return candidate;
            const currentStreams = candidate.workstreams ?? [];
            const updated = sanitizeWorkstreamList(updater(currentStreams));
            nextStreams = updated;
            return {
              ...candidate,
              workstreams: updated,
              reports: candidate.reports.map((report) => ({
                ...report,
                state: {
                  ...report.state,
                  workstreams: cloneStreamsForState(updated),
                },
              })),
            };
          }),
        );
        if (nextStreams) {
          scheduleProjectSync(projectId, { workstreams: nextStreams });
        }
      };

      const updateState = (updater: (prevState: ProjectState) => ProjectState) => {
        if (weekKey) updateProjectState(projectId, weekKey, updater);
      };

      return {
        updateMainTableRowNote: (id: string, note: string) =>
          updateState((state) => ({
            ...state,
            mainTableRows: state.mainTableRows.map((row) => (row.id === id ? { ...row, note } : row)),
          })),
        cycleStatus: (id: string) => {
          const order: Array<'green' | 'yellow' | 'red'> = ['green', 'yellow', 'red'];
          updateState((state) => ({
            ...state,
            mainTableRows: state.mainTableRows.map((row) => {
              if (row.id !== id) return row;
              const currentIndex = order.indexOf(row.status);
              const nextStatus = order[(currentIndex + 1) % order.length];
              return { ...row, status: nextStatus };
            }),
          }));
        },
        statusListManager: {
          addItem: () =>
            updateState((state) => ({
              ...state,
              statusItems: [...state.statusItems, { id: generateId(), content: 'Nyt punkt' }],
            })),
          deleteItem: (id: string) =>
            updateState((state) => ({
              ...state,
              statusItems: state.statusItems.filter((item) => item.id !== id),
            })),
          updateItem: (id: string, content: string) =>
            updateState((state) => ({
              ...state,
              statusItems: state.statusItems.map((item) => (item.id === id ? { ...item, content } : item)),
            })),
          reorderItems: (sourceIndex: number, destinationIndex: number) =>
            updateState((state) => {
              const list = [...state.statusItems];
              const [removed] = list.splice(sourceIndex, 1);
              list.splice(destinationIndex, 0, removed);
              return { ...state, statusItems: list };
            }),
        },
        challengeListManager: {
          addItem: () =>
            updateState((state) => ({
              ...state,
              challengeItems: [...state.challengeItems, { id: generateId(), content: 'Nyt punkt' }],
            })),
          deleteItem: (id: string) =>
            updateState((state) => ({
              ...state,
              challengeItems: state.challengeItems.filter((item) => item.id !== id),
            })),
          updateItem: (id: string, content: string) =>
            updateState((state) => ({
              ...state,
              challengeItems: state.challengeItems.map((item) => (item.id === id ? { ...item, content } : item)),
            })),
          reorderItems: (sourceIndex: number, destinationIndex: number) =>
            updateState((state) => {
              const list = [...state.challengeItems];
              const [removed] = list.splice(sourceIndex, 1);
              list.splice(destinationIndex, 0, removed);
              return { ...state, challengeItems: list };
            }),
        },
        nextStepListManager: {
          addItem: () =>
            updateState((state) => ({
              ...state,
              nextStepItems: [...state.nextStepItems, { id: generateId(), content: 'Nyt punkt' }],
            })),
          deleteItem: (id: string) =>
            updateState((state) => ({
              ...state,
              nextStepItems: state.nextStepItems.filter((item) => item.id !== id),
            })),
          updateItem: (id: string, content: string) =>
            updateState((state) => ({
              ...state,
              nextStepItems: state.nextStepItems.map((item) => (item.id === id ? { ...item, content } : item)),
            })),
          reorderItems: (sourceIndex: number, destinationIndex: number) =>
            updateState((state) => {
              const list = [...state.nextStepItems];
              const [removed] = list.splice(sourceIndex, 1);
              list.splice(destinationIndex, 0, removed);
              return { ...state, nextStepItems: list };
            }),
        },
        riskManager: {
          add: () =>
            updateState((state) => ({
              ...state,
              risks: [...state.risks, { id: generateId(), name: 'Ny risiko', s: 1, k: 1 }],
            })),
          delete: (id: string) =>
            updateState((state) => ({
              ...state,
              risks: state.risks.filter((risk) => risk.id !== id),
            })),
          updateName: (id: string, name: string) =>
            updateState((state) => ({
              ...state,
              risks: state.risks.map((risk) => (risk.id === id ? { ...risk, name } : risk)),
            })),
          updatePosition: (id: string, sVal: number, kVal: number) =>
            updateState((state) => ({
              ...state,
              risks: state.risks.map((risk) => (risk.id === id ? { ...risk, s: sVal, k: kVal } : risk)),
            })),
        },
        kanbanManager: {
          add: (status: 'todo' | 'doing' | 'done') =>
            updateState((state) => ({
              ...state,
              kanbanTasks: [
                ...(state.kanbanTasks ?? []),
                {
                  id: generateId(),
                  content: 'Ny opgave',
                  status,
                  assignee: null,
                  dueDate: null,
                  notes: null,
                  createdAt: new Date().toISOString(),
                },
              ],
            })),
          delete: (id: string) =>
            updateState((state) => ({
              ...state,
              kanbanTasks: state.kanbanTasks.filter((task) => task.id !== id),
            })),
          updateContent: (id: string, content: string) =>
            updateState((state) => ({
              ...state,
              kanbanTasks: state.kanbanTasks.map((task) => (task.id === id ? { ...task, content } : task)),
            })),
          updateStatus: (id: string, status: 'todo' | 'doing' | 'done') =>
            updateState((state) => ({
              ...state,
              kanbanTasks: state.kanbanTasks.map((task) => (task.id === id ? { ...task, status } : task)),
            })),
          updateDetails: (id: string, details: Partial<KanbanTask>) =>
            updateState((state) => ({
              ...state,
              kanbanTasks: state.kanbanTasks.map((task) => (task.id === id ? { ...task, ...details } : task)),
            })),
        },
        workstreamManager: {
          add: (name?: string) =>
            applyWorkstreamsUpdate((current) => [
              ...current,
              {
                id: generateId(),
                name: (name ?? '').trim() || `Workstream ${current.length + 1}`,
                order: current.length,
              },
            ]),
          rename: (id: string, nextName: string) =>
            applyWorkstreamsUpdate((current) =>
              current.map((stream) =>
                stream.id === id ? { ...stream, name: nextName.trim() || stream.name } : stream,
              ),
            ),
          delete: (id: string) => {
            applyWorkstreamsUpdate((current) => current.filter((stream) => stream.id !== id));
            updateState((state) => ({
              ...state,
              phases: state.phases.map((phase) => (phase.workstreamId === id ? { ...phase, workstreamId: null } : phase)),
              milestones: state.milestones.map((milestone) =>
                milestone.workstreamId === id ? { ...milestone, workstreamId: null } : milestone,
              ),
            }));
          },
          reorder: (sourceIndex: number, destinationIndex: number) =>
            applyWorkstreamsUpdate((current) => {
              const list = [...current];
              if (sourceIndex < 0 || sourceIndex >= list.length) {
                return list;
              }
              const targetIndex = Math.max(0, Math.min(destinationIndex, list.length));
              const [moved] = list.splice(sourceIndex, 1);
              if (!moved) {
                return list;
              }
              list.splice(targetIndex, 0, moved);
              return list;
            }),
        },
        timelineManager: {
          add: (itemType: TimelineItemType, position: number) => {
            updateState((state) => {
              const id = generateId();
              const workstreamSource = state.workstreams ?? project.workstreams ?? [];
              const defaultWorkstreamId = workstreamSource[0]?.id ?? null;
              if (itemType === 'phase') {
                const newPhase: Phase = {
                  id,
                  text: 'Ny fase',
                  start: position,
                  end: position + 10,
                  highlight: '#dbeafe',
                  workstreamId: defaultWorkstreamId,
                  status: 'Planned',
                };
                return { ...state, phases: [...state.phases, newPhase] };
              }
              if (itemType === 'milestone') {
                const newMilestone: Milestone = {
                  id,
                  text: 'Ny milepæl',
                  position,
                  status: 'Pending',
                  workstreamId: defaultWorkstreamId,
                };
                return { ...state, milestones: [...state.milestones, newMilestone] };
              }
              const newDeliverable: Deliverable = {
                id,
                text: 'Ny leverance',
                position,
                status: 'Pending',
                milestoneId: null,
                checklist: [],
              };
              return { ...state, deliverables: [...state.deliverables, newDeliverable] };
            });
          },
          update: (itemType: TimelineItemType, id: string, payload: TimelineUpdatePayload) => {
            updateState((state) => {
              if (itemType === 'phase') {
                const phasePayload = payload as Partial<Phase>;
                return {
                  ...state,
                  phases: state.phases.map((item) => (item.id === id ? { ...item, ...phasePayload } : item)),
                };
              }
              if (itemType === 'milestone') {
                const milestonePayload = payload as Partial<Milestone>;
                return {
                  ...state,
                  milestones: state.milestones.map((item) => (item.id === id ? { ...item, ...milestonePayload } : item)),
                };
              }
              const deliverablePayload = payload as Partial<Deliverable>;
              return {
                ...state,
                deliverables: state.deliverables.map((item) => (item.id === id ? { ...item, ...deliverablePayload } : item)),
              };
            });
          },
          delete: (itemType: TimelineItemType, id: string) => {
            updateState((state) => {
              if (itemType === 'phase') {
                return { ...state, phases: state.phases.filter((item) => item.id !== id) };
              }
              if (itemType === 'milestone') {
                return { ...state, milestones: state.milestones.filter((item) => item.id !== id) };
              }
              return { ...state, deliverables: state.deliverables.filter((item) => item.id !== id) };
            });
          },
          calculateDateFromPosition: (position: number) => {
            const start = toUtcTimestamp(project.config.projectStartDate);
            const end = toUtcTimestamp(project.config.projectEndDate);
            if (start === null || end === null || end <= start) {
              return '';
            }
            const date = new Date(start + ((end - start) * clampPercentage(position)) / 100);
            return date.toISOString().split('T')[0] ?? '';
          },
          calculatePositionFromDate: (date: string) => {
            const start = toUtcTimestamp(project.config.projectStartDate);
            const end = toUtcTimestamp(project.config.projectEndDate);
            const target = toUtcTimestamp(date);
            if (start === null || end === null || target === null || end <= start) {
              return 0;
            }
            return clampPercentage(((target - start) / (end - start)) * 100);
          },
          getTodayPosition: () => {
            const start = toUtcTimestamp(project.config.projectStartDate);
            const end = toUtcTimestamp(project.config.projectEndDate);
            if (start === null || end === null || end <= start) {
              return null;
            }
            const now = new Date();
            const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
            if (todayUtc < start || todayUtc > end) {
              return null;
            }
            return ((todayUtc - start) / (end - start)) * 100;
          },
          getMonthMarkers: () => {
            const startDate = parseDateOnlyToUtcDate(project.config.projectStartDate);
            const endDate = parseDateOnlyToUtcDate(project.config.projectEndDate);
            if (!startDate || !endDate || endDate <= startDate) {
              return [];
            }
            const startMs = startDate.getTime();
            const endMs = endDate.getTime();
            const markers: { position: number; label: string }[] = [];
            const current = new Date(startDate);
            current.setUTCDate(1);
            while (current.getTime() <= endMs) {
              const position = ((current.getTime() - startMs) / (endMs - startMs)) * 100;
              if (position >= 0 && position <= 100) {
                markers.push({
                  position,
                  label: current.toLocaleString('da-DK', { month: 'short', year: '2-digit' }),
                });
              }
              current.setUTCMonth(current.getUTCMonth() + 1);
            }
            return markers;
          },
        },
        deliverableChecklistManager: {
          addItem: (deliverableId: string, text?: string) =>
            updateState((state) => ({
              ...state,
              deliverables: state.deliverables.map((deliverable) =>
                deliverable.id !== deliverableId
                  ? deliverable
                  : {
                      ...deliverable,
                      checklist: [
                        ...(deliverable.checklist ?? []),
                        { id: generateId(), text: (text ?? 'Nyt punkt').trim() || 'Nyt punkt', completed: false },
                      ],
                    },
              ),
            })),
          updateItem: (deliverableId: string, itemId: string, nextText: string) =>
            updateState((state) => ({
              ...state,
              deliverables: state.deliverables.map((deliverable) =>
                deliverable.id !== deliverableId
                  ? deliverable
                  : {
                      ...deliverable,
                      checklist: (deliverable.checklist ?? []).map((item) =>
                        item.id === itemId ? { ...item, text: nextText.trim() || item.text } : item,
                      ),
                    },
              ),
            })),
          toggleItem: (deliverableId: string, itemId: string) =>
            updateState((state) => ({
              ...state,
              deliverables: state.deliverables.map((deliverable) =>
                deliverable.id !== deliverableId
                  ? deliverable
                  : {
                      ...deliverable,
                      checklist: (deliverable.checklist ?? []).map((item) =>
                        item.id === itemId ? { ...item, completed: !item.completed } : item,
                      ),
                    },
              ),
            })),
          deleteItem: (deliverableId: string, itemId: string) =>
            updateState((state) => ({
              ...state,
              deliverables: state.deliverables.map((deliverable) =>
                deliverable.id !== deliverableId
                  ? deliverable
                  : {
                      ...deliverable,
                      checklist: (deliverable.checklist ?? []).filter((item) => item.id !== itemId),
                    },
              ),
            })),
        },
        reportsManager: {
          getAvailableWeeks: () => {
            const weeks = new Set<string>();
            const startDate = parseDateOnlyToUtcDate(project.config.projectStartDate);
            const endDate = parseDateOnlyToUtcDate(project.config.projectEndDate);
            if (!startDate || !endDate || startDate > endDate) {
              return [];
            }
            const current = new Date(startDate);
            while (current.getTime() <= endDate.getTime()) {
              weeks.add(getWeekKey(new Date(current)));
              current.setUTCDate(current.getUTCDate() + 7);
            }
            const existingWeeks = new Set(project.reports.map((report) => report.weekKey));
            return Array.from(weeks)
              .filter((week) => !existingWeeks.has(week))
              .sort()
              .reverse();
          },
          create: (weekKey: string, copyLatest: boolean) => {
            let nextReports: Report[] | null = null;
            updateProjects((prevProjects) =>
              prevProjects.map((p) => {
                if (p.id !== projectId || p.reports.some((report) => report.weekKey === weekKey)) return p;
                const latest = copyLatest ? [...p.reports].sort((a, b) => b.weekKey.localeCompare(a.weekKey))[0] : null;
                const baseState = latest ? latest.state : getInitialProjectState();
                const canonicalStreams = cloneStreamsForState(p.workstreams ?? baseState.workstreams ?? []);
                const seededState: ProjectState = {
                  ...baseState,
                  workstreams: canonicalStreams,
                };
                const newReport: Report = { weekKey, state: cloneStateWithNewIds(seededState) };
                nextReports = [...p.reports, newReport].sort((a, b) => b.weekKey.localeCompare(a.weekKey));
                return {
                  ...p,
                  reports: nextReports,
                };
              }),
            );
            if (nextReports) {
              scheduleProjectSync(projectId, { reports: nextReports });
            }
          },
          createNext: () => {
            const allPossibleWeeksSet = new Set<string>();
            const startDate = parseDateOnlyToUtcDate(project.config.projectStartDate);
            const endDate = parseDateOnlyToUtcDate(project.config.projectEndDate);
            if (!startDate || !endDate || startDate > endDate) {
              alert('Projektets slutdato er f??r startdatoen.');
              return null;
            }
            const current = new Date(startDate);
            while (current.getTime() <= endDate.getTime()) {
              allPossibleWeeksSet.add(getWeekKey(new Date(current)));
              current.setUTCDate(current.getUTCDate() + 7);
            }

            const existingWeeks = new Set(project.reports.map((report) => report.weekKey));

            if (project.reports.length === 0) {
              const baseline = parseDateOnlyToUtcDate(project.config.projectStartDate) ?? new Date();
              const firstWeek = getWeekKey(baseline);
              const weekToCreate = existingWeeks.has(firstWeek) ? getWeekKey(new Date()) : firstWeek;
              let seededReports: Report[] | null = null;
              updateProjects((prevProjects) =>
                prevProjects.map((p) => {
                  if (p.id !== projectId) return p;
                  const baseState = getInitialProjectState();
                  const canonicalStreams = cloneStreamsForState(p.workstreams ?? baseState.workstreams ?? []);
                  const newReport: Report = {
                    weekKey: weekToCreate,
                    state: cloneStateWithNewIds({
                      ...baseState,
                      workstreams: canonicalStreams,
                    }),
                  };
                  seededReports = [...p.reports, newReport];
                  return { ...p, reports: seededReports };
                }),
              );
              if (seededReports) {
                scheduleProjectSync(projectId, { reports: seededReports });
              }
              return weekToCreate;
            }

            const latestReport = [...project.reports].sort((a, b) => b.weekKey.localeCompare(a.weekKey))[0];
            const [year, week] = latestReport.weekKey.replace('W', '').split('-').map(Number);
            const date = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
            date.setUTCDate(date.getUTCDate() + 7);
            const nextWeekKey = getWeekKey(date);

            if (!allPossibleWeeksSet.has(nextWeekKey)) {
              alert('N��ste uge er uden for projektets tidsramme.');
              return null;
            }
            if (existingWeeks.has(nextWeekKey)) {
              alert(`En rapport for uge ${nextWeekKey} findes allerede.`);
              return nextWeekKey;
            }
            const clonedState = cloneStateWithNewIds(latestReport.state);
            let createdReports: Report[] | null = null;
            updateProjects((prevProjects) =>
              prevProjects.map((p) => {
                if (p.id !== projectId) return p;
                const newReport: Report = { weekKey: nextWeekKey, state: clonedState };
                createdReports = [...p.reports, newReport].sort((a, b) => b.weekKey.localeCompare(a.weekKey));
                return {
                  ...p,
                  reports: createdReports,
                };
              }),
            );
            if (createdReports) {
              scheduleProjectSync(projectId, { reports: createdReports });
            }

            return nextWeekKey;
          },
          delete: (weekKeyToDelete: string) => {
            let nextReports: Report[] | null = null;
            updateProjects((prevProjects) =>
              prevProjects.map((p) =>
                p.id !== projectId
                  ? p
                  : (() => {
                      const filtered = p.reports.filter((report) => report.weekKey !== weekKeyToDelete);
                      if (filtered.length === p.reports.length) {
                        return p;
                      }
                      nextReports = filtered;
                      return {
                        ...p,
                        reports: filtered,
                      };
                    })(),
              ),
            );
            if (nextReports) {
              scheduleProjectSync(projectId, { reports: nextReports });
            }
          },
          replaceState: (state: ProjectState) => {
            if (!weekKey) {
              return;
            }
            updateProjectState(projectId, weekKey, () => state);
          },
        },
        organizationManager: {
          assignEmployee: (employeeId: string) => assignEmployeeToProject(projectId, employeeId),
          updateMember: (memberId: string, updates: Partial<ProjectMember>) =>
            updateProjectMember(projectId, memberId, updates),
          deleteMember: (memberId: string) => deleteProjectMember(projectId, memberId),
          updateTimeLog: (memberId: string, weekKey: string, hours: { planned?: number; actual?: number }) =>
            updateTimeLogForMember(projectId, memberId, weekKey, hours),
          bulkUpdateTimeLog: (memberId: string, entries: { weekKey: string; plannedHours: number }[]) =>
            bulkUpdateTimeLogForMember(projectId, memberId, entries),
        },
      };
    },
    [
      projects,
      updateProjectState,
      assignEmployeeToProject,
      updateProjectMember,
      deleteProjectMember,
      updateTimeLogForMember,
      bulkUpdateTimeLogForMember,
      updateProjects,
      scheduleProjectSync,
    ],
  );

  const updatePmoBaselineHoursWeek = (value: unknown) => {
    if (!setWorkspaceSettingsState) {
      return;
    }
    const sanitized = sanitizeCapacity(value, 0);
    setWorkspaceSettingsState((prev) => ({
      ...prev,
      pmoBaselineHoursWeek: sanitized,
    }));
    updateWorkspaceSettingsMutation.mutate({ pmoBaselineHoursWeek: sanitized });
  };

  return {
    projects,
    employees: store.employees,
    workspaceSettings: store.workspaceSettings,
    isWorkspaceFetching,
    updatePmoBaselineHoursWeek,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    importEmployeesFromCsv,
    createNewProject,
    deleteProject,
    updateProjectConfig,
    updateProjectStatus,
    getProjectById,
    getWeekKey,
    projectActions,
    assignEmployeeToProject,
    updateProjectMember,
    deleteProjectMember,
    updateTimeLogForMember,
    bulkUpdateTimeLogForMember,
  };
};




