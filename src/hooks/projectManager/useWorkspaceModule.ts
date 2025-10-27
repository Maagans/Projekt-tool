import { useCallback, useEffect } from 'react';
import { api } from '../../api';
import {
  Deliverable,
  Employee,
  Location,
  Milestone,
  Phase,
  Project,
  ProjectConfig,
  ProjectMember,
  ProjectState,
  ProjectStatus,
  Report,
  locations,
} from '../../types';
import type { ProjectManagerStore } from './store';
import {
  TimelineItemType,
  TimelineUpdatePayload,
  cloneStateWithNewIds,
  generateId,
  getInitialProjectState,
  getWeekKey,
} from './utils';

type ProjectUpdater = (prev: Project[]) => Project[];
type EmployeeUpdater = (prev: Employee[]) => Employee[];

const sanitizeHours = (value: number | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;

export const useWorkspaceModule = (store: ProjectManagerStore) => {
  const {
    projects,
    setProjects,
    setEmployees,
    currentUser,
    isAuthenticated,
    isLoading,
    setIsSaving,
    setApiError,
  } = store;

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

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const canPersist =
      !isLoading &&
      isAuthenticated &&
      currentUser &&
      (currentUser.role === 'Administrator' || currentUser.role === 'Projektleder');

    if (canPersist) {
      setIsSaving(true);
      timeoutId = setTimeout(async () => {
        try {
          setApiError(null);
          await api.saveWorkspace({ projects: store.projects, employees: store.employees });
        } catch (error: unknown) {
          console.error('Autosave failed:', error);
          setApiError('Ændringer kunne ikke gemmes. Tjek din forbindelse.');
        } finally {
          setIsSaving(false);
        }
      }, 1000);
    } else {
      setIsSaving(false);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    currentUser,
    isAuthenticated,
    isLoading,
    setApiError,
    setIsSaving,
    store.employees,
    store.projects,
  ]);

  const addEmployee = useCallback(
    (name: string, location: Location, email: string) => {
      updateEmployees((prev) => {
        if (prev.some((employee) => employee.email.toLowerCase() === email.toLowerCase())) {
          alert('En medarbejder med denne email findes allerede.');
          return prev;
        }
        const newEmployee: Employee = { id: generateId(), name, location, email };
        return [...prev, newEmployee];
      });
    },
    [updateEmployees],
  );

  const updateEmployee = useCallback(
    (id: string, updates: Partial<Employee>) => {
      updateEmployees((prev) => {
        if (
          updates.email &&
          prev.some((employee) => employee.id !== id && employee.email.toLowerCase() === updates.email!.toLowerCase())
        ) {
          alert('En anden medarbejder med denne email findes allerede.');
          return prev;
        }

        return prev.map((employee) => (employee.id === id ? { ...employee, ...updates } : employee));
      });
    },
    [updateEmployees],
  );

  const deleteEmployee = useCallback(
    (id: string) => {
      let shouldDelete = true;
      updateProjects((prevProjects) => {
        const hasAssignments = prevProjects.some((project) =>
          project.projectMembers.some((member) => member.employeeId === id),
        );

        if (hasAssignments) {
          shouldDelete = window.confirm(
            'Denne medarbejder er tilknyttet et eller flere projekter. Vil du fjerne dem fra alle projekter og slette dem permanent?',
          );
        }

        if (!shouldDelete) {
          return prevProjects;
        }

        return prevProjects.map((project) => ({
          ...project,
          projectMembers: project.projectMembers.filter((member) => member.employeeId !== id),
        }));
      });

      if (!shouldDelete) return;

      updateEmployees((prev) => prev.filter((employee) => employee.id !== id));
    },
    [updateEmployees, updateProjects],
  );

  const importEmployeesFromCsv = useCallback(
    (csvContent: string) => {
      const lines = csvContent.split('\n').filter((line) => line.trim() !== '');
      if (lines.length <= 1) {
        alert('CSV-filen er tom eller indeholder kun en overskriftsrække.');
        return;
      }

      const header = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/"/g, ''));
      if (header[0] !== 'navn' || header[1] !== 'lokation' || header[2] !== 'email') {
        alert('CSV-filen skal have kolonnerne: Navn,Lokation,Email');
        return;
      }

      updateEmployees((currentEmployees) => {
        const newEmployeesList = [...currentEmployees];
        const existingEmailMap = new Map(newEmployeesList.map((employee) => [employee.email.toLowerCase(), employee]));
        const rows = lines.slice(1);

        let updatedCount = 0;
        let addedCount = 0;
        let skippedCount = 0;

        for (const row of rows) {
          const [name, location, email] = row.split(',').map((value) => value.trim().replace(/"/g, ''));
          if (!name || !location || !email || !locations.includes(location as Location)) {
            skippedCount += 1;
            continue;
          }

          const existingEmployee = existingEmailMap.get(email.toLowerCase());
          if (existingEmployee) {
            const index = newEmployeesList.findIndex((employee) => employee.id === existingEmployee.id);
            newEmployeesList[index] = { ...existingEmployee, name, location: location as Location };
            updatedCount += 1;
          } else {
            const newEmployee: Employee = {
              id: generateId(),
              name,
              location: location as Location,
              email,
            };
            newEmployeesList.push(newEmployee);
            addedCount += 1;
          }
        }

        alert(
          `Import færdig.\n- ${addedCount} nye medarbejdere tilføjet.\n- ${updatedCount} eksisterende medarbejdere opdateret.\n- ${skippedCount} rækker sprunget over pga. fejl.`,
        );

        return newEmployeesList;
      });
    },
    [updateEmployees],
  );

  const createNewProject = useCallback(
    (name: string): Project | null => {
      if (projects.some((project) => project.config.projectName.toLowerCase() === name.toLowerCase())) {
        alert('Et projekt med dette navn eksisterer allerede.');
        return null;
      }

      const today = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6);

      const newProject: Project = {
        id: generateId(),
        config: {
          projectName: name,
          projectStartDate: today.toISOString().split('T')[0],
          projectEndDate: endDate.toISOString().split('T')[0],
        },
        reports: [],
        projectMembers: [],
        status: 'active',
        permissions: { canEdit: true, canLogTime: true },
      };

      setProjects((prev) => [...prev, newProject]);
      return newProject;
    },
    [projects, setProjects],
  );

  const deleteProject = useCallback(
    (projectId: string) => {
      setProjects((prev) => prev.filter((project) => project.id !== projectId));
    },
    [setProjects],
  );

  const updateProjectConfig = useCallback(
    (projectId: string, newConfig: Partial<ProjectConfig>) => {
      updateProjects((prev) =>
        prev.map((project) => {
          if (project.id !== projectId) return project;

          if (
            newConfig.projectName &&
            prev.some(
              (otherProject) =>
                otherProject.id !== projectId && otherProject.config.projectName === newConfig.projectName,
            )
          ) {
            alert('Et projekt med dette navn eksisterer allerede.');
            return project;
          }

          return { ...project, config: { ...project.config, ...newConfig } };
        }),
      );
    },
    [updateProjects],
  );

  const updateProjectStatus = useCallback(
    (projectId: string, status: ProjectStatus) => {
      updateProjects((prev) => prev.map((project) => (project.id === projectId ? { ...project, status } : project)));
    },
    [updateProjects],
  );

  const getProjectById = useCallback(
    (projectId: string | null) => (projectId ? store.projects.find((project) => project.id === projectId) ?? null : null),
    [store.projects],
  );

  const updateProjectState = useCallback(
    (projectId: string, weekKey: string, updater: (prevState: ProjectState) => ProjectState) => {
      updateProjects((prevProjects) =>
        prevProjects.map((project) => {
          if (project.id !== projectId) return project;
          const reportIndex = project.reports.findIndex((report) => report.weekKey === weekKey);
          if (reportIndex === -1) return project;

          const updatedReport: Report = {
            ...project.reports[reportIndex],
            state: updater(project.reports[reportIndex].state),
          };

          const updatedReports = [...project.reports];
          updatedReports[reportIndex] = updatedReport;
          return { ...project, reports: updatedReports };
        }),
      );
    },
    [updateProjects],
  );

  const assignEmployeeToProject = useCallback(
    (projectId: string, employeeId: string) => {
      updateProjects((prevProjects) =>
        prevProjects.map((project) => {
          if (project.id !== projectId || project.projectMembers.some((member) => member.employeeId === employeeId)) {
            return project;
          }
          const newMember: ProjectMember = {
            id: generateId(),
            employeeId,
            role: 'Ny rolle',
            group: 'unassigned',
            timeEntries: [],
          };
          return { ...project, projectMembers: [...project.projectMembers, newMember] };
        }),
      );
    },
    [updateProjects],
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
    },
    [updateProjects],
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
    },
    [updateProjects],
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
    },
    [updateProjects],
  );

  const projectActions = useCallback(
    (projectId: string, weekKey: string | null) => {
      const project = projects.find((candidate) => candidate.id === projectId);
      if (!project) return null;

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
              kanbanTasks: [...(state.kanbanTasks ?? []), { id: generateId(), content: 'Ny opgave', status }],
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
        },
        timelineManager: {
          add: (itemType: TimelineItemType, position: number) => {
            updateState((state) => {
              const id = generateId();
              if (itemType === 'phase') {
                const newPhase: Phase = { id, text: 'Ny fase', start: position, end: position + 10, highlight: 'blue' };
                return { ...state, phases: [...state.phases, newPhase] };
              }
              if (itemType === 'milestone') {
                const newMilestone: Milestone = { id, text: 'Ny milepæl', position };
                return { ...state, milestones: [...state.milestones, newMilestone] };
              }
              const newDeliverable: Deliverable = { id, text: 'Ny leverance', position };
              return { ...state, deliverables: [...state.deliverables, newDeliverable] };
            });
          },
          update: (itemType: TimelineItemType, id: string, payload: TimelineUpdatePayload) => {
            updateState((state) => {
              if (itemType === 'phase') {
                return {
                  ...state,
                  phases: state.phases.map((item) => (item.id === id ? { ...item, ...payload } : item)),
                };
              }
              if (itemType === 'milestone') {
                return {
                  ...state,
                  milestones: state.milestones.map((item) => (item.id === id ? { ...item, ...payload } : item)),
                };
              }
              return {
                ...state,
                deliverables: state.deliverables.map((item) => (item.id === id ? { ...item, ...payload } : item)),
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
            try {
              const start = new Date(project.config.projectStartDate).getTime();
              const end = new Date(project.config.projectEndDate).getTime();
              const date = new Date(start + ((end - start) * position) / 100);
              return date.toISOString().split('T')[0] ?? '';
            } catch {
              return '';
            }
          },
          calculatePositionFromDate: (date: string) => {
            try {
              const start = new Date(project.config.projectStartDate).getTime();
              const end = new Date(project.config.projectEndDate).getTime();
              if (end <= start) {
                return 0;
              }
              return Math.max(0, Math.min(100, ((new Date(date).getTime() - start) / (end - start)) * 100));
            } catch {
              return 0;
            }
          },
          getTodayPosition: () => {
            try {
              const start = new Date(project.config.projectStartDate).getTime();
              const end = new Date(project.config.projectEndDate).getTime();
              const today = Date.now();
              if (today < start || today > end || end <= start) {
                return null;
              }
              return ((today - start) / (end - start)) * 100;
            } catch {
              return null;
            }
          },
          getMonthMarkers: () => {
            try {
              const start = new Date(project.config.projectStartDate);
              const end = new Date(project.config.projectEndDate);
              if (end <= start) {
                return [];
              }
              const markers: { position: number; label: string }[] = [];
              const current = new Date(start);
              current.setDate(1);
              while (current <= end) {
                const position = ((current.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100;
                if (position >= 0 && position <= 100) {
                  markers.push({
                    position,
                    label: current.toLocaleString('da-DK', { month: 'short', year: '2-digit' }),
                  });
                }
                current.setMonth(current.getMonth() + 1);
              }
              return markers;
            } catch {
              return [];
            }
          },
        },
        reportsManager: {
          getAvailableWeeks: () => {
            const weeks = new Set<string>();
            try {
              const start = new Date(project.config.projectStartDate);
              const end = new Date(project.config.projectEndDate);
              if (start > end) return [];
              const current = new Date(start);
              while (current <= end) {
                weeks.add(getWeekKey(new Date(current)));
                current.setDate(current.getDate() + 7);
              }
            } catch (error) {
              console.error('Kunne ikke udregne uger', error);
              return [];
            }
            const existingWeeks = new Set(project.reports.map((report) => report.weekKey));
            return Array.from(weeks)
              .filter((week) => !existingWeeks.has(week))
              .sort()
              .reverse();
          },
          create: (weekKey: string, copyLatest: boolean) => {
            updateProjects((prevProjects) =>
              prevProjects.map((p) => {
                if (p.id !== projectId || p.reports.some((report) => report.weekKey === weekKey)) return p;
                const latest = copyLatest ? [...p.reports].sort((a, b) => b.weekKey.localeCompare(a.weekKey))[0] : null;
                const baseState = latest ? latest.state : getInitialProjectState();
                const newReport: Report = { weekKey, state: cloneStateWithNewIds(baseState) };
                return {
                  ...p,
                  reports: [...p.reports, newReport].sort((a, b) => b.weekKey.localeCompare(a.weekKey)),
                };
              }),
            );
          },
          createNext: () => {
            const allPossibleWeeksSet = new Set<string>();
            try {
              const start = new Date(project.config.projectStartDate);
              const end = new Date(project.config.projectEndDate);
              if (start > end) {
                alert('Projektets slutdato er før startdatoen.');
                return null;
              }
              const current = new Date(start);
              while (current <= end) {
                allPossibleWeeksSet.add(getWeekKey(new Date(current)));
                current.setDate(current.getDate() + 7);
              }
            } catch (error) {
              console.error('Ugyldig dato i projektkonfiguration', error);
              return null;
            }

            const existingWeeks = new Set(project.reports.map((report) => report.weekKey));

            if (project.reports.length === 0) {
              const firstWeek = getWeekKey(new Date(project.config.projectStartDate));
              const weekToCreate = existingWeeks.has(firstWeek) ? getWeekKey(new Date()) : firstWeek;
              updateProjects((prevProjects) =>
                prevProjects.map((p) => {
                  if (p.id !== projectId) return p;
                  const newReport: Report = {
                    weekKey: weekToCreate,
                    state: cloneStateWithNewIds(getInitialProjectState()),
                  };
                  return { ...p, reports: [...p.reports, newReport] };
                }),
              );
              return weekToCreate;
            }

            const latestReport = [...project.reports].sort((a, b) => b.weekKey.localeCompare(a.weekKey))[0];
            const [year, week] = latestReport.weekKey.replace('W', '').split('-').map(Number);
            const date = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
            date.setUTCDate(date.getUTCDate() + 7);
            const nextWeekKey = getWeekKey(date);

            if (!allPossibleWeeksSet.has(nextWeekKey)) {
              alert('Næste uge er uden for projektets tidsramme.');
              return null;
            }
            if (existingWeeks.has(nextWeekKey)) {
              alert(`En rapport for uge ${nextWeekKey} findes allerede.`);
              return nextWeekKey;
            }
            const clonedState = cloneStateWithNewIds(latestReport.state);
            updateProjects((prevProjects) =>
              prevProjects.map((p) => {
                if (p.id !== projectId) return p;
                const newReport: Report = { weekKey: nextWeekKey, state: clonedState };
                return {
                  ...p,
                  reports: [...p.reports, newReport].sort((a, b) => b.weekKey.localeCompare(a.weekKey)),
                };
              }),
            );

            return nextWeekKey;
          },
          delete: (weekKeyToDelete: string) => {
            updateProjects((prevProjects) =>
              prevProjects.map((p) =>
                p.id !== projectId
                  ? p
                  : {
                      ...p,
                      reports: p.reports.filter((report) => report.weekKey !== weekKeyToDelete),
                    },
              ),
            );
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
    ],
  );

  return {
    projects,
    employees: store.employees,
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
