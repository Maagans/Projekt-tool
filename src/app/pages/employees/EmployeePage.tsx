import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../../components/AppHeader';
import { useProjectManager } from '../../../hooks/useProjectManager';
import { EditableField } from '../../../components/EditableField';
import { UploadIcon, TrashIcon } from '../../../components/Icons';
import { locations } from '../../../types';
import type { Location } from '../../../types';

export const EmployeePage = () => {
  const navigate = useNavigate();
  const projectManager = useProjectManager();
  const { employees, addEmployee, updateEmployee, deleteEmployee, importEmployeesFromCsv, logout, currentUser, isSaving, apiError } =
    projectManager;
  const [newEmployee, setNewEmployee] = useState({ name: '', location: locations[0], email: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveNewEmployee = () => {
    if (!newEmployee.name || !newEmployee.email) {
      alert('Navn og email er påkrævet.');
      return;
    }
    addEmployee(newEmployee.name, newEmployee.location, newEmployee.email);
    setNewEmployee({ name: '', location: locations[0], email: '' });
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => importEmployeesFromCsv(e.target?.result as string);
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div>
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
            className="flex items-center gap-2 text-sm bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-semibold"
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
                <th className="p-2 text-left text-sm font-semibold text-slate-600 w-24">Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-2">
                    <EditableField initialValue={employee.name} onSave={(name) => updateEmployee(employee.id, { name })} />
                  </td>
                  <td className="p-2">
                    <select
                      value={employee.location}
                      onChange={(event) => updateEmployee(employee.id, { location: event.target.value as Location })}
                      className="bg-white border border-slate-300 rounded-md p-1.5 text-sm w-full"
                    >
                      {locations.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <EditableField initialValue={employee.email} onSave={(email) => updateEmployee(employee.id, { email })} />
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => {
                        if (window.confirm(`Er du sikker på du vil slette ${employee.name}?`)) deleteEmployee(employee.id);
                      }}
                      className="text-slate-400 hover:text-red-500 p-1"
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
                    className="bg-white border border-slate-300 rounded-md p-2 text-sm w-full"
                  />
                </td>
                <td className="p-2">
                  <select
                    value={newEmployee.location}
                    onChange={(event) => setNewEmployee((state) => ({ ...state, location: event.target.value as Location }))}
                    className="bg-white border border-slate-300 rounded-md p-2 text-sm w-full"
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
                    className="bg-white border border-slate-300 rounded-md p-2 text-sm w-full"
                  />
                </td>
                <td className="p-2">
                  <button
                    onClick={handleSaveNewEmployee}
                    className="bg-blue-500 text-white text-sm px-3 py-2 rounded-md hover:bg-blue-600 w-full font-semibold"
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

