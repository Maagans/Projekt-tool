import { useState, useCallback, useEffect, useMemo } from 'react';
import { api } from '../api.ts'; // Import the new centralized API
import { 
  Project, Report, ProjectState, MainTableRow, Risk, Phase, 
  Milestone, Deliverable, KanbanTask, ProjectConfig, ListItem, Employee, Location, locations, ProjectMember, ProjectStatus, TimeEntry, User, UserRole
} from '../types.ts';


const generateId = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2, 12));

// --- HOOK LOGIC ---

const getInitialMainTableRows = (): MainTableRow[] => [
  { id: generateId(), title: 'Gevinster', status: 'green', note: '<i>Ingen bemærkninger.</i>' },
  { id: generateId(), title: 'Leverancer', status: 'green', note: '<i>Ingen bemærkninger.</i>' },
  { id: generateId(), title: 'Tid', status: 'green', note: '<i>Ingen bemærkninger.</i>' },
  { id: generateId(), title: 'Økonomi', status: 'green', note: '<i>Ingen bemærkninger.</i>' },
  { id: generateId(), title: 'Ressourcer', status: 'green', note: '<i>Ingen bemærkninger.</i>' },
];

const getInitialProjectState = (): ProjectState => ({
  statusItems: [
    { id: generateId(), content: 'Projektets mål er defineret, og gevinsterne er klarlagt.' },
    { id: generateId(), content: 'Interessenter er engageret, og kommunikationsplanen er på plads.' },
    { id: generateId(), content: 'Projektteamet er bemandet, og aktiviteter er i gang.' },
  ],
  challengeItems: [
    { id: generateId(), content: 'Hold øje med afhængigheder til eksterne leverandører i fase 3.' },
    { id: generateId(), content: 'Planlæg overlevering til drift tidligt for at undgå forsinkelser.' },
  ],
  mainTableRows: [
    { id: generateId(), title: 'Gevinster', status: 'green', note: '<p>De forventede gevinster er beskrevet, og gevinstplanen er igangsat.</p>' },
    { id: generateId(), title: 'Leverancer', status: 'yellow', note: '<p>Leverancer for fase 3 er under udarbejdelse – kræver opfølgning på testfeedback.</p>' },
    { id: generateId(), title: 'Tid', status: 'green', note: '<p>Tidsplanen holder. Milepælen for fase 2 blev når som planlagt.</p>' },
    { id: generateId(), title: 'Økonomi', status: 'green', note: '<p>Budgettet er opdateret, og der er ingen afvigelser.</p>' },
    { id: generateId(), title: 'Ressourcer', status: 'yellow', note: '<p>Vi mangler en specialist i udviklingsfasen – handlinger er igangsat.</p>' },
  ],
  risks: [
    { id: generateId(), name: 'Manglende tilgængelighed hos nøglebrugere til test i fase 3', s: 3, k: 3 },
    { id: generateId(), name: 'Overdragelse til drift bliver forsinket pga. mangelfuld dokumentation', s: 2, k: 4 },
  ],
  phases: [
    { id: generateId(), text: 'Idebeskrivelse', start: 0, end: 15, highlight: 'blue' },
    { id: generateId(), text: 'Forberedelse & planlægning', start: 15, end: 35, highlight: 'green' },
    { id: generateId(), text: 'Analyse & udvikling', start: 35, end: 65, highlight: 'yellow' },
    { id: generateId(), text: 'Implementering, idriftsaettelse & evaluering', start: 65, end: 100, highlight: 'purple' },
  ],
  milestones: [
    { id: generateId(), text: 'Go/No-Go fase 2', position: 20 },
    { id: generateId(), text: 'Design godkendt', position: 45 },
    { id: generateId(), text: 'Klar til idriftsættelse', position: 70 },
    { id: generateId(), text: 'Projektafslutning', position: 95 },
  ],
  deliverables: [
    { id: generateId(), text: 'Kort ideoplæg', position: 10 },
    { id: generateId(), text: 'Foreløbig interessentoversigt', position: 12 },
    { id: generateId(), text: 'Første risikovurdering', position: 14 },
    { id: generateId(), text: 'Projektbeskrivelse', position: 25 },
    { id: generateId(), text: 'Målhierarki og milepælsplan', position: 28 },
    { id: generateId(), text: 'Interessentanalyse & kommunikationsplan', position: 32 },
    { id: generateId(), text: 'Risiko- og budgetopdatering', position: 34 },
    { id: generateId(), text: 'Kravspecifikation', position: 45 },
    { id: generateId(), text: 'Prototype/testleverance', position: 55 },
    { id: generateId(), text: 'Uddannelses- og implementeringsplan', position: 60 },
    { id: generateId(), text: 'Implementeret løsning', position: 75 },
    { id: generateId(), text: 'Overdragelse til drift', position: 82 },
    { id: generateId(), text: 'Kommunikation til brugere', position: 88 },
    { id: generateId(), text: 'Evalueringsrapport & gevinstopfølgning', position: 95 },
  ],
  kanbanTasks: [
    { id: generateId(), content: 'Afhold opstartsmøde med styregruppen', status: 'done' },
    { id: generateId(), content: 'Samle input til kravspecifikation', status: 'doing' },
    { id: generateId(), content: 'Planlæg brugertræning', status: 'todo' },
  ],
});



const cloneStateWithNewIds = (state: ProjectState): ProjectState => ({
  statusItems: (state.statusItems ?? []).map(item => ({ id: generateId(), content: item.content })),
  challengeItems: (state.challengeItems ?? []).map(item => ({ id: generateId(), content: item.content })),
  mainTableRows: (state.mainTableRows ?? []).map(row => ({
    id: generateId(),
    title: row.title,
    status: row.status,
    note: row.note ?? '',
  })),
  risks: (state.risks ?? []).map(risk => ({ id: generateId(), name: risk.name, s: risk.s ?? 1, k: risk.k ?? 1 })),
  phases: (state.phases ?? []).map(phase => ({
    id: generateId(),
    text: phase.text,
    start: phase.start,
    end: phase.end,
    highlight: phase.highlight ?? 'blue'
  })),
  milestones: (state.milestones ?? []).map(milestone => ({ id: generateId(), text: milestone.text, position: milestone.position ?? 0 })),
  deliverables: (state.deliverables ?? []).map(deliverable => ({ id: generateId(), text: deliverable.text, position: deliverable.position ?? 0 })),
  kanbanTasks: (state.kanbanTasks ?? []).map(task => ({ id: generateId(), content: task.content, status: task.status ?? 'todo' })),
});

const getWeekKey = (date = new Date()): string => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};



export const useProjectManager = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  const editableProjectIds = useMemo(() => new Set(projects.filter(project => project.permissions?.canEdit).map(project => project.id)), [projects]);

  const timeLoggableProjectIds = useMemo(() => new Set(projects.filter(project => project.permissions?.canLogTime).map(project => project.id)), [projects]);

  // Tjekker for en aktiv session ved app-start
  useEffect(() => {
    const checkAuthAndLoad = async () => {
      setIsLoading(true);
      setApiError(null);
      try {
        const setupStatus = await api.checkSetupStatus();
        if (setupStatus.needsSetup) {
            setNeedsSetup(true);
            setIsLoading(false); // Stop loading, we are showing the setup page
            return; // Don't proceed to auth check
        }

        const user = await api.getAuthenticatedUser();
        if (user) {
          const workspace = await api.getWorkspace();
          setProjects(workspace.projects);
          setEmployees(workspace.employees);
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Failed to load session:", error);
        setApiError("Kunne ikke hente data. Prøv at genindlæse siden.");
      } finally {
        setIsLoading(false);
      }
    };
    checkAuthAndLoad();
  }, []);
  
  // Autosave-funktionalitet
  useEffect(() => {
    // Fix: Use ReturnType<typeof setTimeout> to get the correct timeout ID type
    // in both browser (number) and Node (NodeJS.Timeout) environments.
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
            await api.saveWorkspace({ projects, employees });
          } catch (error) {
            console.error("Autosave failed:", error);
            setApiError("ændringer kunne ikke gemmes. Tjek din forbindelse.");
          } finally {
            setIsSaving(false);
          }
        }, 1000); // Gem 1 sekund efter sidste ï¿½ndring
    } else {
        setIsSaving(false);
    }

    return () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    };
  }, [projects, employees, isLoading, isAuthenticated, currentUser]);


  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setApiError(null);
    try {
      const result = await api.login(email, password);
      if (result.success && result.user) {
        const workspace = await api.getWorkspace();
        setProjects(workspace.projects);
        setEmployees(workspace.employees);
        setCurrentUser(result.user);
        setIsAuthenticated(true);
      }
      return result;
    } catch (error) {
      console.error("Login failed:", error);
      setApiError("Der opstod en fejl under login.");
      return { success: false, message: "Serverfejl. Prøv igen senere." };
    } finally {
        setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Always log out on client-side
      setIsAuthenticated(false);
      setCurrentUser(null);
      setProjects([]);
      setEmployees([]);
      setAllUsers([]);
    }
  };
  
  const register = async (email: string, name: string, password: string) => {
    return await api.register(email, name, password);
  };

  // State Updaters
  const updateProjects = (updater: (prev: Project[]) => Project[]) => setProjects(updater);
  const updateEmployees = (updater: (prev: Employee[]) => Employee[]) => setEmployees(updater);
  
  // --- Admin Functions ---
  const fetchAllUsers = useCallback(async () => {
      if (currentUser?.role !== 'Administrator') return;
      try {
          const users = await api.getUsers();
          setAllUsers(users);
      } catch (error) {
          console.error("Failed to fetch users:", error);
          setApiError("Kunne ikke hente brugerliste.");
      }
  }, [currentUser?.role]);

  const updateUserRole = async (userId: string, role: UserRole) => {
      if (currentUser?.role !== 'Administrator') return;
      try {
          await api.updateUserRole(userId, role);
          setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
      } catch (error: any) {
          console.error("Failed to update user role:", error);
          setApiError(`Fejl: ${error.message}`);
      }
  };

  // Medarbejder-funktioner
  const addEmployee = (name: string, location: Location, email: string) => {
    if (employees.some(e => e.email.toLowerCase() === email.toLowerCase())) {
        alert("En medarbejder med denne email findes allerede.");
        return;
    }
    const newEmployee: Employee = { id: generateId(), name, location, email };
    updateEmployees(prev => [...prev, newEmployee]);
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    if (updates.email && employees.some(e => e.id !== id && e.email.toLowerCase() === updates.email!.toLowerCase())) {
        alert("En anden medarbejder med denne email findes allerede.");
        return;
    }
    updateEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };
  
  const deleteEmployee = (id: string) => {
    if (projects.some(p => p.projectMembers.some(m => m.employeeId === id))) {
        if (!window.confirm("Denne medarbejder er tilknyttet et eller flere projekter. Vil du fjerne dem fra alle projekter og slette dem permanent?")) {
            return;
        }
        updateProjects(prevProjects => prevProjects.map(p => ({
            ...p,
            projectMembers: p.projectMembers.filter(m => m.employeeId !== id)
        })));
    }
    updateEmployees(prev => prev.filter(e => e.id !== id));
  };

  const importEmployeesFromCsv = (csvContent: string) => {
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length <= 1) {
        alert("CSV-filen er tom eller indeholder kun en overskriftsrække.");
        return;
    }
    const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    if (header[0] !== 'navn' || header[1] !== 'lokation' || header[2] !== 'email') {
        alert("CSV-filen skal have kolonnerne: Navn,Lokation,Email");
        return;
    }
    let updatedCount = 0, addedCount = 0, skippedCount = 0;
    
    updateEmployees(currentEmployees => {
      let newEmployeesList = [...currentEmployees];
      const existingEmailMap = new Map(newEmployeesList.map(e => [e.email.toLowerCase(), e]));
      const rows = lines.slice(1);

      for (const row of rows) {
          const [name, location, email] = row.split(',').map(s => s.trim().replace(/"/g, ''));
          if (!name || !location || !email || !locations.includes(location as Location)) {
              skippedCount++;
              continue;
          }
          const existingEmployee = existingEmailMap.get(email.toLowerCase());
          if (existingEmployee) {
              const index = newEmployeesList.findIndex(e => e.id === existingEmployee.id);
              newEmployeesList[index] = { ...existingEmployee, name, location: location as Location };
              updatedCount++;
          } else {
              const newEmployee: Employee = { id: generateId(), name, location: location as Location, email };
              newEmployeesList.push(newEmployee);
              addedCount++;
          }
      }
      alert(`Import færdig.\n- ${addedCount} nye medarbejdere tilføjet.\n- ${updatedCount} eksisterende medarbejdere opdateret.\n- ${skippedCount} rækker sprunget over pga. fejl.`);
      return newEmployeesList;
    });
  };
  
  // Projekt-funktioner
  const createNewProject = (name: string): Project | null => {
    if (projects.some(p => p.config.projectName.toLowerCase() === name.toLowerCase())) {
        alert("Et projekt med dette navn eksisterer allerede.");
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
    updateProjects(prev => [...prev, newProject]);
    return newProject;
  };
  
  const updateProjectConfig = (projectId: string, newConfig: Partial<ProjectConfig>) => {
    updateProjects(prev => prev.map(p => {
        if (p.id !== projectId) return p;
        if (newConfig.projectName && projects.some(op => op.id !== projectId && op.config.projectName === newConfig.projectName)) {
            alert("Et projekt med dette navn eksisterer allerede.");
            return p;
        }
        return { ...p, config: { ...p.config, ...newConfig } };
    }));
  };

  const updateProjectStatus = (projectId: string, status: ProjectStatus) => {
    updateProjects(prev => prev.map(p => p.id === projectId ? { ...p, status } : p));
  };
  
  const getProjectById = (projectId: string | null) => {
    return projects.find(p => p.id === projectId) || null;
  };
  
  const updateProjectState = useCallback((projectId: string, weekKey: string, updater: (prevState: ProjectState) => ProjectState) => {
    updateProjects(prevProjects => prevProjects.map(p => {
        if (p.id !== projectId) return p;
        const reportIndex = p.reports.findIndex(r => r.weekKey === weekKey);
        if (reportIndex === -1) return p;
        const updatedReport: Report = { ...p.reports[reportIndex], state: updater(p.reports[reportIndex].state) };
        const updatedReports = [...p.reports];
        updatedReports[reportIndex] = updatedReport;
        return { ...p, reports: updatedReports };
    }));
  }, []);

  const assignEmployeeToProject = (projectId: string, employeeId: string) => {
      updateProjects(prev => prev.map(p => {
          if (p.id !== projectId || p.projectMembers.some(m => m.employeeId === employeeId)) return p;
          const newMember: ProjectMember = { id: generateId(), employeeId: employeeId, role: 'Ny rolle', group: 'unassigned', timeEntries: [] };
          return { ...p, projectMembers: [...p.projectMembers, newMember] };
      }));
  };

  const updateProjectMember = (projectId: string, memberId: string, updates: Partial<ProjectMember>) => {
      updateProjects(prev => prev.map(p => p.id !== projectId ? p : { ...p, projectMembers: p.projectMembers.map(m => m.id === memberId ? { ...m, ...updates } : m) }));
  };

  const deleteProjectMember = (projectId: string, memberId: string) => {
      updateProjects(prev => prev.map(p => p.id !== projectId ? p : { ...p, projectMembers: p.projectMembers.filter(m => m.id !== memberId) }));
  };
    
  const updateTimeLogForMember = (
  projectId: string,
  memberId: string,
  weekKey: string,
  hours: { planned?: number; actual?: number },
) => {
  updateProjects((prev) =>
    prev.map((project) => {
      if (project.id !== projectId) {
        return project;
      }

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
                plannedHours: Math.max(0, hours.planned ?? 0),
                actualHours: Math.max(0, hours.actual ?? 0),
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

      updateProjects((prev) =>
        prev.map((project) => {
          if (project.id !== projectId) {
            return project;
          }

          return {
            ...project,
            projectMembers: project.projectMembers.map((member) =>
              member.id === memberId ? { ...member, timeEntries: response.member!.timeEntries } : member,
            ),
          };
        }),
      );
    })
    .catch((error) => {
      console.error('Time log sync failed:', error);
      setApiError('Kunne ikke synkronisere timeregistrering. Prøv igen.');
    });
};
const bulkUpdateTimeLogForMember = (projectId: string, memberId: string, entriesToUpdate: { weekKey: string, plannedHours: number }[]) => {
    updateProjects(prev => prev.map(p => {
        if (p.id !== projectId) return p;
        return { ...p,
            projectMembers: p.projectMembers.map(m => {
                if (m.id !== memberId) return m;
                const entriesMap = new Map(m.timeEntries.map(te => [te.weekKey, te]));
                for (const { weekKey, plannedHours } of entriesToUpdate) {
                    const existing = entriesMap.get(weekKey) || { weekKey, plannedHours: 0, actualHours: 0 };
                    entriesMap.set(weekKey, { ...existing, plannedHours });
                }
                const updatedEntries = Array.from(entriesMap.values())
                    .filter(e => e.plannedHours > 0 || e.actualHours > 0)
                    .sort((a, b) => a.weekKey.localeCompare(b.weekKey));
                return { ...m, timeEntries: updatedEntries };
            })
        };
    }));
  };


  return {
    // Auth & State
    isAuthenticated,
    currentUser,
    isLoading,
    isSaving,
    apiError,
    login,
    logout,
    register,
    needsSetup,
    completeSetup: () => setNeedsSetup(false),
    // Role-based access
    isAdministrator: currentUser?.role === 'Administrator',
    canManage: currentUser?.role === 'Administrator' || currentUser?.role === 'Projektleder',
    // Data
    projects,
    employees,
    allUsers,
    // Admin functions
    fetchAllUsers,
    updateUserRole,
    // Medarbejder-funktioner
    addEmployee,
    updateEmployee,
    deleteEmployee,
    importEmployeesFromCsv,
    // Projekt-funktioner
    createNewProject,
    updateProjectConfig,
    updateProjectStatus,
    getProjectById,
    getWeekKey,

    projectActions: (projectId: string, weekKey: string | null) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return null;
        const updateState = (updater: (prevState: ProjectState) => ProjectState) => {
            if(weekKey) updateProjectState(projectId, weekKey, updater);
        };
        return {
            updateMainTableRowNote: (id: string, note: string) => updateState(s => ({ ...s, mainTableRows: s.mainTableRows.map(r => r.id === id ? { ...r, note } : r) })),
            cycleStatus: (id: string) => {
                const order: ('green' | 'yellow' | 'red')[] = ['green', 'yellow', 'red'];
                updateState(s => ({
                    ...s,
                    mainTableRows: s.mainTableRows.map(r => {
                        if (r.id !== id) return r;
                        const currentIndex = order.indexOf(r.status);
                        const nextStatus = order[(currentIndex + 1) % order.length];
                        return { ...r, status: nextStatus };
                    })
                }));
            },
            statusListManager: {
                addItem: () => updateState(s => ({ ...s, statusItems: [...s.statusItems, { id: generateId(), content: 'Nyt punkt' }]})),
                deleteItem: (id: string) => updateState(s => ({ ...s, statusItems: s.statusItems.filter(i => i.id !== id)})),
                updateItem: (id: string, content: string) => updateState(s => ({ ...s, statusItems: s.statusItems.map(i => i.id === id ? { ...i, content } : i) })),
                reorderItems: (sourceIndex: number, destinationIndex: number) => updateState(s => {
                    const list = [...s.statusItems];
                    const [removed] = list.splice(sourceIndex, 1);
                    list.splice(destinationIndex, 0, removed);
                    return { ...s, statusItems: list };
                }),
            },
            challengeListManager: {
                addItem: () => updateState(s => ({ ...s, challengeItems: [...s.challengeItems, { id: generateId(), content: 'Nyt punkt' }]})),
                deleteItem: (id: string) => updateState(s => ({ ...s, challengeItems: s.challengeItems.filter(i => i.id !== id)})),
                updateItem: (id: string, content: string) => updateState(s => ({ ...s, challengeItems: s.challengeItems.map(i => i.id === id ? { ...i, content } : i) })),
                reorderItems: (sourceIndex: number, destinationIndex: number) => updateState(s => {
                    const list = [...s.challengeItems];
                    const [removed] = list.splice(sourceIndex, 1);
                    list.splice(destinationIndex, 0, removed);
                    return { ...s, challengeItems: list };
                }),
            },
            riskManager: {
                add: () => updateState(s => ({...s, risks: [...s.risks, {id: generateId(), name: 'Ny risiko', s: 1, k: 1}]})),
                delete: (id: string) => updateState(s => ({...s, risks: s.risks.filter(r => r.id !== id)})),
                updateName: (id: string, name: string) => updateState(s => ({...s, risks: s.risks.map(r => r.id === id ? {...r, name} : r)})),
                updatePosition: (id: string, s_val: number, k_val: number) => updateState(s => ({...s, risks: s.risks.map(r => r.id === id ? {...r, s: s_val, k: k_val} : r)})),
            },
            kanbanManager: {
                add: (status: 'todo' | 'doing' | 'done') => updateState(s => ({...s, kanbanTasks: [...(s.kanbanTasks || []), {id: generateId(), content: 'Ny opgave', status}]})),
                delete: (id: string) => updateState(s => ({...s, kanbanTasks: s.kanbanTasks.filter(t => t.id !== id)})),
                updateContent: (id: string, content: string) => updateState(s => ({...s, kanbanTasks: s.kanbanTasks.map(t => t.id === id ? {...t, content} : t)})),
                updateStatus: (id: string, status: 'todo' | 'doing' | 'done') => updateState(s => ({...s, kanbanTasks: s.kanbanTasks.map(t => t.id === id ? {...t, status} : t)})),
            },
            timelineManager: {
                add: (type, pos) => updateState(s => { const newId = generateId();
                    if (type === 'phase') return { ...s, phases: [...s.phases, { id: newId, text: 'Ny fase', start: pos, end: Math.min(pos + 10, 100), highlight: 'blue' }] };
                    if (type === 'milestone') return { ...s, milestones: [...s.milestones, { id: newId, text: 'Ny milepæl', position: pos }] };
                    if (type === 'deliverable') return { ...s, deliverables: [...s.deliverables, { id: newId, text: 'Ny leverance', position: pos }] };
                    return s;
                }),
                update: (type, id, updates) => updateState(s => {
                    if (type === 'phase') return { ...s, phases: s.phases.map(item => item.id === id ? { ...item, ...updates } : item) };
                    if (type === 'milestone') return { ...s, milestones: s.milestones.map(item => item.id === id ? { ...item, ...updates } : item) };
                    if (type === 'deliverable') return { ...s, deliverables: s.deliverables.map(item => item.id === id ? { ...item, ...updates } : item) };
                    return s;
                }),
                delete: (type, id) => updateState(s => {
                    if (type === 'phase') return { ...s, phases: s.phases.filter(item => item.id !== id) };
                    if (type === 'milestone') return { ...s, milestones: s.milestones.filter(item => item.id !== id) };
                    if (type === 'deliverable') return { ...s, deliverables: s.deliverables.filter(item => item.id !== id) };
                    return s;
                }),
                calculateDateFromPosition: (pos) => { try{const s=new Date(project.config.projectStartDate).getTime(),e=new Date(project.config.projectEndDate).getTime();return new Date(s+((e-s)*pos/100)).toISOString().split('T')[0];}catch{return'';} },
                calculatePositionFromDate: (date) => { try{const s=new Date(project.config.projectStartDate).getTime(),e=new Date(project.config.projectEndDate).getTime();return Math.max(0,Math.min(100,((new Date(date).getTime()-s)/(e-s))*100));}catch{return 0;} },
                getTodayPosition: () => { try{const s=new Date(project.config.projectStartDate).getTime(),e=new Date(project.config.projectEndDate).getTime(),t=new Date().getTime();if(t<s||t>e||e<=s)return null;return((t-s)/(e-s))*100;}catch{return null;} },
                getMonthMarkers: () => { try{const s=new Date(project.config.projectStartDate),e=new Date(project.config.projectEndDate);if(e<=s)return[];const m=[];let c=new Date(s);c.setDate(1);while(c<=e){const p=((c.getTime()-s.getTime())/(e.getTime()-s.getTime()))*100;if(p>=0&&p<=100){m.push({position:p,label:c.toLocaleString('da-DK',{month:'short',year:'2-digit'})});}c.setMonth(c.getMonth()+1);}return m;}catch{return[];} },
            },
            reportsManager: {
                getAvailableWeeks: () => {
                    const weeks = new Set<string>();
                    try {
                        const start = new Date(project.config.projectStartDate);
                        const end = new Date(project.config.projectEndDate);
                        if (start > end) return [];
                        let current = start;
                        while (current <= end) {
                            weeks.add(getWeekKey(new Date(current)));
                            current.setDate(current.getDate() + 7);
                        }
                    } catch (e) { return []; }
                    const existingWeeks = new Set(project.reports.map(r => r.weekKey));
                    return Array.from(weeks).filter(w => !existingWeeks.has(w)).sort().reverse();
                },
                create: (weekKey: string, copyLatest: boolean) => {
                    updateProjects(prev => prev.map(p => {
                        if (p.id !== projectId || p.reports.some(r => r.weekKey === weekKey)) return p;
                        const latest = copyLatest ? [...p.reports].sort((a,b) => b.weekKey.localeCompare(a.weekKey))[0] : null;
                        const baseState = latest ? latest.state : getInitialProjectState();
                        const newReport: Report = { weekKey, state: cloneStateWithNewIds(baseState) };
                        return { ...p, reports: [...p.reports, newReport].sort((a, b) => b.weekKey.localeCompare(a.weekKey)) };
                    }));
                },
                createNext: () => {
                    const allPossibleWeeksSet = new Set<string>();
                    try {
                        const start = new Date(project.config.projectStartDate);
                        const end = new Date(project.config.projectEndDate);
                        if (start > end) { alert("Projektets slutdato er før startdatoen."); return null; }
                        let current = new Date(start);
                        while (current <= end) { allPossibleWeeksSet.add(getWeekKey(new Date(current))); current.setDate(current.getDate() + 7); }
                    } catch (e) { console.error("Ugyldig dato i projektkonfiguration", e); return null; }
                    
                    const existingWeeks = new Set(project.reports.map(r => r.weekKey));
                    
                    if (project.reports.length === 0) {
                        const firstWeek = getWeekKey(new Date(project.config.projectStartDate));
                        const weekToCreate = existingWeeks.has(firstWeek) ? getWeekKey(new Date()) : firstWeek;
                         updateProjects(prev => prev.map(p => {
                            if (p.id !== projectId) return p;
                            const newReport: Report = { weekKey: weekToCreate, state: cloneStateWithNewIds(getInitialProjectState()) };
                            return { ...p, reports: [...p.reports, newReport]};
                        }));
                        return weekToCreate;
                    }

                    const latestReport = [...project.reports].sort((a,b) => b.weekKey.localeCompare(a.weekKey))[0];
                    const [year, week] = latestReport.weekKey.replace('W','').split('-').map(Number);
                    const d = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
                    d.setUTCDate(d.getUTCDate() + 7);
                    const nextWeekKey = getWeekKey(d);

                    if (!allPossibleWeeksSet.has(nextWeekKey)) {
                         alert("Næste uge er uden for projektets tidsramme.");
                         return null;
                    }
                    if (existingWeeks.has(nextWeekKey)) {
                        alert(`En rapport for uge ${nextWeekKey} findes allerede.`);
                        return nextWeekKey;
                    }
                     const clonedState = cloneStateWithNewIds(latestReport.state);
                     updateProjects(prev => prev.map(p => {
                        const newReport: Report = { weekKey: nextWeekKey, state: clonedState };
                        return { ...p, reports: [...p.reports, newReport].sort((a, b) => b.weekKey.localeCompare(a.weekKey)) };
                    }));

                    return nextWeekKey;
                },
                delete: (weekKeyToDelete: string) => {
                    updateProjects(prev => prev.map(p => p.id !== projectId ? p : {...p, reports: p.reports.filter(r => r.weekKey !== weekKeyToDelete)}));
                }
            },
             organizationManager: {
                assignEmployee: (employeeId: string) => assignEmployeeToProject(projectId, employeeId),
                updateMember: (memberId: string, updates: Partial<ProjectMember>) => updateProjectMember(projectId, memberId, updates),
                deleteMember: (memberId: string) => deleteProjectMember(projectId, memberId),
                updateTimeLog: (memberId: string, weekKey: string, hours: { planned?: number; actual?: number }) => updateTimeLogForMember(projectId, memberId, weekKey, hours),
                bulkUpdateTimeLog: (memberId: string, entries: { weekKey: string, plannedHours: number }[]) => bulkUpdateTimeLogForMember(projectId, memberId, entries),
            }
        };
    }
  };
};








