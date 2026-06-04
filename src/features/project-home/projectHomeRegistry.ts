export type ProjectHomeKind = 'workshop' | 'renovation';

export interface ProjectHomeRecord {
  id: string;
  kind: ProjectHomeKind;
  createdAt: string;
  title: string;
  subtitle: string;
  location: string;
  description: string;
  projectId: string;
  siteId: string;
}

const STORAGE_KEY = 'hk_project_home_records';

function readRecords(): ProjectHomeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as ProjectHomeRecord[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecords(records: ProjectHomeRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records, null, 2));
}

export function loadProjectHomeRecords(): ProjectHomeRecord[] {
  return readRecords().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function saveProjectHomeRecord(record: ProjectHomeRecord): void {
  const records = readRecords();
  const next = records.filter((item) => item.id !== record.id);
  next.push(record);
  writeRecords(next);
}

export function removeProjectHomeRecord(id: string): void {
  const next = readRecords().filter((item) => item.id !== id);
  writeRecords(next);
}

export function workshopProjectHomeRecord(params: {
  projectId: string;
  siteId: string;
  title: string;
  subtitle: string;
  location?: string;
  description?: string;
  createdAt?: string;
}): ProjectHomeRecord {
  return {
    id: `workshop:${params.projectId}`,
    kind: 'workshop',
    createdAt: params.createdAt ?? new Date().toISOString(),
    title: params.title,
    subtitle: params.subtitle,
    location: params.location ?? '',
    description: params.description ?? 'Workshop-Projekt',
    projectId: params.projectId,
    siteId: params.siteId,
  };
}

export function renovationProjectHomeRecord(params: {
  slug: string;
  title: string;
  subtitle: string;
  location?: string;
  description?: string;
  createdAt: string;
}): ProjectHomeRecord {
  return {
    id: `renovation:${params.slug}`,
    kind: 'renovation',
    createdAt: params.createdAt,
    title: params.title,
    subtitle: params.subtitle,
    location: params.location ?? '',
    description: params.description ?? 'Renovierungsprojekt',
    projectId: params.slug,
    siteId: params.slug,
  };
}
