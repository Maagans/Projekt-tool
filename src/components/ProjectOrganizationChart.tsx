import React, { useState, useMemo, useEffect } from 'react';
import { ProjectMember, Employee, Project } from '../types';
import { PlusIcon, TrashIcon, UsersIcon, ClockIcon } from './Icons';
import { EditableField } from './EditableField';

type MemberGroup = ProjectMember['group'];

const groupTitles: Record<MemberGroup, string> = {
  styregruppe: 'Styregruppe',
  projektgruppe: 'Projektgruppe / Kernegruppe',
  partnere: 'Strategiske Partnerskaber',
  referencegruppe: 'Referencegruppe',
  unassigned: 'Ikke tildelte medlemmer',
};

const groupStyles: Record<MemberGroup, string> = {
  styregruppe: 'bg-red-50 border-red-200',
  projektgruppe: 'bg-blue-50 border-blue-200',
  partnere: 'bg-yellow-50 border-yellow-200',
  referencegruppe: 'bg-purple-50 border-purple-200',
  unassigned: 'bg-slate-50 border-slate-200',
};

interface ProjectOrganizationChartProps {
  project: Project;
  members: ProjectMember[];
  allEmployees: Employee[];
  canManageMembers: boolean;
  canLogTime: boolean;
  currentUserEmployeeId?: string | null;
  isSaving?: boolean;
  onAssignEmployee: (employeeId: string) => void;
  onUpdateMember: (id: string, updates: Partial<ProjectMember>) => void;
  onDeleteMember: (id: string) => void;
  onUpdateTimeLog: (memberId: string, weekKey: string, hours: { planned?: number; actual?: number }) => void;
  onBulkUpdateTimeLog: (memberId: string, entries: { weekKey: string; plannedHours: number }[]) => void;
}

interface MemberCardProps {
  member: ProjectMember;
  employee?: Employee;
  canManageMembers: boolean;
  canLogThisMember: boolean;
  disableInteractions: boolean;
  onUpdate: (id: string, updates: Partial<ProjectMember>) => void;
  onDelete: (id: string) => void;
  onTimeLogClick: () => void;
}

const MemberCard: React.FC<MemberCardProps> = ({
  member,
  employee,
  canManageMembers,
  canLogThisMember,
  disableInteractions,
  onUpdate,
  onDelete,
  onTimeLogClick,
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    if (!canManageMembers || disableInteractions) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('application/member-assignment-id', member.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const showTimeLog = !disableInteractions && (canManageMembers || canLogThisMember);
  const showDelete = canManageMembers && !disableInteractions;

  return (
    <div
      draggable={canManageMembers && !disableInteractions}
      onDragStart={handleDragStart}
      className={`group bg-white p-3 rounded-md shadow-sm border border-slate-200 ${
        canManageMembers && !disableInteractions ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      } ${disableInteractions ? 'opacity-60' : ''}`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-grow">
          <p className="font-bold text-slate-800">{employee?.name || 'Ukendt medarbejder'}</p>
          <EditableField
            initialValue={member.role}
            onSave={(role) => onUpdate(member.id, { role })}
            className="text-sm text-slate-500 !p-0"
            disabled={!canManageMembers || disableInteractions}
          />
        </div>
        {(showTimeLog || showDelete) && (
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity export-hide">
            {showTimeLog && (
              <button
                onClick={onTimeLogClick}
                aria-label={`Åbn timelog for ${employee?.name ?? 'medlem'}`}
                title="Åbn timelog"
                className="w-7 h-7 grid place-items-center flex-shrink-0 text-slate-400 hover:text-blue-500 disabled:cursor-not-allowed disabled:text-slate-300"
                disabled={disableInteractions}
              >
                <ClockIcon />
              </button>
            )}
            {showDelete && (
              <button
                onClick={() => onDelete(member.id)}
                className="w-7 h-7 grid place-items-center flex-shrink-0 text-slate-400 hover:text-red-500 disabled:cursor-not-allowed disabled:text-slate-300"
                disabled={disableInteractions}
              >
                <TrashIcon />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface MemberGroupColumnProps {
  group: MemberGroup;
  children: React.ReactNode;
  canManageMembers: boolean;
  onDrop: (e: React.DragEvent, group: MemberGroup) => void;
  isDraggedOver: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
}

const MemberGroupColumn: React.FC<MemberGroupColumnProps> = ({
  group,
  children,
  canManageMembers,
  onDrop,
  isDraggedOver,
  onDragEnter,
  onDragLeave,
}) => {
  const handleDragOver = (e: React.DragEvent) => {
    if (canManageMembers) {
      e.preventDefault();
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        if (!canManageMembers) return;
        onDrop(e, group);
      }}
      className={`p-3 rounded-lg border-2 border-dashed ${groupStyles[group]} transition-colors ${
        isDraggedOver && canManageMembers ? 'bg-opacity-50 !border-green-500' : ''
      }`}
    >
      <h4 className="font-bold text-slate-700 mb-3">{groupTitles[group]}</h4>
      <div className="space-y-3 min-h-[80px]">{children}</div>
    </div>
  );
};

interface AddMemberModalProps {
  allEmployees: Employee[];
  projectMembers: ProjectMember[];
  onAssign: (employeeId: string) => void;
  onClose: () => void;
  isBusy: boolean;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ allEmployees, projectMembers, onAssign, onClose, isBusy }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [assignableEmployees, setAssignableEmployees] = useState<Employee[]>([]);

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

  const handleAssign = (employeeId: string) => {
    if (isBusy) return;
    onAssign(employeeId);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg flex flex-col h-[70vh]">
        <h3 className="text-xl font-bold mb-2 text-slate-800">Tilføj medlem fra database</h3>
        {isBusy && <p className="text-xs text-slate-500 mb-2">Afventer synkronisering...</p>}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Søg efter navn eller email..."
          disabled={isBusy}
          className="w-full bg-white border border-slate-300 rounded-md p-2 mb-4 disabled:bg-slate-100 disabled:cursor-not-allowed"
        />
        <div className="flex-grow overflow-y-auto border-y border-slate-200 -mx-6 px-6 py-2">
          {assignableEmployees.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {assignableEmployees.map((emp) => (
                <li key={emp.id} className="flex justify-between items-center py-2">
                  <div>
                    <p className="font-medium text-slate-800">{emp.name}</p>
                    <p className="text-sm text-slate-500">{emp.location}</p>
                  </div>
                  <button
                    onClick={() => handleAssign(emp.id)}
                    disabled={isBusy}
                    className="bg-blue-100 text-blue-700 px-3 py-1 text-sm font-semibold rounded-md hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Tilføj
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-slate-500 pt-8">Ingen tilgængelige medarbejdere matcher søgningen.</p>
          )}
        </div>
        <div className="flex justify-end pt-6">
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

  const plannedInputClass = `bg-white border text-right border-slate-300 rounded-md p-1.5 text-sm w-full ${
    canEditPlanned ? '' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
  }`;
  const actualInputClass = `bg-white border text-right border-slate-300 rounded-md p-1.5 text-sm w-full ${
    canEditActual ? '' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
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
  const [draggedOverGroup, setDraggedOverGroup] = useState<MemberGroup | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [timeLogMemberId, setTimeLogMemberId] = useState<string | null>(null);
  const interactionsLocked = Boolean(isSaving);
  const canManageNow = canManageMembers && !interactionsLocked;
  const canLogTimeNow = canLogTime && !interactionsLocked;

  const employeeMap = useMemo(() => new Map(allEmployees.map((e) => [e.id, e])), [allEmployees]);

  const groupedMembers = (members || []).reduce((acc, member) => {
    if (!acc[member.group]) acc[member.group] = [];
    acc[member.group].push(member);
    return acc;
  }, {} as Record<MemberGroup, ProjectMember[]>);

  const groupOrder: MemberGroup[] = ['styregruppe', 'projektgruppe', 'partnere', 'referencegruppe'];

  const currentEmployeeId = currentUserEmployeeId ?? null;

  const activeMember = useMemo(() => {
    if (!timeLogMemberId) return null;
    return members.find((member) => member.id === timeLogMemberId) ?? null;
  }, [timeLogMemberId, members]);

  const activeEmployee = activeMember ? employeeMap.get(activeMember.employeeId) ?? null : null;

  useEffect(() => {
    if (!timeLogMemberId) return;
    if (!activeMember || !activeEmployee) {
      setTimeLogMemberId(null);
    }
  }, [timeLogMemberId, activeMember, activeEmployee]);

  const handleDrop = (e: React.DragEvent, group: MemberGroup) => {
    if (!canManageNow) return;
    e.preventDefault();
    const memberAssignmentIdStr = e.dataTransfer.getData('application/member-assignment-id');
    if (memberAssignmentIdStr) {
      onUpdateMember(memberAssignmentIdStr, { group });
    }
    setDraggedOverGroup(null);
  };

  const renderMemberCard = (member: ProjectMember) => {
    const employee = employeeMap.get(member.employeeId);
    const isCurrentUsersMember = !!currentEmployeeId && member.employeeId === currentEmployeeId;
    const canLogThisMember = canManageMembers || (canLogTimeNow && isCurrentUsersMember);

    const memberCardProps: MemberCardProps = {
      member,
      canManageMembers,
      canLogThisMember,
      disableInteractions: interactionsLocked,
      onUpdate: onUpdateMember,
      onDelete: onDeleteMember,
      onTimeLogClick: () => {
        if (!canLogThisMember || interactionsLocked) return;
        setTimeLogMemberId(member.id);
      },
    };

    if (employee) {
      memberCardProps.employee = employee;
    }

    return <MemberCard key={member.id} {...memberCardProps} />;
  };

  const canEditPlanned = canManageNow;
  const canEditActual = (member: ProjectMember | null) =>
    !!member &&
    !interactionsLocked &&
    (canManageMembers || (canLogTime && !!currentEmployeeId && member.employeeId === currentEmployeeId));

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <UsersIcon />
          <h3 className="text-lg font-bold text-slate-700">Projektorganisation</h3>
        </div>
        {canManageMembers && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={!canManageNow}
            className={`flex items-center justify-center gap-1 text-sm p-2 rounded-md transition-colors font-semibold export-hide ${
              canManageNow ? 'text-blue-600 hover:bg-blue-100' : 'text-slate-400 cursor-not-allowed'
            }`}
          >
            <PlusIcon /> Tilføj medlem
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        {groupOrder.map((group) => (
          <MemberGroupColumn
            key={group}
            group={group}
            canManageMembers={canManageNow}
            onDrop={handleDrop}
            isDraggedOver={draggedOverGroup === group}
            onDragEnter={() => setDraggedOverGroup(group)}
            onDragLeave={() => setDraggedOverGroup(null)}
          >
            {(groupedMembers[group] || []).map(renderMemberCard)}
          </MemberGroupColumn>
        ))}
      </div>

      {(groupedMembers['unassigned'] || []).length > 0 && (
        <div className="mt-6">
          <MemberGroupColumn
            group="unassigned"
            canManageMembers={canManageNow}
            onDrop={handleDrop}
            isDraggedOver={draggedOverGroup === 'unassigned'}
            onDragEnter={() => setDraggedOverGroup('unassigned')}
            onDragLeave={() => setDraggedOverGroup(null)}
          >
            {(groupedMembers['unassigned'] || []).map(renderMemberCard)}
          </MemberGroupColumn>
        </div>
      )}

      {canManageMembers && isAddModalOpen && (
        <AddMemberModal
          allEmployees={allEmployees}
          projectMembers={members}
          onAssign={onAssignEmployee}
          onClose={() => setIsAddModalOpen(false)}
          isBusy={interactionsLocked}
        />
      )}

      {activeMember && activeEmployee && (
        <TimeLogModal
          project={project}
          member={activeMember}
          employee={activeEmployee}
          canEditPlanned={canEditPlanned}
          canEditActual={canEditActual(activeMember)}
          onClose={() => setTimeLogMemberId(null)}
          onUpdateTimeLog={(weekKey, hours) => onUpdateTimeLog(activeMember.id, weekKey, hours)}
          onBulkUpdateTimeLog={(entries) => onBulkUpdateTimeLog(activeMember.id, entries)}
        />
      )}
    </div>
  );
};

