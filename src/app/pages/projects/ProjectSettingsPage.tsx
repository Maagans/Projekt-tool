import { ChangeEvent, useMemo, useState } from 'react';
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

  const handleBudgetChange = (event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    if (rawValue === '') {
      updateProjectConfig(project.id, { totalBudget: null });
      return;
    }
    const parsed = Number(rawValue);
    if (Number.isNaN(parsed)) {
      return;
    }
    updateProjectConfig(project.id, { totalBudget: parsed });
  };

  const budgetValue = typeof project.config.totalBudget === 'number' ? project.config.totalBudget : '';

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
                  value={project.config.projectStartDate}
                  onChange={(event) => updateProjectConfig(project.id, { projectStartDate: event.target.value })}
                  disabled={isSaving}
                  className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                  style={{ colorScheme: 'light' }}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-slate-600">Slutdato</label>
                <input
                  type="date"
                  value={project.config.projectEndDate}
                  onChange={(event) => updateProjectConfig(project.id, { projectEndDate: event.target.value })}
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

        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-700">Samlet budget</h3>
              <p className="mt-1 text-sm text-slate-500">
                Angiv projektets økonomiske ramme i DKK. Vises på overblikssider og bruges til kommende KPI&rsquo;er.
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
                value={budgetValue}
                onChange={handleBudgetChange}
                disabled={isSaving}
                className="w-full rounded-md border border-slate-300 bg-white py-2 pl-14 pr-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">Efterlad feltet tomt, hvis projektet ikke har et fastlagt budget.</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProjectSettingsPage;
