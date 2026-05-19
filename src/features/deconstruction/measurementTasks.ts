import type { Priority, ReuseOutcome, ReuseStream } from './deconstructionTypes';

export interface MeasurementTask {
  id: string;
  category: string;
  label: string;
  why: string;
  how: string;
  priority: Priority;
  reuseStream: ReuseStream;
  reuseOutcome: ReuseOutcome;
  shotIds: string[];
  blockedBy?: string;
}

export const measurementTasks: MeasurementTask[] = [
  {
    id: 'roof-pitch',
    category: 'Roof',
    label: 'Roof pitch — field verification',
    why: 'LoD2 derived pitch: Part 1 ≈ 41°, Part 2 ≈ 40°. Manual check needed for PV tilt calculation and rafter span tables.',
    how: 'Inclinometer or digital level on a rafter. Measure on both sides per ridge.',
    priority: 'high',
    reuseStream: 'timber',
    reuseOutcome: 'tbd',
    shotIds: ['S11', 'S15'],
  },
  {
    id: 'roof-ridge-length',
    category: 'Roof',
    label: 'Ridge and eave lengths',
    why: 'LoD2 roof surface areas: Part 1 = 256.7 m², Part 2 = 158.3 m². Field measurement needed to validate PV panel layout.',
    how: 'Tape measure along ridge and eave. Check against LoD2 bbox (Part 1: ~17.9 m E-W × 22.2 m N-S).',
    priority: 'high',
    reuseStream: 'timber',
    reuseOutcome: 'tbd',
    shotIds: ['S04', 'S07'],
  },
  {
    id: 'roof-obstructions',
    category: 'Roof',
    label: 'Roof obstructions: chimney, skylights, snow guards',
    why: 'Not visible in LoD2. Required for PV shading calculation and roofing cost estimate.',
    how: 'Walk the roof with checklist. Photo each obstruction with tape measure for position.',
    priority: 'high',
    reuseStream: 'finishes',
    reuseOutcome: 'dispose',
    shotIds: ['S03', 'S04', 'S20'],
  },
  {
    id: 'roof-structure',
    category: 'Roof',
    label: 'Roof structure: rafters, purlins, reusable timber',
    why: 'Key renovation decision: can the existing timber be retained under a new unified roof?',
    how: 'Attic inspection: measure rafter cross-section (width × height), spacing, purlin positions. Check for rot and insect damage.',
    priority: 'critical',
    reuseStream: 'timber',
    reuseOutcome: 'direct-reuse',
    shotIds: ['S10', 'S11', 'S12', 'S13', 'S14', 'S15'],
  },
  {
    id: 'wall-thickness',
    category: 'Walls',
    label: 'Wall thickness at all external walls',
    why: 'Needed for thermal transmittance (U-value) calculation and insulation layer design.',
    how: 'Measure at window reveals (tape) and any exposed section. Typical old Bavarian farmhouse: 50–80 cm solid masonry.',
    priority: 'critical',
    reuseStream: 'masonry',
    reuseOutcome: 'tbd',
    shotIds: ['S01', 'S07', 'S08', 'S09', 'S10', 'S16', 'S17'],
  },
  {
    id: 'wall-openings',
    category: 'Walls',
    label: 'Window and door opening dimensions',
    why: 'Required for replacement window quotations and energy balance. Window detection not possible from aerial imagery.',
    how: 'All four facades: width × height × sill height per opening. Note frame material (wood/PVC) and glazing layers.',
    priority: 'high',
    reuseStream: 'masonry',
    reuseOutcome: 'tbd',
    shotIds: ['S01'],
  },
  {
    id: 'south-wall-condition',
    category: 'Walls',
    label: 'South wall condition and terrain contact',
    why: 'South wall sits at terrain grade (≈ 516.5–517.5 m). Rocky substrate confirmed by DGM1 profile. Foundation detail unknown.',
    how: 'Visual inspection at grade: crack pattern, moisture staining, plaster condition. Probe for mortar depth. Flag for Baugrundgutachten.',
    priority: 'critical',
    reuseStream: 'masonry',
    reuseOutcome: 'tbd',
    shotIds: ['S01', 'S02', 'S09'],
    blockedBy: 'Baugrundgutachten (geological assessment) required before any excavation',
  },
  {
    id: 'cellar-moisture',
    category: 'Moisture & Ground',
    label: 'Cellar / ground floor moisture',
    why: 'Part 1 floor at 517.64 m, Part 2 at 519.85 m — 2.2 m step. Ground contact likely on south and west sides.',
    how: 'Capacitive moisture meter on ground-floor walls and floor slab. Record readings at 0.3, 0.6, 1.0 m height. Photo any efflorescence.',
    priority: 'critical',
    reuseStream: 'masonry',
    reuseOutcome: 'tbd',
    shotIds: ['S02', 'S16', 'S18', 'S19'],
  },
  {
    id: 'drainage',
    category: 'Moisture & Ground',
    label: 'Rainwater drainage and downpipe routing',
    why: 'Terrain drops ~9 m over 90 m N-S. North slope runoff may concentrate at building north wall.',
    how: 'Trace all downpipes to discharge point. Check for blocked gutters. Note standing water marks after rain.',
    priority: 'high',
    reuseStream: 'finishes',
    reuseOutcome: 'tbd',
    shotIds: ['S05', 'S18'],
  },
  {
    id: 'pv-shading',
    category: 'PV & Energy',
    label: 'PV shading — north tree canopy',
    why: 'Dense deciduous canopy ≥15 m north of building (confirmed aerial). Winter shadow may reach south-facing roof.',
    how: 'SunEarthTools horizon chart or SolarEdge mapping tool. Measure nearest tree height and distance from south eave.',
    priority: 'medium',
    reuseStream: 'documentation',
    reuseOutcome: 'tbd',
    shotIds: ['S05', 'S06'],
  },
  {
    id: 'pv-usable-area',
    category: 'PV & Energy',
    label: 'Net PV usable roof area',
    why: 'LoD2 south-facing roof: estimated ~130 m² (both parts combined south slope). Obstructions will reduce this.',
    how: 'After roof obstruction survey: subtract 0.5 m border + obstruction zones from total south roof area.',
    priority: 'medium',
    reuseStream: 'documentation',
    reuseOutcome: 'tbd',
    shotIds: ['S03'],
    blockedBy: 'Depends on: roof-obstructions, pv-shading',
  },
  {
    id: 'parcel-boundary',
    category: 'Legal / Documentation',
    label: 'Machine-readable parcel boundary (DXF)',
    why: 'Approx. boundary estimated from BayernAtlas (±5 m). Abstandsflächen calculation (Art. 6 BayBO) requires exact boundary.',
    how: 'Request DXF/DWG boundary export from ADBV Nabburg (Obertor 12, 92507 Nabburg), ref 48 OVI 1345/6. Kostenpflichtig.',
    priority: 'high',
    reuseStream: 'documentation',
    reuseOutcome: 'tbd',
    shotIds: [],
  },
  {
    id: 'bestandsnachweis',
    category: 'Legal / Documentation',
    label: 'Bestandsnachweis / amtliche Fläche',
    why: 'Official parcel area not on Flurkarte. Required for building permit and financing.',
    how: 'Request Bestandsnachweis (ALKIS Grundstücksdaten) from ADBV Nabburg or via BayernAtlas-Grundstücksinformationen.',
    priority: 'high',
    reuseStream: 'documentation',
    reuseOutcome: 'tbd',
    shotIds: [],
  },
];

export const measurementTasksById = Object.fromEntries(
  measurementTasks.map((task) => [task.id, task]),
) as Record<string, MeasurementTask>;
