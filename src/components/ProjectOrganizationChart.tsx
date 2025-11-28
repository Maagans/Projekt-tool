import React, { useState, useMemo, useEffect, DragEvent } from 'react';
import { ProjectMember, Employee, Project, Location } from '../types';
import { TrashIcon, ClockIcon } from './Icons';
import { EditableField } from './EditableField';
import { UserPlus, GripVertical, Mail, Briefcase, IdCard, X, User } from 'lucide-react';

type MemberGroup = ProjectMember['group'];

const COLUMNS: { id: MemberGroup; title: string; color: 'red' | 'blue' | 'amber' | 'purple' | 'slate' }[] = [
  { id: 'styregruppe', title: 'Styregruppe', color: 'red' },
  { id: 'projektgruppe', title: 'Projektgruppe / Kernegruppe', color: 'blue' },
  { id: 'partnere', title: 'Strategiske Partnerskaber', color: 'amber' },
  { id: 'referencegruppe', title: 'Referencegruppe', color: 'purple' },
  { id: 'unassigned', title: 'Ikke tildelte medlemmer', color: 'slate' },
];

type AddMemberPayload = {
  employeeId?: string;
  role?: string;
  group?: MemberGroup;
  newEmployee?: { id?: string; name: string; email: string; location?: Location | null; department?: string | null };
};

interface ProjectOrganizationChartProps {
  project: Project;
  members: ProjectMember[];
  allEmployees: Employee[];
  canManageMembers: boolean;
  canLogTime: boolean;
  currentUserEmployeeId?: string | null;
  isSaving?: boolean;
  onAssignEmployee: (payload: AddMemberPayload) => void;
  onUpdateMember: (id: string, updates: Partial<ProjectMember>) => void;
  onDeleteMember: (id: string) => void;
  onUpdateTimeLog: (memberId: string, weekKey: string, hours: { planned?: number; actual?: number }) => void;
  onBulkUpdateTimeLog: (memberId: string, entries: { weekKey: string; plannedHours: number }[]) => void;
}

// --- Helper for Allocation Calculation ---
const calculateAllocation = (member: ProjectMember, project: Project): number => {
  if (!member.timeEntries || member.timeEntries.length === 0) return 0;

  // Calculate total planned hours
  const totalPlanned = member.timeEntries.reduce((sum, entry) => sum + (entry.plannedHours || 0), 0);

  // Estimate project duration in weeks (rough approximation)
  const start = new Date(project.config.projectStartDate).getTime();
  const end = new Date(project.config.projectEndDate).getTime();
  const weeks = Math.max(1, (end - start) / (1000 * 60 * 60 * 24 * 7));

  // Average hours per week
  const avgHoursPerWeek = totalPlanned / weeks;

  // Assume standard work week is 37 hours
  const allocation = Math.min(100, Math.round((avgHoursPerWeek / 37) * 100));
  return allocation;
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// --- Components ---

interface AddMemberModalProps {
  allEmployees: Employee[];
  projectMembers: ProjectMember[];
  onAssign: (payload: AddMemberPayload) => void;
  onUpdateMember: (id: string, updates: Partial<ProjectMember>) => void;
  onBulkUpdateTimeLog: (memberId: string, entries: { weekKey: string; plannedHours: number }[]) => void;
  onClose: () => void;
  isBusy: boolean;
  initialGroup: MemberGroup;
  project: Project;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({
  allEmployees,
  projectMembers,
  onAssign,
  onUpdateMember: _onUpdateMember,
  onBulkUpdateTimeLog: _onBulkUpdateTimeLog,
  onClose,
  isBusy,
  initialGroup,
  project: _project
}) => {
  const [step, setStep] = useState<'select-employee' | 'configure'>('select-employee');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [role, setRole] = useState('');
  const [allocation, setAllocation] = useState(50);
  const [assignableEmployees, setAssignableEmployees] = useState<Employee[]>([]);
  const [externalName, setExternalName] = useState('');
  const [externalEmail, setExternalEmail] = useState('');

  useEffect(() => {
    const assignedIds = new Set(projectMembers.map((m) => m.employeeId));
    const filtered = allEmployees
      .filter((e) => !assignedIds.has(e.id))
      .filter((e) =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    setAssignableEmployees(filtered);
  }, [allEmployees, projectMembers, searchTerm]);

  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setExternalName('');
    setExternalEmail('');
    setRole(employee.jobTitle || 'Teammedlem');
    setStep('configure');
  };

  const handleSave = async () => {
    if (selectedEmployee) {
      onAssign({ employeeId: selectedEmployee.id, role, group: initialGroup });
      onClose();
      return;
    }

    const name = externalName.trim() || searchTerm.trim();
    const email = externalEmail.trim();
    if (!name || !email) {
      alert('Angiv navn og email for eksternt medlem.');
      return;
    }
    onAssign({
      newEmployee: { name, email },
      role: role || 'Ekstern',
      group: initialGroup,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">
            {step === 'select-employee' ? 'Vælg Medarbejder' : 'Konfigurer Medlem'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {step === 'select-employee' ? (
          <div className="p-6 flex-1 overflow-hidden flex flex-col">
            <div className="relative mb-4">
              <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                autoFocus
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                placeholder="Søg efter navn eller email..."
              />
            </div>
            <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-2">
              {assignableEmployees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => handleSelectEmployee(emp)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-all text-left group"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                    {getInitials(emp.name)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-700 text-sm">{emp.name}</div>
                    <div className="text-xs text-slate-500">{emp.email}</div>
                  </div>
                  <div className="ml-auto opacity-0 group-hover:opacity-100 text-indigo-600">
                    <UserPlus size={16} />
                  </div>
                </button>
              ))}
              {assignableEmployees.length === 0 && (
                <div className="text-center text-slate-400 py-8 text-sm">Ingen medarbejdere fundet</div>
              )}
            </div>
            <div className="mt-4 border-t border-slate-200 pt-4 space-y-3">
              <div className="text-xs font-semibold uppercase text-slate-500">Tilføj ekstern</div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={externalName}
                  onChange={(e) => setExternalName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  placeholder="Navn"
                />
                <input
                  type="email"
                  value={externalEmail}
                  onChange={(e) => setExternalEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  placeholder="Email"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedEmployee(null);
                  setRole('Ekstern leverandør');
                  setStep('configure');
                }}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50"
                disabled={!externalName.trim() || !externalEmail.trim()}
              >
                Tilføj ekstern medlem
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {selectedEmployee ? (
              <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">
                  {getInitials(selectedEmployee!.name)}
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-sm">{selectedEmployee!.name}</div>
                  <div className="text-xs text-indigo-600">{selectedEmployee!.email}</div>
                </div>
                <button onClick={() => setStep('select-employee')} className="ml-auto text-xs text-indigo-600 hover:underline">Skift</button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">
                    {getInitials(externalName || 'Ekstern')}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 text-sm">{externalName || 'Ekstern medlem'}</div>
                    <div className="text-xs text-indigo-600">{externalEmail || 'Angiv email'}</div>
                  </div>
                  <button onClick={() => setStep('select-employee')} className="ml-auto text-xs text-indigo-600 hover:underline">Skift</button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    value={externalName}
                    onChange={(e) => setExternalName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="Navn"
                  />
                  <input
                    type="email"
                    value={externalEmail}
                    onChange={(e) => setExternalEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="Email"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rolle i projektet</label>
              <div className="relative">
                <IdCard className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  placeholder="Projektrolle"
                />
              </div>
            </div>

            {/* Note: Allocation is not fully wired up in this version due to API constraints, but UI is shown */}
            <div className="opacity-50 pointer-events-none grayscale">
              <div className="flex justify-between mb-1">
                <label className="block text-xs font-bold text-slate-500 uppercase">Allokering (Kommer snart)</label>
                <span className="text-xs font-bold text-indigo-600">{allocation}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={allocation}
                onChange={(e) => setAllocation(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-[10px] text-slate-400 mt-1">Du kan justere tid efter oprettelse.</p>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Annuller
              </button>
              <button
                onClick={handleSave}
                disabled={isBusy}
                className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 disabled:opacity-50"
                aria-label="Tilføj Medlem"
              >
                {isBusy ? 'Opretter...' : 'Tilføj Medlem'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface TimeLogModalProps {
  project: Project;
  member: ProjectMember;
  employee: Employee;
  canEditPlanned: boolean;
  canEditActual: boolean;
  onClose: () => void;
  onUpdateTimeLog: (weekKey: string, hours: { planned?: number; actual?: number }) => void;
  onBulkUpdateTimeLog: (entries: { weekKey: string; plannedHours: number }[]) => void;
}

export const TimeLogModal: React.FC<TimeLogModalProps> = ({
  project,
  member,
  employee,
  canEditPlanned,
  canEditActual,
  onClose,
  onUpdateTimeLog,
  onBulkUpdateTimeLog,
}) => {
  const timeEntriesMap = useMemo(() => new Map(member.timeEntries.map((te) => [te.weekKey, te])), [member.timeEntries]);
  const [bulkHours, setBulkHours] = useState('');
  const [plannedValues, setPlannedValues] = useState<Record<string, string>>({});
  const [actualValues, setActualValues] = useState<Record<string, string>>({});

  const projectWeeks = useMemo(() => {
    const weeks: string[] = [];
    try {
      const start = new Date(project.config.projectStartDate);
      const end = new Date(project.config.projectEndDate);
      if (start > end) return [];
      const current = new Date(start);
      while (current <= end) {
        const d = new Date(Date.UTC(current.getFullYear(), current.getMonth(), current.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
        weeks.push(`${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`);
        current.setDate(current.getDate() + 7);
      }
      return [...new Set(weeks)];
    } catch {
      return [];
    }
  }, [project.config.projectStartDate, project.config.projectEndDate]);

  useEffect(() => {
    const nextPlanned: Record<string, string> = {};
    const nextActual: Record<string, string> = {};

    projectWeeks.forEach((weekKey) => {
      const entry = timeEntriesMap.get(weekKey);
      nextPlanned[weekKey] =
        typeof entry?.plannedHours === 'number' && Number.isFinite(entry.plannedHours)
          ? String(entry.plannedHours)
          : '';
      nextActual[weekKey] =
        typeof entry?.actualHours === 'number' && Number.isFinite(entry.actualHours)
          ? String(entry.actualHours)
          : '';
    });

    setPlannedValues(nextPlanned);
    setActualValues(nextActual);
  }, [projectWeeks, timeEntriesMap]);

  const totals = useMemo(
    () =>
      member.timeEntries.reduce(
        (acc, curr) => ({ planned: acc.planned + curr.plannedHours, actual: acc.actual + curr.actualHours }),
        { planned: 0, actual: 0 },
      ),
    [member.timeEntries],
  );

  const handleBulkInsert = (interval: 1 | 2 | 4) => {
    if (!canEditPlanned) return;
    const hours = parseFloat(bulkHours);
    if (Number.isNaN(hours) || hours < 0) {
      alert('Indtast venligst et gyldigt, positivt antal timer.');
      return;
    }

    const entriesToUpdate = projectWeeks
      .filter((_, index) => index % interval === 0)
      .map((weekKey) => ({ weekKey, plannedHours: hours }));

    setPlannedValues((prev) => {
      const next = { ...prev };
      const value = Number.isFinite(hours) ? String(hours) : '';
      entriesToUpdate.forEach(({ weekKey }) => {
        next[weekKey] = value;
      });
      return next;
    });

    onBulkUpdateTimeLog(entriesToUpdate);
  };

  const plannedInputClass = `bg-white border text-right border-slate-300 rounded-md p-1.5 text-sm w-full ${canEditPlanned ? '' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
    }`;
  const actualInputClass = `bg-white border text-right border-slate-300 rounded-md p-1.5 text-sm w-full ${canEditActual ? '' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
    }`;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl flex flex-col h-[80vh]">
        <h3 className="text-xl font-bold mb-1 text-slate-800">Timeregistrering</h3>
        <p className="text-slate-600 mb-4">
          Projekt: {project.config.projectName} - Medarbejder: {employee.name}
        </p>

        {canEditPlanned && (
          <div className="bg-slate-100 p-3 rounded-md mb-4 border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">Hurtig-indtastning af planlagte timer</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={bulkHours}
                onChange={(e) => setBulkHours(e.target.value)}
                placeholder="Timer..."
                className="bg-white border border-slate-300 rounded-md p-2 text-sm w-24"
              />
              <button
                onClick={() => handleBulkInsert(1)}
                className="flex-1 bg-blue-100 text-blue-700 text-sm font-semibold py-2 px-3 rounded-md hover:bg-blue-200"
              >
                Hver uge
              </button>
              <button
                onClick={() => handleBulkInsert(2)}
                className="flex-1 bg-blue-100 text-blue-700 text-sm font-semibold py-2 px-3 rounded-md hover:bg-blue-200"
              >
                Hver 2. uge
              </button>
              <button
                onClick={() => handleBulkInsert(4)}
                className="flex-1 bg-blue-100 text-blue-700 text-sm font-semibold py-2 px-3 rounded-md hover:bg-blue-200"
              >
                Hver 4. uge
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-x-4 px-2 py-2 bg-slate-100 rounded-t-md font-bold text-slate-600">
          <div>Uge</div>
          <div className="text-right">Planlagte timer</div>
          <div className="text-right">Faktiske timer</div>
        </div>
        <div className="flex-grow overflow-y-auto -mx-6 px-6 border-x border-b border-slate-200 rounded-b-md">
          <div className="space-y-1 py-1">
            {projectWeeks.map((weekKey) => (
              <div key={weekKey} className="grid grid-cols-3 gap-x-4 items-center p-2 rounded-md hover:bg-slate-50">
                <span className="font-semibold">{weekKey}</span>
                <input
                  type="number"
                  min="0"
                  value={plannedValues[weekKey] ?? ''}
                  disabled={!canEditPlanned}
                  onChange={
                    canEditPlanned
                      ? (e) =>
                        setPlannedValues((prev) => ({
                          ...prev,
                          [weekKey]: e.target.value,
                        }))
                      : undefined
                  }
                  onBlur={
                    canEditPlanned
                      ? (e) => {
                        const rawValue = e.target.value;
                        const numericValue = Number(rawValue);
                        if (!rawValue || Number.isNaN(numericValue)) {
                          setPlannedValues((prev) => ({ ...prev, [weekKey]: '' }));
                          onUpdateTimeLog(weekKey, { planned: 0 });
                          return;
                        }

                        const normalisedValue = Math.max(0, numericValue);
                        const nextValue = String(normalisedValue);
                        setPlannedValues((prev) => ({ ...prev, [weekKey]: nextValue }));
                        onUpdateTimeLog(weekKey, { planned: normalisedValue });
                      }
                      : undefined
                  }
                  className={plannedInputClass}
                />
                <input
                  type="number"
                  min="0"
                  value={actualValues[weekKey] ?? ''}
                  disabled={!canEditActual}
                  onChange={
                    canEditActual
                      ? (e) =>
                        setActualValues((prev) => ({
                          ...prev,
                          [weekKey]: e.target.value,
                        }))
                      : undefined
                  }
                  onBlur={
                    canEditActual
                      ? (e) => {
                        const rawValue = e.target.value;
                        const numericValue = Number(rawValue);
                        if (!rawValue || Number.isNaN(numericValue)) {
                          setActualValues((prev) => ({ ...prev, [weekKey]: '' }));
                          onUpdateTimeLog(weekKey, { actual: 0 });
                          return;
                        }

                        const normalisedValue = Math.max(0, numericValue);
                        const nextValue = String(normalisedValue);
                        setActualValues((prev) => ({ ...prev, [weekKey]: nextValue }));
                        onUpdateTimeLog(weekKey, { actual: normalisedValue });
                      }
                      : undefined
                  }
                  className={actualInputClass}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-x-4 px-2 py-3 mt-2 font-bold border-t border-slate-200">
          <div>Total</div>
          <div data-testid="timelog-total-planned" className="text-right">
            {totals.planned.toFixed(1)}
          </div>
          <div data-testid="timelog-total-actual" className="text-right">
            {totals.actual.toFixed(1)}
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="bg-slate-200 text-slate-800 px-4 py-2 rounded-md text-sm font-semibold hover:bg-slate-300"
          >
            Luk
          </button>
        </div>
      </div>
    </div>
  );
};


// --- Main Component ---

export const ProjectOrganizationChart: React.FC<ProjectOrganizationChartProps> = ({
  project,
  members,
  allEmployees,
  canManageMembers,
  canLogTime,
  currentUserEmployeeId,
  isSaving = false,
  onAssignEmployee,
  onUpdateMember,
  onDeleteMember,
  onUpdateTimeLog,
  onBulkUpdateTimeLog,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetGroup, setTargetGroup] = useState<MemberGroup>('styregruppe');
  const [timeLogMemberId, setTimeLogMemberId] = useState<string | null>(null);

  const interactionsLocked = Boolean(isSaving);
  const canManageNow = canManageMembers && !interactionsLocked;

  const employeeMap = useMemo(() => new Map(allEmployees.map((e) => [e.id, e])), [allEmployees]);

  const activeMember = useMemo(() => {
    if (!timeLogMemberId) return null;
    return members.find((member) => member.id === timeLogMemberId) ?? null;
  }, [timeLogMemberId, members]);

  const activeEmployee = activeMember ? employeeMap.get(activeMember.employeeId) ?? null : null;

  // -- Drag and Drop Logic --

  const handleDragStart = (e: DragEvent<HTMLDivElement>, memberId: string) => {
    if (!canManageNow) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/member-assignment-id', memberId);
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (canManageNow) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, targetGroupId: MemberGroup) => {
    if (!canManageNow) return;
    e.preventDefault();
    const memberId = e.dataTransfer.getData('application/member-assignment-id');

    if (memberId) {
      onUpdateMember(memberId, { group: targetGroupId });
    }
  };

  const handleAddClick = (groupId: MemberGroup) => {
    setTargetGroup(groupId);
    setIsAddModalOpen(true);
  };

  // Helper styles for dynamiske farver på kolonner
  const getColumnStyles = (color: string) => {
    const styles = {
      red: { bg: 'bg-rose-50/50', border: 'border-rose-100', header: 'text-rose-800', accent: 'bg-rose-400' },
      blue: { bg: 'bg-sky-50/50', border: 'border-sky-100', header: 'text-sky-800', accent: 'bg-sky-400' },
      amber: { bg: 'bg-amber-50/50', border: 'border-amber-100', header: 'text-amber-800', accent: 'bg-amber-400' },
      purple: { bg: 'bg-violet-50/50', border: 'border-violet-100', header: 'text-violet-800', accent: 'bg-violet-400' },
      slate: { bg: 'bg-slate-50/50', border: 'border-slate-100', header: 'text-slate-800', accent: 'bg-slate-400' }
    };
    return styles[color as keyof typeof styles] || styles.blue;
  };

  return (
    <div className="h-full flex flex-col pb-6 animate-in fade-in duration-300 relative">
      {/* Header Toolbar */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="bg-indigo-600 w-2 h-6 rounded-full"></span>
            Projektorganisation
          </h2>
          <p className="text-slate-500 text-sm mt-1 ml-4">Træk og slip medlemmer for at organisere teamet.</p>
        </div>
        {canManageNow && (
          <button
            onClick={() => handleAddClick('styregruppe')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 flex items-center gap-2"
            aria-hidden={isAddModalOpen}
            tabIndex={isAddModalOpen ? -1 : undefined}
          >
            <UserPlus size={16} />
            Tilføj Medlem
          </button>
        )}
      </div>

      {/* Kanban Board Area */}
      <div className="flex-1 min-h-[600px] overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex gap-6 h-full min-w-full">
          {COLUMNS.map(col => {
            const colMembers = members.filter(m => m.group === col.id);
            const style = getColumnStyles(col.color);

            return (
              <div
                key={col.id}
                className={`flex-1 min-w-[320px] flex flex-col rounded-xl border ${style.border} ${style.bg} transition-colors relative group/col`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Column Header */}
                <div className={`p-4 border-b ${style.border} flex items-center justify-between bg-white/40 backdrop-blur-sm rounded-t-xl`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${style.accent} shadow-sm`}></div>
                    <h3 className={`font-bold ${style.header}`}>{col.title}</h3>
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100">
                    {colMembers.length}
                  </span>
                </div>

                {/* Drop Zone / Member List */}
                <div className="flex-1 p-3 overflow-y-auto space-y-3 relative">
                  {colMembers.map(member => {
                    const employee = employeeMap.get(member.employeeId);
                    const allocation = calculateAllocation(member, project);
                    const initials = employee ? getInitials(employee.name) : '??';
                    const isCurrentUser = currentUserEmployeeId === member.employeeId;
                    const canLogThis = canManageMembers || (canLogTime && isCurrentUser);

                    return (
                      <div
                        key={member.id}
                        draggable={canManageNow}
                        onDragStart={(e) => handleDragStart(e, member.id)}
                        onDragEnd={handleDragEnd}
                        className={`bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-300 hover:-translate-y-0.5 transition-all group relative z-10 ${canManageNow ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      >
                        {/* Drag Handle (Visible on hover) */}
                        {canManageNow && (
                          <div className="absolute top-3 right-2 text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab">
                            <GripVertical size={14} />
                          </div>
                        )}

                        {/* Header: Avatar & Name */}
                        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-sm shrink-0
                                                ${allocation > 80 ? 'bg-slate-800' : 'bg-indigo-500'}`}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 text-sm truncate">{employee?.name || 'Ukendt'}</h4>
                            <div className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                              <IdCard size={12} />
                              <EditableField
                                initialValue={member.role}
                                onSave={(role) => onUpdateMember(member.id, { role })}
                                disabled={!canManageNow}
                                className="!p-0 !bg-transparent hover:!bg-slate-50"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Details Block */}
                        <div className="bg-slate-50/80 rounded-lg border border-slate-100 p-2.5 space-y-2 mb-3">
                          {/* Department */}
                          <div className="flex items-start gap-2 text-xs">
                            <Briefcase size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-slate-400 font-medium text-[10px] uppercase block leading-tight">Afdeling</span>
                              <span className="text-slate-700 font-medium truncate block">{employee?.department || '-'}</span>
                            </div>
                          </div>

                          {/* Email */}
                          <div className="flex items-start gap-2 text-xs">
                            <Mail size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-slate-400 font-medium text-[10px] uppercase block leading-tight">Email</span>
                              <span className="text-slate-700 truncate block">{employee?.email || '-'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Allocation Bar */}
                        <div className="flex items-center gap-2 pt-1">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${allocation > 80 ? 'bg-red-400' : 'bg-emerald-400'}`}
                              style={{ width: `${allocation}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 w-8 text-right">{allocation}%</span>
                        </div>

                        {/* Actions Footer */}
                        <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canLogThis && (
                            <button
                              onClick={() => setTimeLogMemberId(member.id)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                              title="Registrer tid"
                            >
                              <ClockIcon />
                            </button>
                          )}
                          {canManageNow && (
                            <button
                              onClick={() => onDeleteMember(member.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Fjern medlem"
                            >
                              <TrashIcon />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty State / Drop Target hint */}
                  {colMembers.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-slate-300/50 rounded-lg flex items-center justify-center text-slate-400 text-sm bg-white/20">
                      Træk medlem hertil
                    </div>
                  )}

                  {/* Add Button at bottom of column */}
                  {canManageNow && (
                    <button
                      onClick={() => handleAddClick(col.id)}
                      className="w-full py-2 text-xs font-bold text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-indigo-100 flex items-center justify-center gap-1"
                    >
                      <UserPlus size={12} /> Tilføj person
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <AddMemberModal
          allEmployees={allEmployees}
          projectMembers={members}
          onAssign={onAssignEmployee}
          onUpdateMember={onUpdateMember}
          onBulkUpdateTimeLog={onBulkUpdateTimeLog}
          onClose={() => setIsAddModalOpen(false)}
          isBusy={interactionsLocked}
          initialGroup={targetGroup}
          project={project}
        />
      )}

      {/* Time Log Modal */}
      {activeMember && activeEmployee && (
        <TimeLogModal
          project={project}
          member={activeMember}
          employee={activeEmployee}
          canEditPlanned={canManageNow}
          canEditActual={canManageMembers || (canLogTime && !!currentUserEmployeeId && activeMember.employeeId === currentUserEmployeeId)}
          onClose={() => setTimeLogMemberId(null)}
          onUpdateTimeLog={(weekKey, hours) => onUpdateTimeLog(activeMember.id, weekKey, hours)}
          onBulkUpdateTimeLog={(entries) => onBulkUpdateTimeLog(activeMember.id, entries)}
        />
      )}
    </div>
  );
};
