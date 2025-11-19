import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { EditableField } from '../../../components/EditableField';
import { InlineRichEditor, sanitizeRichText } from '../../../components/RichTextInlineEditor';
import { SyncStatusPill } from '../../../components/SyncStatusPill';
import type { ProjectStatus } from '../../../types';
import { useProjectRouteContext } from './ProjectLayout';

type NarrativeField = 'projectGoal' | 'businessCase';

const hasRichTextContent = (value: string) => value.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim().length > 0;

interface NarrativeCardProps {
  title: string;
  description: string;
  value: string;
  emptyLabel: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

const NarrativeCard = ({
  title,
  description,
  value,
  emptyLabel,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  disabled,
}: NarrativeCardProps) => {
  const sanitized = useMemo(() => sanitizeRichText(value ?? ''), [value]);
  const hasContent = useMemo(() => hasRichTextContent(sanitized), [sanitized]);

  return (
    <div className="h-full rounded-lg bg-white p-4 shadow-sm" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-700">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={onEdit}
            disabled={disabled}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Rediger
          </button>
        )}
      </div>
      <div className="mt-4 min-h-[140px]">
        {isEditing ? (
          <InlineRichEditor initialValue={sanitized} onSave={onSave} onCancel={onCancel} />
        ) : hasContent ? (
          <div
            className="prose prose-sm max-w-none text-slate-700 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: sanitized }}
          />
        ) : (
          <p className="text-sm text-slate-400">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
};

export const ProjectSettingsPage = () => {
  const { project, projectManager } = useProjectRouteContext();
  const { updateProjectConfig, updateProjectStatus, isSaving } = projectManager;
  const [editingField, setEditingField] = useState<NarrativeField | null>(null);
  const floatingSyncClass = 'fixed bottom-6 right-4 sm:right-6 pointer-events-none z-40 drop-shadow-lg';

  const projectStatusOptions: { key: ProjectStatus; label: string }[] = [
    { key: 'active', label: 'Aktiv' },
    { key: 'completed', label: 'Fuldført' },
    { key: 'on-hold', label: 'På hold' },
  ];

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('da-DK', {
        style: 'currency',
        currency: 'DKK',
        maximumFractionDigits: 0,
      }),
    [],
  );
  const budgetDisplay =
    typeof project.config.totalBudget === 'number' ? currencyFormatter.format(project.config.totalBudget) : 'Ikke angivet';

  const handleNarrativeSave = (field: NarrativeField, nextValue: string) => {
    if (field === 'projectGoal') {
      updateProjectConfig(project.id, { projectGoal: nextValue });
    } else {
      updateProjectConfig(project.id, { businessCase: nextValue });
    }
    setEditingField(null);
  };

  const [budgetInputValue, setBudgetInputValue] = useState<string>('');
  const [startDateInput, setStartDateInput] = useState(project.config.projectStartDate);
  const [endDateInput, setEndDateInput] = useState(project.config.projectEndDate);

  useEffect(() => {
    setBudgetInputValue(
      typeof project.config.totalBudget === 'number' ? String(project.config.totalBudget) : '',
    );
  }, [project.config.totalBudget]);

  useEffect(() => {
    setStartDateInput(project.config.projectStartDate);
  }, [project.config.projectStartDate]);

  useEffect(() => {
    setEndDateInput(project.config.projectEndDate);
  }, [project.config.projectEndDate]);

  const handleBudgetChange = (event: ChangeEvent<HTMLInputElement>) => {
    setBudgetInputValue(event.target.value);
  };

  const handleBudgetBlur = () => {
    const rawValue = budgetInputValue.trim();
    if (rawValue === '') {
      if (project.config.totalBudget !== null) {
        updateProjectConfig(project.id, { totalBudget: null });
      }
      return;
    }
    const parsed = Number(rawValue);
    if (Number.isNaN(parsed)) {
      setBudgetInputValue(
        typeof project.config.totalBudget === 'number' ? String(project.config.totalBudget) : '',
      );
      return;
    }
    if (project.config.totalBudget !== parsed) {
      updateProjectConfig(project.id, { totalBudget: parsed });
    }
  };

  return (
    <>
      {isSaving && <SyncStatusPill message="Synkroniserer projektændringer..." className={floatingSyncClass} />}
      <div className="space-y-6" aria-busy={isSaving}>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-700">Projektindstillinger</h3>
          <div className="max-w-md space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Projektnavn</label>
              <EditableField
                initialValue={project.config.projectName}
                onSave={(newName) => updateProjectConfig(project.id, { projectName: newName })}
                className="text-lg"
                disabled={isSaving}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-slate-600">Startdato</label>
                <input
                  type="date"
                  value={startDateInput}
                  onChange={(event) => setStartDateInput(event.target.value)}
                  onBlur={() => {
                    if (startDateInput && startDateInput !== project.config.projectStartDate) {
                      updateProjectConfig(project.id, { projectStartDate: startDateInput });
                    }
                  }}
                  disabled={isSaving}
                  className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                  style={{ colorScheme: 'light' }}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-slate-600">Slutdato</label>
                <input
                  type="date"
                  value={endDateInput}
                  onChange={(event) => setEndDateInput(event.target.value)}
                  onBlur={() => {
                    if (endDateInput && endDateInput !== project.config.projectEndDate) {
                      updateProjectConfig(project.id, { projectEndDate: endDateInput });
                    }
                  }}
                  disabled={isSaving}
                  className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                  style={{ colorScheme: 'light' }}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Projektstatus</label>
              <select
                value={project.status}
                onChange={(event) => updateProjectStatus(project.id, event.target.value as ProjectStatus)}
                disabled={isSaving}
                className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {projectStatusOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <NarrativeCard
            title="Projektmål"
            description="Beskriv projektets formål, ønskede gevinster og succeskriterier."
            value={project.config.projectGoal ?? ''}
            emptyLabel="Ingen projektmål angivet endnu."
            isEditing={editingField === 'projectGoal'}
            onEdit={() => setEditingField('projectGoal')}
            onSave={(value) => handleNarrativeSave('projectGoal', value)}
            onCancel={() => setEditingField(null)}
            disabled={isSaving}
          />
          <NarrativeCard
            title="Business case"
            description="Opsummer kort den forventede effekt, ROI eller budgetmæssige argumenter."
            value={project.config.businessCase ?? ''}
            emptyLabel="Ingen business case beskrivelse angivet endnu."
            isEditing={editingField === 'businessCase'}
            onEdit={() => setEditingField('businessCase')}
            onSave={(value) => handleNarrativeSave('businessCase', value)}
            onCancel={() => setEditingField(null)}
            disabled={isSaving}
          />
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="flex flex-col gap-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-700">Samlet budget</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Angiv projektets økonomiske ramme i DKK. Vises på overblikssider og bruges til kommende KPI’er.
                  </p>
                </div>
                <div className="text-sm text-slate-500">
                  <span className="block text-xs uppercase tracking-wide text-slate-400">Aktuelt budget</span>
                  <span className="font-semibold text-slate-700">{budgetDisplay}</span>
                </div>
              </div>
              <div className="mt-4 max-w-sm">
                <label className="mb-1 block text-sm font-medium text-slate-600">Budget (DKK)</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">DKK</span>
                  <input
                type="number"
                min={0}
                step={100000}
                value={budgetInputValue}
                onChange={handleBudgetChange}
                onBlur={handleBudgetBlur}
                disabled={isSaving}
                className="w-full rounded-md border border-slate-300 bg-white py-2 pl-14 pr-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
                </div>
                <p className="mt-2 text-xs text-slate-500">Efterlad feltet tomt, hvis projektet ikke har et fastlagt budget.</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-700">Hero-billede</h3>
              <p className="mt-1 text-sm text-slate-500">
                Indsæt et billede (URL) der visualiserer projektets formål. Vises i hero-sektionen på overblikket.
              </p>
              <div className="mt-4 space-y-4">
                <input
                  type="url"
                  value={project.config.heroImageUrl ?? ''}
                  onChange={(event) => updateProjectConfig(project.id, { heroImageUrl: event.target.value || null })}
                  placeholder="https://..."
                  disabled={isSaving}
                  className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
                {project.config.heroImageUrl ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-center">
                    <img
                      src={project.config.heroImageUrl}
                      alt="Hero preview"
                      className="mx-auto h-32 w-full rounded-lg object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => updateProjectConfig(project.id, { heroImageUrl: null })}
                      className="mt-2 text-sm font-semibold text-red-600 hover:underline"
                    >
                      Fjern billede
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Tip: brug fx et web-hostet billede eller en intern CDN-URL. Efterlad feltet tomt for at vise en placeholder.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProjectSettingsPage;
