import { useMemo, useState } from 'react';
import { PROJECT_RISK_ANALYSIS_ENABLED } from '../../constants';
import { useProjectRouteContext } from './ProjectLayout';
import { useProjectRisks } from '../../../hooks/useProjectRisks';
import type {
  ProjectRisk,
  ProjectRiskCategoryKey,
  ProjectRiskFilters,
  ProjectRiskInput,
  ProjectRiskStatus,
} from '../../../types';
import { SyncStatusPill } from '../../../components/SyncStatusPill';

const STATUS_LABELS: Record<ProjectRiskStatus, { label: string; className: string }> = {
  open: { label: 'Åben', className: 'bg-emerald-100 text-emerald-700' },
  monitoring: { label: 'Overvåges', className: 'bg-amber-100 text-amber-700' },
  closed: { label: 'Lukket', className: 'bg-slate-200 text-slate-700' },
};

const CATEGORY_OPTIONS: Array<{
  key: ProjectRiskCategoryKey;
  label: string;
  description: string;
  badge: string;
}> = [
  { key: 'technical', label: 'Teknisk', description: 'Arkitektur, systemfejl, integrationer', badge: 'bg-slate-100 text-slate-700' },
  { key: 'resource', label: 'Ressourcer', description: 'Mangel på bemanding/kompetencer', badge: 'bg-orange-100 text-orange-700' },
  { key: 'scope', label: 'Scope & krav', description: 'Uklar scope eller kravændringer', badge: 'bg-indigo-100 text-indigo-700' },
  { key: 'timeline', label: 'Tidsplan', description: 'Deadlines og afhængigheder', badge: 'bg-emerald-100 text-emerald-700' },
  { key: 'budget', label: 'Økonomi', description: 'Budget og kontrakter', badge: 'bg-rose-100 text-rose-700' },
  { key: 'compliance', label: 'Compliance & sikkerhed', description: 'GDPR, sikkerhed, audits', badge: 'bg-red-100 text-red-700' },
  { key: 'other', label: 'Andet', description: 'Alt andet', badge: 'bg-slate-50 text-slate-600' },
];

const STATUS_OPTIONS: Array<{ key: ProjectRiskStatus; label: string }> = [
  { key: 'open', label: 'Åben' },
  { key: 'monitoring', label: 'Overvåges' },
  { key: 'closed', label: 'Lukket' },
];

const defaultFormState: ProjectRiskInput = {
  title: '',
  probability: 3,
  impact: 3,
  status: 'open',
  category: 'other',
  mitigationPlanA: '',
  mitigationPlanB: '',
  followUpFrequency: '',
  followUpNotes: '',
  ownerId: '',
  dueDate: '',
  lastFollowUpAt: '',
  description: '',
};

type DrawerMode = 'create' | 'edit';

const toDateLabel = (value: string | null) => {
  if (!value) return 'Ikke angivet';
  try {
    return new Date(value).toLocaleString('da-DK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const toInputDateTime = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
};

const parseDateTimeInput = (value: string) => (value ? new Date(value).toISOString() : null);

export const ProjectRisksPage = () => {
  const { project, projectManager } = useProjectRouteContext();
  const [filters, setFilters] = useState<ProjectRiskFilters>({ status: 'open', includeArchived: false, overdue: false });
  const [drawer, setDrawer] = useState<{ mode: DrawerMode; isOpen: boolean; risk: ProjectRisk | null }>({
    mode: 'create',
    isOpen: false,
    risk: null,
  });
  const [formState, setFormState] = useState<ProjectRiskInput>(defaultFormState);
  const [formError, setFormError] = useState<string | null>(null);

  const { risks, isLoading, isFetching, error, createRisk, updateRisk, archiveRisk, isMutating } = useProjectRisks(
    PROJECT_RISK_ANALYSIS_ENABLED ? project.id : null,
    filters,
  );
  const canEdit = projectManager.canManage;

  const ownerOptions = useMemo(
    () =>
      (projectManager.employees ?? []).map((employee) => ({
        id: employee.id,
        label: `${employee.name}${employee.department ? ` (${employee.department})` : ''}`,
      })),
    [projectManager.employees],
  );

  if (!PROJECT_RISK_ANALYSIS_ENABLED) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Risikovurdering er deaktiveret</h2>
        <p className="mt-2 text-sm text-slate-600">
          Denne fane er ikke tilgængelig, fordi funktionen er slået fra i miljøet. Kontakt administratoren, hvis du
          mener det er en fejl.
        </p>
      </div>
    );
  }

  const openDrawer = (mode: DrawerMode, risk: ProjectRisk | null = null) => {
    if (mode === 'edit' && risk) {
      setFormState({
        title: risk.title,
        description: risk.description ?? '',
        probability: risk.probability,
        impact: risk.impact,
        mitigationPlanA: risk.mitigationPlanA ?? '',
        mitigationPlanB: risk.mitigationPlanB ?? '',
        ownerId: risk.owner?.id ?? '',
        followUpFrequency: risk.followUpFrequency ?? '',
        followUpNotes: risk.followUpNotes ?? '',
        category: risk.category.key,
        lastFollowUpAt: risk.lastFollowUpAt ?? '',
        dueDate: risk.dueDate ?? '',
        status: risk.status,
      });
    } else {
      setFormState(defaultFormState);
    }
    setFormError(null);
    setDrawer({ mode, isOpen: true, risk });
  };

  const closeDrawer = () => {
    setDrawer((prev) => ({ ...prev, isOpen: false, risk: null }));
    setFormState(defaultFormState);
  };

  const handleFormChange = (field: keyof ProjectRiskInput, value: string | number) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const payload: ProjectRiskInput = {
      ...formState,
      ownerId: formState.ownerId ? formState.ownerId : null,
      probability: Number(formState.probability ?? 1),
      impact: Number(formState.impact ?? 1),
      lastFollowUpAt: formState.lastFollowUpAt ? parseDateTimeInput(formState.lastFollowUpAt) : null,
      dueDate: formState.dueDate || null,
    };
    try {
      if (drawer.mode === 'create') {
        await createRisk(payload);
      } else if (drawer.risk) {
        await updateRisk({ riskId: drawer.risk.id, updates: payload });
      }
      closeDrawer();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Kunne ikke gemme risikoen.');
    }
  };

  const handleArchive = async (risk: ProjectRisk) => {
    if (!canEdit) return;
    try {
      await archiveRisk(risk.id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Kunne ikke arkivere risikoen.');
    }
  };

  const filteredRisks = risks;
  const isEmpty = !filteredRisks.length && !isLoading;

  const floatingSyncClass = 'fixed bottom-6 right-4 sm:right-6 pointer-events-none z-40 drop-shadow-lg';

  return (
    <>
      {isMutating && (
        <SyncStatusPill message="Gemmer risici..." className={floatingSyncClass} />
      )}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Risikovurdering</h2>
            <p className="text-sm text-slate-600">
              Opret og vedligehold projektets risikoregister. Listen synkroniseres automatisk med rapporternes matrix.
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => openDrawer('create')}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
            >
              Ny risiko
            </button>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Status
              <select
                className="mt-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={filters.status ?? ''}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: event.target.value ? (event.target.value as ProjectRiskStatus) : undefined,
                  }))
                }
              >
                <option value="">Alle statuser</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col text-sm font-medium text-slate-700">
              Ansvarlig
              <select
                className="mt-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={filters.ownerId ?? ''}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, ownerId: event.target.value || undefined }))
                }
              >
                <option value="">Alle ansvarlige</option>
                {ownerOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col text-sm font-medium text-slate-700">
              Kategori
              <select
                className="mt-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={filters.category ?? ''}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    category: event.target.value ? (event.target.value as ProjectRiskCategoryKey) : undefined,
                  }))
                }
              >
                <option value="">Alle kategorier</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-2 text-sm text-slate-700">
              <label className="inline-flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={filters.overdue ?? false}
                  onChange={(event) => setFilters((prev) => ({ ...prev, overdue: event.target.checked }))}
                />
                Kun forfaldne
              </label>
              <label className="inline-flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={filters.includeArchived ?? false}
                  onChange={(event) => setFilters((prev) => ({ ...prev, includeArchived: event.target.checked }))}
                />
                Vis arkiverede
              </label>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Kunne ikke hente risici: {error.message}
          </div>
        )}

        {isLoading && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
            Indlæser risici…
          </div>
        )}

        {isEmpty && !isFetching && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
            Ingen risici matcher dine filtre endnu. {canEdit ? 'Opret den første risiko for at komme i gang.' : ''}
          </div>
        )}

        <div className="space-y-4">
          {filteredRisks.map((risk) => {
            const statusMeta = STATUS_LABELS[risk.status];
            const overdue =
              Boolean(risk.dueDate) && risk.status !== 'closed' && new Date(risk.dueDate!).getTime() < Date.now();
            return (
              <div
                key={risk.id}
                className={`rounded-xl border p-4 shadow-sm transition hover:border-blue-300 ${
                  overdue ? 'border-red-200 bg-red-50/40' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-slate-900">{risk.title}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                      {overdue && (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                          Forfalden
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{risk.description || 'Ingen beskrivelse angivet.'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <span className="text-xs uppercase tracking-wide text-slate-500">Score</span>
                      <div className="text-2xl font-semibold text-slate-900">{risk.score}</div>
                      <div className="text-xs text-slate-500">
                        {risk.probability} × {risk.impact}
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${risk.category.badge}`}
                    >
                      {risk.category.label}
                    </span>
                  </div>
                </div>

                <dl className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="font-medium text-slate-700">Ansvarlig</dt>
                    <dd>{risk.owner?.name ?? 'Ikke angivet'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-700">Sidst fulgt op</dt>
                    <dd>{toDateLabel(risk.lastFollowUpAt)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-700">Opfølgningsfrekvens</dt>
                    <dd>{risk.followUpFrequency || 'Ikke angivet'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-700">Forfaldsdato</dt>
                    <dd>{risk.dueDate ? toDateLabel(risk.dueDate) : 'Ikke angivet'}</dd>
                  </div>
                </dl>

                <div className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-xs font-semibold uppercase text-slate-500">Mitigeringsplan A</div>
                    <p className="mt-1 text-slate-700">{risk.mitigationPlanA || 'Ikke angivet'}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-xs font-semibold uppercase text-slate-500">Mitigeringsplan B</div>
                    <p className="mt-1 text-slate-700">{risk.mitigationPlanB || 'Ikke angivet'}</p>
                  </div>
                </div>

                {risk.followUpNotes && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    <div className="text-xs font-semibold uppercase text-slate-500">Opfølgningsnoter</div>
                    <p className="mt-1 whitespace-pre-line">{risk.followUpNotes}</p>
                  </div>
                )}

                {canEdit && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => openDrawer('edit', risk)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Redigér
                    </button>
                    {risk.status !== 'closed' && !risk.isArchived && (
                      <button
                        type="button"
                        onClick={() => handleArchive(risk)}
                        className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                      >
                        Arkivér
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {drawer.isOpen && (
        <div className="fixed inset-0 z-40 flex bg-black/30">
          <div className="ml-auto h-full w-full max-w-xl bg-white shadow-xl">
            <form onSubmit={handleSubmit} className="flex h-full flex-col divide-y divide-slate-200">
              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {drawer.mode === 'create' ? 'Ny risiko' : 'Redigér risiko'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    Udfyld sandsynlighed, konsekvens og plan for at holde risici ajourført.
                  </p>
                </div>
                <button type="button" onClick={closeDrawer} className="text-sm text-slate-500 hover:text-slate-700">
                  Luk
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Titel
                  <input
                    type="text"
                    required
                    value={formState.title}
                    onChange={(event) => handleFormChange('title', event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Beskrivelse
                  <textarea
                    value={formState.description ?? ''}
                    onChange={(event) => handleFormChange('description', event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    rows={3}
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Sandsynlighed (1-5)
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={formState.probability}
                      onChange={(event) => handleFormChange('probability', Number(event.target.value))}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Konsekvens (1-5)
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={formState.impact}
                      onChange={(event) => handleFormChange('impact', Number(event.target.value))}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Status
                    <select
                      value={formState.status ?? 'open'}
                      onChange={(event) =>
                        handleFormChange('status', event.target.value as ProjectRiskStatus)
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Kategori
                    <select
                      value={formState.category ?? 'other'}
                      onChange={(event) =>
                        handleFormChange('category', event.target.value as ProjectRiskCategoryKey)
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Ansvarlig
                  <select
                    value={formState.ownerId ?? ''}
                    onChange={(event) => handleFormChange('ownerId', event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Ingen ansvarlig</option>
                    {ownerOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Forfaldsdato
                    <input
                      type="date"
                      value={formState.dueDate ?? ''}
                      onChange={(event) => handleFormChange('dueDate', event.target.value)}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Sidst fulgt op
                    <input
                      type="datetime-local"
                      value={toInputDateTime(formState.lastFollowUpAt ?? null)}
                      onChange={(event) => handleFormChange('lastFollowUpAt', event.target.value)}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Opfølgningsfrekvens
                  <input
                    type="text"
                    value={formState.followUpFrequency ?? ''}
                    onChange={(event) => handleFormChange('followUpFrequency', event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Opfølgningsnoter
                  <textarea
                    value={formState.followUpNotes ?? ''}
                    onChange={(event) => handleFormChange('followUpNotes', event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    rows={3}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Mitigeringsplan A
                  <textarea
                    value={formState.mitigationPlanA ?? ''}
                    onChange={(event) => handleFormChange('mitigationPlanA', event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    rows={3}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Mitigeringsplan B
                  <textarea
                    value={formState.mitigationPlanB ?? ''}
                    onChange={(event) => handleFormChange('mitigationPlanB', event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    rows={3}
                  />
                </label>

                {formError && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
              </div>

              <div className="flex items-center justify-between gap-3 px-6 py-4">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Annullér
                </button>
                <div className="flex gap-3">
                  {drawer.mode === 'edit' && drawer.risk && !drawer.risk.isArchived && (
                    <button
                      type="button"
                      onClick={() => handleArchive(drawer.risk!)}
                      className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                      Arkivér
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!formState.title}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Gem risiko
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectRisksPage;
