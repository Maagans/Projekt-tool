import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../../components/AppHeader';
import { useProjectManager } from '../../../hooks/useProjectManager';
import { EditableField } from '../../../components/EditableField';
import { UploadIcon, TrashIcon } from '../../../components/Icons';
import { SyncStatusPill } from '../../../components/SyncStatusPill';
import { locations } from '../../../types';
import type { Location } from '../../../types';
import { DEFAULT_EMPLOYEE_CAPACITY } from '../../../constants';

export const EmployeePage = () => {
  const navigate = useNavigate();
  const projectManager = useProjectManager();
  const {
    employees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    importEmployeesFromCsv,
    logout,
    currentUser,
    isSaving,
    apiError,
  } = projectManager;
  const [capacityDrafts, setCapacityDrafts] = useState<Record<string, string>>({});
  const [capacityErrors, setCapacityErrors] = useState<Record<string, string>>({});
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    location: locations[0],
    email: '',
    maxCapacityHoursWeek: DEFAULT_EMPLOYEE_CAPACITY.toString(),
  });
  const [newEmployeeError, setNewEmployeeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const capacityValidationMessage = 'Kapacitet skal være et tal større end eller lig 0.';
  const isBusy = isSaving;
  const canSubmitNewEmployee = newEmployee.name.trim().length > 0 && newEmployee.email.trim().length > 0;
  const floatingSyncClass = 'fixed bottom-6 right-4 sm:right-6 pointer-events-none z-40 drop-shadow-lg';

  const formatCapacity = (value: number | undefined) =>
    Number.isFinite(value) ? String(value ?? 0) : DEFAULT_EMPLOYEE_CAPACITY.toString();

  const parseCapacityInput = (value: string): number | null => {
    if (value.trim() === '') {
      return 0;
    }
    const normalized = value.replace(',', '.').trim();
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return null;
    }
    return parsed;
  };

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    employees.forEach((employee) => {
      nextDrafts[employee.id] = formatCapacity(employee.maxCapacityHoursWeek);
    });
    setCapacityDrafts(nextDrafts);
    setCapacityErrors({});
  }, [employees]);

  const handleCapacityDraftChange = (id: string, value: string) => {
    setCapacityDrafts((state) => ({ ...state, [id]: value }));
    setCapacityErrors((state) => {
      if (!state[id]) {
        return state;
      }
      const next = { ...state };
      delete next[id];
      return next;
    });
  };

  const handleCapacityReset = (id: string) => {
    const employee = employees.find((item) => item.id === id);
    setCapacityDrafts((state) => ({
      ...state,
      [id]: formatCapacity(employee?.maxCapacityHoursWeek),
    }));
    setCapacityErrors((state) => {
      if (!state[id]) {
        return state;
      }
      const next = { ...state };
      delete next[id];
      return next;
    });
  };

  const handleCapacityCommit = (id: string) => {
    if (isBusy) {
      return;
    }
    const draft = capacityDrafts[id] ?? '';
    const parsed = parseCapacityInput(draft);
    if (parsed === null) {
      const employee = employees.find((item) => item.id === id);
      setCapacityDrafts((state) => ({
        ...state,
        [id]: formatCapacity(employee?.maxCapacityHoursWeek),
      }));
      setCapacityErrors((state) => ({ ...state, [id]: capacityValidationMessage }));
      return;
    }
    setCapacityErrors((state) => {
      if (!state[id]) {
        return state;
      }
      const next = { ...state };
      delete next[id];
      return next;
    });
    updateEmployee(id, { maxCapacityHoursWeek: parsed });
  };

  const handleSaveNewEmployee = () => {
    if (isBusy) {
      return;
    }
    if (!newEmployee.name || !newEmployee.email) {
      alert('Navn og email er påkrævet.');
      return;
    }
    const parsedCapacity = parseCapacityInput(newEmployee.maxCapacityHoursWeek);
    if (parsedCapacity === null) {
      setNewEmployeeError(capacityValidationMessage);
      return;
    }
    setNewEmployeeError(null);
    addEmployee(newEmployee.name, newEmployee.location, newEmployee.email, parsedCapacity);
    setNewEmployee({
      name: '',
      location: locations[0],
      email: '',
      maxCapacityHoursWeek: DEFAULT_EMPLOYEE_CAPACITY.toString(),
    });
  };

  const handleFileImport = (event: ChangeEvent<HTMLInputElement>) => {
    if (isBusy) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => importEmployeesFromCsv(e.target?.result as string);
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div>
      {isBusy && (
        <SyncStatusPill message="Synkroniserer medarbejderændringer..." className={floatingSyncClass} />
      )}
      <AppHeader title="Medarbejderdatabase" user={currentUser} isSaving={isSaving} apiError={apiError} onLogout={logout}>
        <button onClick={() => navigate('/')} className="text-sm bg-slate-200 text-slate-800 px-4 py-2 rounded-md hover:bg-slate-300">
          Tilbage til Dashboard
        </button>
      </AppHeader>
      <main className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex justify-end mb-4">
          <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".csv" className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-md font-semibold transition-colors ${
              isBusy ? 'bg-green-200 text-white cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <UploadIcon /> Importer fra CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="p-2 text-left text-sm font-semibold text-slate-600">Navn</th>
                <th className="p-2 text-left text-sm font-semibold text-slate-600">Lokation</th>
                <th className="p-2 text-left text-sm font-semibold text-slate-600">Email</th>
                <th className="p-2 text-left text-sm font-semibold text-slate-600">Kapacitet (timer/uge)</th>
                <th className="p-2 text-left text-sm font-semibold text-slate-600 w-24">Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-2">
                    <EditableField
                      initialValue={employee.name}
                      onSave={(name) => updateEmployee(employee.id, { name })}
                      disabled={isBusy}
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={employee.location}
                      onChange={(event) => updateEmployee(employee.id, { location: event.target.value as Location })}
                      disabled={isBusy}
                      className="bg-white border border-slate-300 rounded-md p-1.5 text-sm w-full disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      {locations.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <EditableField
                      initialValue={employee.email}
                      onSave={(email) => updateEmployee(employee.id, { email })}
                      disabled={isBusy}
                    />
                  </td>
                  <td className="p-2">
                    <div className="flex flex-col gap-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={capacityDrafts[employee.id] ?? ''}
                        aria-label={`Kapacitet for ${employee.name}`}
                        onChange={(event) => handleCapacityDraftChange(employee.id, event.target.value)}
                        onBlur={() => handleCapacityCommit(employee.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            handleCapacityCommit(employee.id);
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            handleCapacityReset(employee.id);
                          }
                        }}
                        disabled={isBusy}
                        className={`bg-white border ${
                          capacityErrors[employee.id] ? 'border-red-400' : 'border-slate-300'
                        } rounded-md p-1.5 text-sm w-full disabled:cursor-not-allowed disabled:bg-slate-100`}
                        aria-invalid={capacityErrors[employee.id] ? 'true' : 'false'}
                        aria-describedby={capacityErrors[employee.id] ? `capacity-error-${employee.id}` : undefined}
                      />
                      {capacityErrors[employee.id] && (
                        <p id={`capacity-error-${employee.id}`} className="text-xs text-red-600">
                          {capacityErrors[employee.id]}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => {
                        if (window.confirm(`Er du sikker på du vil slette ${employee.name}?`)) deleteEmployee(employee.id);
                      }}
                      disabled={isBusy}
                      className={`p-1 ${isBusy ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-red-500'}`}
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100">
                <td className="p-2">
                  <input
                    type="text"
                    placeholder="Nyt navn"
                    value={newEmployee.name}
                    onChange={(event) => setNewEmployee((state) => ({ ...state, name: event.target.value }))}
                    disabled={isBusy}
                    className="bg-white border border-slate-300 rounded-md p-2 text-sm w-full disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="p-2">
                  <select
                    value={newEmployee.location}
                    onChange={(event) => setNewEmployee((state) => ({ ...state, location: event.target.value as Location }))}
                    disabled={isBusy}
                    className="bg-white border border-slate-300 rounded-md p-2 text-sm w-full disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    {locations.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <input
                    type="email"
                    placeholder="Email"
                    value={newEmployee.email}
                    onChange={(event) => setNewEmployee((state) => ({ ...state, email: event.target.value }))}
                    disabled={isBusy}
                    className="bg-white border border-slate-300 rounded-md p-2 text-sm w-full disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="p-2">
                  <div className="flex flex-col gap-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={DEFAULT_EMPLOYEE_CAPACITY.toString()}
                      value={newEmployee.maxCapacityHoursWeek}
                      aria-label="Kapacitet for ny medarbejder"
                      onChange={(event) => {
                        setNewEmployee((state) => ({ ...state, maxCapacityHoursWeek: event.target.value }));
                        setNewEmployeeError(null);
                      }}
                      disabled={isBusy}
                      className={`bg-white border ${
                        newEmployeeError ? 'border-red-400' : 'border-slate-300'
                      } rounded-md p-2 text-sm w-full disabled:bg-slate-100 disabled:cursor-not-allowed`}
                      aria-invalid={newEmployeeError ? 'true' : 'false'}
                      aria-describedby={newEmployeeError ? 'new-employee-capacity-error' : undefined}
                    />
                    {newEmployeeError && (
                      <p id="new-employee-capacity-error" className="text-xs text-red-600">
                        {newEmployeeError}
                      </p>
                    )}
                  </div>
                </td>
                <td className="p-2">
                  <button
                    onClick={handleSaveNewEmployee}
                    disabled={isBusy || !canSubmitNewEmployee}
                    className={`text-sm px-3 py-2 rounded-md w-full font-semibold ${
                      isBusy || !canSubmitNewEmployee
                        ? 'bg-blue-200 text-white cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    Tilføj
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default EmployeePage;
