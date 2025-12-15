import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi, type AuditLogEntry, type AuditLogFilters } from '../../../api/adminApi';

const ACTION_LABELS: Record<string, string> = {
    CREATE: 'Opret',
    UPDATE: 'Opdater',
    DELETE: 'Slet',
    LOGIN: 'Login',
    LOGOUT: 'Log ud',
    LOGIN_FAILED: 'Fejlet login',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
    user: 'Bruger',
    employee: 'Medarbejder',
    project: 'Projekt',
    member: 'Projektmedlem',
    timeEntry: 'Timeregistrering',
    report: 'Rapport',
    risk: 'Risiko',
    workspace: 'Workspace',
    auth: 'Godkendelse',
};

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('da-DK', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export default function AuditLogPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState<AuditLogFilters>({
        limit: 100,
        offset: 0,
    });
    const [selectedAction, setSelectedAction] = useState<string>('');
    const [selectedEntityType, setSelectedEntityType] = useState<string>('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['audit-logs', filters],
        queryFn: () => adminApi.getAuditLogs(filters),
        staleTime: 60000,
    });

    const applyFilters = useCallback(() => {
        const newFilters: AuditLogFilters = {
            limit: 100,
            offset: 0,
        };
        if (selectedAction) newFilters.action = selectedAction;
        if (selectedEntityType) newFilters.entityType = selectedEntityType;
        if (dateRange.start) newFilters.startDate = dateRange.start;
        if (dateRange.end) newFilters.endDate = dateRange.end;
        setFilters(newFilters);
    }, [selectedAction, selectedEntityType, dateRange]);

    const handleExport = () => {
        const url = adminApi.exportAuditLogsCsvUrl(filters);
        window.open(url, '_blank');
    };

    const handlePageChange = (direction: 'prev' | 'next') => {
        setFilters((prev) => ({
            ...prev,
            offset: direction === 'next'
                ? prev.offset! + prev.limit!
                : Math.max(0, prev.offset! - prev.limit!),
        }));
    };

    useEffect(() => {
        applyFilters();
    }, [applyFilters]);

    const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1;
    const totalPages = data ? Math.ceil(data.total / (filters.limit || 50)) : 1;

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin')}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-800 transition-colors"
                    >
                        ← Tilbage
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">Aktivitetslog</h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => refetch()}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
                    >
                        🔄 Opdater
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        📥 Eksporter CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Handling</label>
                        <select
                            value={selectedAction}
                            onChange={(e) => setSelectedAction(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                            <option value="">Alle handlinger</option>
                            {Object.entries(ACTION_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select
                            value={selectedEntityType}
                            onChange={(e) => setSelectedEntityType(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                            <option value="">Alle typer</option>
                            {Object.entries(ENTITY_TYPE_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fra dato</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Til dato</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={applyFilters}
                            className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors"
                        >
                            Anvend filter
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {isLoading && (
                    <div className="p-8 text-center text-gray-500">Indlæser...</div>
                )}
                {error && (
                    <div className="p-8 text-center text-red-500">Fejl ved indlæsning af logs</div>
                )}
                {data && (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tidspunkt</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bruger</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Handling</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beskrivelse</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {data.logs.map((log: AuditLogEntry) => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                                {formatDate(log.created_at)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                <div>{log.user_name}</div>
                                                <div className="text-xs text-gray-500">{log.user_role}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                                                    log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                                                        log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                                                            log.action === 'LOGIN' ? 'bg-purple-100 text-purple-800' :
                                                                log.action === 'LOGIN_FAILED' ? 'bg-orange-100 text-orange-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {ACTION_LABELS[log.action] || log.action}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {ENTITY_TYPE_LABELS[log.entity_type] || log.entity_type}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {log.description}
                                            </td>
                                        </tr>
                                    ))}
                                    {data.logs.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                Ingen logførte handlinger fundet
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                Viser {data.offset + 1} - {Math.min(data.offset + data.limit, data.total)} af {data.total}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handlePageChange('prev')}
                                    disabled={currentPage <= 1}
                                    className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                                >
                                    ← Forrige
                                </button>
                                <span className="px-3 py-1 text-sm">
                                    Side {currentPage} af {totalPages}
                                </span>
                                <button
                                    onClick={() => handlePageChange('next')}
                                    disabled={currentPage >= totalPages}
                                    className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                                >
                                    Næste →
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
