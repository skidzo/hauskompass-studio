export type ShowcaseBadgeTone = 'fact' | 'assumption' | 'generated' | 'risk' | 'check' | 'expert' | 'blocked';

export interface ShowcaseBadge {
  label: string;
  tone: ShowcaseBadgeTone;
}

export interface ShowcaseBullet {
  title?: string;
  text: string;
}

export interface ShowcaseMetric {
  label: string;
  value: string;
  note: string;
  badge: ShowcaseBadge;
}

export interface ShowcaseRegisterItem {
  title: string;
  text: string;
  badge: ShowcaseBadge;
}

export interface ShowcaseDecision {
  title: string;
  status: ShowcaseBadge;
  dependsOn: string;
  uncertainty: string;
  expertCheck: string;
  nextStep: string;
}

export interface ShowcaseReasoningLine {
  heading: 'Facts' | 'Assumptions' | 'Risks' | 'Missing information' | 'Suggested next actions';
  text: string;
}

export interface ShowcasePage {
  eyebrow: string;
  title: string;
  coreMessage: string;
}

export const showcasePages: ShowcasePage[] = [
  {
    eyebrow: 'Local-first renovation planning prototype',
    title: 'From rough building hull to evidence-based renovation workflow',
    coreMessage: 'Local-first decision support, not automated renovation design.',
  },
  {
    eyebrow: 'Baseline model context',
    title: 'Geometry and model outputs are useful when their uncertainty is explicit',
    coreMessage: 'The rough model creates structure, while generated values remain visibly provisional.',
  },
  {
    eyebrow: 'Evidence registers',
    title: 'Facts, assumptions and missing measurements must not be mixed together',
    coreMessage: 'Planning quality improves when known, assumed and missing information are structurally separated.',
  },
  {
    eyebrow: 'Decision traceability',
    title: 'Renovation choices become clearer when dependencies and risks are visible',
    coreMessage: 'The app prepares expert conversations by making decision dependencies explicit.',
  },
  {
    eyebrow: 'Agentic reasoning loop',
    title: 'Useful AI assistance stays grounded in local evidence and visible uncertainty',
    coreMessage: 'The agentic layer is valuable only when it separates facts, assumptions, risks, gaps and actions.',
  },
];

export const positioningBadges: ShowcaseBadge[] = [
  { label: 'Local-first', tone: 'fact' },
  { label: 'BIM/IFC/AAS-inspired', tone: 'generated' },
  { label: 'Site verification required', tone: 'check' },
  { label: 'Expert validation required', tone: 'expert' },
];

export const workflowSteps: ShowcaseBullet[] = [
  {
    title: 'Geodata and rough hull experiment',
    text: 'Generated model outputs, terrain context and IFC-oriented export experiments establish a first spatial reference.',
  },
  {
    title: 'Evidence registers',
    text: 'Building facts, assumptions, missing measurements, findings, risks and decisions become local project data.',
  },
  {
    title: 'Uncertainty-aware reasoning',
    text: 'Rule-based summaries separate facts from assumptions and produce practical next actions for site visits.',
  },
];

export const introBullets: ShowcaseBullet[] = [
  { text: 'Early geospatial context and rough hull geometry are now treated as a structured baseline, not as measured reality.' },
  { text: 'Facts, assumptions, measurements, risks and decisions are split into registers so uncertainty stays visible.' },
  { text: 'The agentic layer prepares better questions for architects, engineers, energy consultants and craftspeople.' },
];

export const baselineMetrics: ShowcaseMetric[] = [
  {
    label: 'Confirmed hull grouping',
    value: 'Part 1 + Part 2',
    note: 'The current top-level building parts in the app.',
    badge: { label: 'Documented', tone: 'fact' },
  },
  {
    label: 'Part 1 main body length',
    value: '16.88 m',
    note: 'Derived from the schematic floor plan and LoD2-oriented local axis.',
    badge: { label: 'Generated', tone: 'generated' },
  },
  {
    label: 'Nominal storey seed',
    value: '2.40 m',
    note: 'Useful for early vertical CAD reasoning, not a measured height.',
    badge: { label: 'Estimated', tone: 'assumption' },
  },
  {
    label: 'Cellar schematic extent',
    value: '4 x 7 m',
    note: 'Approximate location and size are tracked for future verification.',
    badge: { label: 'Approx.', tone: 'assumption' },
  },
  {
    label: 'Metadata foundation',
    value: 'Available',
    note: 'Schemas, examples, validation and issue/finding links support traceable planning.',
    badge: { label: 'Fact', tone: 'fact' },
  },
];

export const registerColumns: Array<{ title: string; items: ShowcaseRegisterItem[] }> = [
  {
    title: 'Known facts',
    items: [
      {
        title: 'Planning section exists',
        text: 'Project overview, facts, assumptions, missing measurements, decisions and reasoning are exposed in the app.',
        badge: { label: 'Fact', tone: 'fact' },
      },
      {
        title: 'Part 1 sub-parts retained',
        text: 'Confirmed sub-part labels are kept for future detection and gradual detailing.',
        badge: { label: 'Fact', tone: 'fact' },
      },
      {
        title: 'Side-elevation studies',
        text: 'Useful for photo planning and dimension control, but not a measured survey.',
        badge: { label: 'Generated', tone: 'generated' },
      },
    ],
  },
  {
    title: 'Open assumptions',
    items: [
      {
        title: 'Wall thickness about 0.5 m',
        text: 'Affects energy strategy, openings, quantities and CAD seed quality.',
        badge: { label: 'Assumption', tone: 'assumption' },
      },
      {
        title: 'Roof build-up and ventilation',
        text: 'Blocks reliable insulation, PV mounting and moisture reasoning.',
        badge: { label: 'Unknown', tone: 'assumption' },
      },
      {
        title: 'Terrain lines',
        text: 'Drainage and plinth risks depend on real local ground levels.',
        badge: { label: 'Simplified', tone: 'assumption' },
      },
    ],
  },
  {
    title: 'Needed site checks',
    items: [
      {
        title: 'Inspect roof layers',
        text: 'Use attic photo blocks and one representative rafter bay measurement.',
        badge: { label: 'Critical', tone: 'check' },
      },
      {
        title: 'Verify eaves and ridge heights',
        text: 'Use laser-referenced photos and safe control measurements.',
        badge: { label: 'High', tone: 'check' },
      },
      {
        title: 'Document drainage paths',
        text: 'Record gutters, downpipes, splash zones, plinth moisture and ground fall.',
        badge: { label: 'High', tone: 'check' },
      },
    ],
  },
];

export const showcaseDecisions: ShowcaseDecision[] = [
  {
    title: 'Choose roof insulation strategy',
    status: { label: 'Blocked', tone: 'blocked' },
    dependsOn: 'Roof build-up, timber condition, eaves/ridge checks',
    uncertainty: 'Moisture behavior and ventilation path',
    expertCheck: 'Energy consultant and roof specialist',
    nextStep: 'Inspect roof layers before narrowing options',
  },
  {
    title: 'Define realistic PV placement',
    status: { label: 'Under review', tone: 'generated' },
    dependsOn: 'Roof condition, setbacks, obstructions, structure',
    uncertainty: 'Generated yield assumptions could overclaim',
    expertCheck: 'PV planner and structural review',
    nextStep: 'Verify safe roof zones and maintenance access',
  },
  {
    title: 'Prioritize moisture and drainage work',
    status: { label: 'Blocked', tone: 'blocked' },
    dependsOn: 'Drainage discharge, plinth zones, cellar evidence',
    uncertainty: 'Moisture source could be misdiagnosed',
    expertCheck: 'Building diagnostics or experienced craft review',
    nextStep: 'Collect rainfall and ground-level evidence',
  },
  {
    title: 'Classify retained, removed and reusable elements',
    status: { label: 'Not started', tone: 'check' },
    dependsOn: 'Condition photos, material checks, demolition scope',
    uncertainty: 'Reuse potential is not proven yet',
    expertCheck: 'Craftspeople, planner and disposal/reuse advice',
    nextStep: 'Capture condition evidence before classification',
  },
];

export const reasoningLines: ShowcaseReasoningLine[] = [
  {
    heading: 'Facts',
    text: 'The app contains planning registers, generated model outputs, metadata schemas and a site-visit workflow.',
  },
  {
    heading: 'Assumptions',
    text: 'Wall thickness, roof build-up, terrain relationships and cellar extent are still partly estimated.',
  },
  {
    heading: 'Risks',
    text: 'Roof insulation, PV layout and drainage decisions could be overclaimed without site and expert validation.',
  },
  {
    heading: 'Missing information',
    text: 'Roof layers, eaves/ridge heights, drainage paths, wall thickness and cellar condition need measured evidence.',
  },
  {
    heading: 'Suggested next actions',
    text: 'Run the S01-S20 photo protocol, add laser-distance metadata, update local registers and generate a new handoff snapshot.',
  },
];
