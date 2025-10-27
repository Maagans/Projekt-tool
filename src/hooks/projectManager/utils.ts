import {
  Deliverable,
  Milestone,
  Phase,
  ProjectState,
} from '../../types';

export const generateId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 12);

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Der opstod en uventet fejl.';
};

export type TimelineItemType = 'phase' | 'milestone' | 'deliverable';
export type TimelineUpdatePayload = Partial<Phase> | Partial<Milestone> | Partial<Deliverable>;

export const getInitialProjectState = (): ProjectState => ({
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
    {
      id: generateId(),
      title: 'Gevinster',
      status: 'green',
      note: '<p>De forventede gevinster er beskrevet, og gevinstplanen er igangsat.</p>',
    },
    {
      id: generateId(),
      title: 'Leverancer',
      status: 'yellow',
      note: '<p>Leverancer for fase 3 er under udarbejdelse – kræver opfølgning på testfeedback.</p>',
    },
    {
      id: generateId(),
      title: 'Tid',
      status: 'green',
      note: '<p>Tidsplanen holder. Milepælen for fase 2 blev når som planlagt.</p>',
    },
    {
      id: generateId(),
      title: 'Økonomi',
      status: 'green',
      note: '<p>Budgettet er opdateret, og der er ingen afvigelser.</p>',
    },
    {
      id: generateId(),
      title: 'Ressourcer',
      status: 'yellow',
      note: '<p>Vi mangler en specialist i udviklingsfasen – handlinger er igangsat.</p>',
    },
  ],
  risks: [
    {
      id: generateId(),
      name: 'Manglende tilgængelighed hos nøglebrugere til test i fase 3',
      s: 3,
      k: 3,
    },
    {
      id: generateId(),
      name: 'Overdragelse til drift bliver forsinket pga. mangelfuld dokumentation',
      s: 2,
      k: 4,
    },
  ],
  phases: [
    { id: generateId(), text: 'Idebeskrivelse', start: 0, end: 15, highlight: 'blue' },
    { id: generateId(), text: 'Forberedelse & planlægning', start: 15, end: 35, highlight: 'green' },
    { id: generateId(), text: 'Analyse & udvikling', start: 35, end: 65, highlight: 'yellow' },
    { id: generateId(), text: 'Implementering, idriftsættelse & evaluering', start: 65, end: 100, highlight: 'purple' },
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

export const cloneStateWithNewIds = (state: ProjectState): ProjectState => ({
  statusItems: (state.statusItems ?? []).map((item) => ({ id: generateId(), content: item.content })),
  challengeItems: (state.challengeItems ?? []).map((item) => ({ id: generateId(), content: item.content })),
  mainTableRows: (state.mainTableRows ?? []).map((row) => ({
    id: generateId(),
    title: row.title,
    status: row.status,
    note: row.note ?? '',
  })),
  risks: (state.risks ?? []).map((risk) => ({
    id: generateId(),
    name: risk.name,
    s: risk.s ?? 1,
    k: risk.k ?? 1,
  })),
  phases: (state.phases ?? []).map((phase) => ({
    id: generateId(),
    text: phase.text,
    start: phase.start,
    end: phase.end,
    highlight: phase.highlight ?? 'blue',
  })),
  milestones: (state.milestones ?? []).map((milestone) => ({
    id: generateId(),
    text: milestone.text,
    position: milestone.position ?? 0,
  })),
  deliverables: (state.deliverables ?? []).map((deliverable) => ({
    id: generateId(),
    text: deliverable.text,
    position: deliverable.position ?? 0,
  })),
  kanbanTasks: (state.kanbanTasks ?? []).map((task) => ({
    id: generateId(),
    content: task.content,
    status: task.status ?? 'todo',
  })),
});

export const getWeekKey = (date = new Date()): string => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};
