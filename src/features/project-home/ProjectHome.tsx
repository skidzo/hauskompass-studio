/**
 * ProjectHome — Startseite / Projektwähler
 *
 * Zeigt:
 *  1. Eingebaute Projekte aus /projects/index.json
 *  2. Gespeicherte Renovierungsprojekte aus localStorage
 *  3. "Neues Projekt anlegen" (nur Bayern und Baden-Württemberg)
 */

import { listProjects, loadProject, saveProject } from '@/features/project-store/projectStore';
import type { ImportedProject } from '@/features/project-store/types';
import { importWorkshopBundle, importWorkshopBundleZip, type WorkshopBundleExport } from '@/features/workshop/db/workshopDb';
import { Building2, FolderOpen, Home, Layers, MapPin, Pencil, Plus, Upload, Wrench, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

// ── Built-in pre-existing projects ──────────────────────────────────────────

export interface BuiltinProject {
    id: string;
    slug?: string;
    projectId?: string;
    siteId?: string;
    mediaManifestUrl?: string;
    title: string;
    subtitle: string;
    type: 'workshop' | 'renovation';
    location: string;
    description: string;
}

const BUILTIN_PROJECTS_FALLBACK: BuiltinProject[] = [];

const PROJECTS_INDEX_URL = '/projects/index.json';

function useBuiltinProjects(): BuiltinProject[] {
    const [projects, setProjects] = useState<BuiltinProject[]>(BUILTIN_PROJECTS_FALLBACK);
    useEffect(() => {
        fetch(PROJECTS_INDEX_URL)
            .then((r) => r.json())
            .then((data: BuiltinProject[]) => setProjects(data))
            .catch(() => { /* keep fallback */ });
    }, []);
    return projects;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface ProjectHomeProps {
    onSelectBuiltin: (project: BuiltinProject) => void;
    onSelectRenovation: (slug: string) => void;
    onNewProject: () => void;
    onStartWorkshop: () => void;
    onImportBackup: (projectId: string, siteId: string, title: string) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

const LS_OVERRIDES_KEY = 'hk_builtin_overrides';

export function ProjectHome({ onSelectBuiltin, onSelectRenovation, onNewProject, onStartWorkshop, onImportBackup }: ProjectHomeProps) {
    const builtinProjects = useBuiltinProjects();

    // ── Local metadata overrides (localStorage) ───────────────────────────────
    const [overrides, setOverrides] = useState<Record<string, Partial<BuiltinProject>>>(() => {
        try { return JSON.parse(localStorage.getItem(LS_OVERRIDES_KEY) ?? '{}'); }
        catch { return {}; }
    });

    function applyOverride(proj: BuiltinProject): BuiltinProject {
        return { ...proj, ...(overrides[proj.id] ?? {}) };
    }

    // ── Edit state ────────────────────────────────────────────────────────────
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editSubtitle, setEditSubtitle] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [editDescription, setEditDescription] = useState('');

    function openEdit(proj: BuiltinProject, e: React.MouseEvent) {
        e.stopPropagation();
        const eff = applyOverride(proj);
        setEditTitle(eff.title);
        setEditSubtitle(eff.subtitle);
        setEditLocation(eff.location);
        setEditDescription(eff.description);
        setEditingId(proj.id);
    }

    function saveEdit() {
        if (!editingId) return;
        const next = {
            ...overrides,
            [editingId]: { title: editTitle, subtitle: editSubtitle, location: editLocation, description: editDescription },
        };
        setOverrides(next);
        localStorage.setItem(LS_OVERRIDES_KEY, JSON.stringify(next));
        setEditingId(null);
    }
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [importing, setImporting] = useState(false);

    const renovImportRef = useRef<HTMLInputElement>(null);
    const [renovImporting, setRenovImporting] = useState(false);
    const [renovImportError, setRenovImportError] = useState<string | null>(null);

    async function handleRenovImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setRenovImporting(true);
        setRenovImportError(null);
        try {
            const text = await file.text();
            const project = JSON.parse(text) as ImportedProject;
            if (!project.slug || !project.address || !project.geocode || !Array.isArray(project.candidates)) {
                throw new Error('Keine gültige Renovierungsprojekt-Datei. Bitte eine mit generate_project_backup.py erzeugte JSON-Datei verwenden.');
            }
            saveProject(project);
            onSelectRenovation(project.slug);
        } catch (err) {
            setRenovImportError(err instanceof Error ? err.message : 'Import fehlgeschlagen.');
        } finally {
            setRenovImporting(false);
            if (renovImportRef.current) renovImportRef.current.value = '';
        }
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        setImportError(null);
        try {
            let projectId: string;
            let siteId: string;
            let title: string;

            if (file.name.endsWith('.zip')) {
                const result = await importWorkshopBundleZip(file);
                projectId = result.projectId;
                siteId = result.siteId;
                title = result.title;
            } else {
                const text = await file.text();
                const bundle = JSON.parse(text) as WorkshopBundleExport;
                if (!bundle.project?.id || !bundle.site?.id) throw new Error('Keine gültige Backup-Datei.');
                await importWorkshopBundle(bundle);
                projectId = bundle.project.id;
                siteId = bundle.site.id;
                title = bundle.project.title ?? bundle.project.id;
            }

            onImportBackup(projectId, siteId, title);
        } catch (err) {
            setImportError(err instanceof Error ? err.message : 'Import fehlgeschlagen.');
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    const savedProjects = useMemo<ImportedProject[]>(() => {
        return listProjects()
            .map((slug) => loadProject(slug))
            .filter((p): p is ImportedProject => p !== null);
    }, []);

    return (
        <div className="ph-root">
            <header className="ph-hero">
                <h1 className="ph-wordmark">Hauskompass</h1>
                <p className="ph-tagline">
                    Workshop-Dokumentation &amp; Renovierungsplanung
                </p>

                {/* ── Quick-Start CTA für Workshop-Teilnehmer ── */}
                <div className="ph-quickstart-banner">
                    <div className="ph-quickstart-text">
                        <strong>Workshop dokumentieren?</strong>
                        <span>
                            Kein Setup, kein technisches Vorwissen — einfach loslegen.
                        </span>
                    </div>
                    <button
                        className="ph-quickstart-btn"
                        onClick={onStartWorkshop}
                        type="button"
                    >
                        <Layers size={18} />
                        Workshop starten
                    </button>
                </div>
            </header>

            <div className="ph-content">

                {/* ── Section: Pre-existing / built-in projects ── */}
                <section className="ph-section">
                    <h2 className="ph-section-title">Projekte</h2>
                    <div className="ph-project-grid">
                        {builtinProjects.map((proj) => {
                            const eff = applyOverride(proj);
                            return (
                            <div key={proj.id} className="ph-project-card-wrap">
                                <button
                                    className="ph-project-card ph-project-card-builtin"
                                    onClick={() => onSelectBuiltin(eff)}
                                    type="button"
                                >
                                    <div className="ph-card-icon">
                                        {eff.type === 'workshop' ? <Wrench size={22} /> : <Home size={22} />}
                                    </div>
                                    <div className="ph-card-body">
                                        <span className="ph-card-label">
                                            {eff.type === 'workshop' ? 'Workshop-Projekt' : 'Renovierungsprojekt'}
                                        </span>
                                        <strong className="ph-card-title">{eff.title}</strong>
                                        <span className="ph-card-sub">{eff.subtitle}</span>
                                        <span className="ph-card-loc">
                                            <MapPin size={11} />
                                            {eff.location}
                                        </span>
                                        <p className="ph-card-desc">{eff.description}</p>
                                    </div>
                                </button>
                                <button
                                    className="ph-card-edit-btn"
                                    onClick={(e) => openEdit(proj, e)}
                                    type="button"
                                    title="Metadaten bearbeiten"
                                >
                                    <Pencil size={12} />
                                </button>
                            </div>
                            );
                        })}
                        {/* Saved renovation projects */}
                        {savedProjects.map((proj) => (
                            <button
                                key={proj.slug}
                                className="ph-project-card ph-project-card-saved"
                                onClick={() => onSelectRenovation(proj.slug)}
                                type="button"
                            >
                                <div className="ph-card-icon">
                                    <FolderOpen size={22} />
                                </div>
                                <div className="ph-card-body">
                                    <span className="ph-card-label">Renovierungsprojekt</span>
                                    <strong className="ph-card-title">{proj.address}</strong>
                                    <span className="ph-card-sub">
                                        {proj.candidates.length} Gebäude
                                        {proj.confirmedIds.length > 0
                                            ? ` · ${proj.confirmedIds.length} bestätigt`
                                            : ''}
                                    </span>
                                    <span className="ph-card-loc">
                                        <MapPin size={11} />
                                        {proj.geocode.displayName.split(',').slice(-2).join(',').trim()}
                                    </span>
                                    <p className="ph-card-desc">
                                        Importiert am{' '}
                                        {new Date(proj.importedAt).toLocaleDateString('de-DE', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </p>
                                </div>
                            </button>
                        ))}

                        {/* New project card */}
                        <button
                            className="ph-project-card ph-project-card-new"
                            onClick={onNewProject}
                            type="button"
                        >
                            <div className="ph-card-icon">
                                <Plus size={22} />
                            </div>
                            <div className="ph-card-body">
                                <span className="ph-card-label">Neues Projekt</span>
                                <strong className="ph-card-title">Adresse eingeben</strong>
                                <span className="ph-card-sub">Bayern · Baden-Württemberg</span>
                                <p className="ph-card-desc">
                                    Adresse eingeben → automatischer LoD2-Import →
                                    Gebäudehülle, Terrain und Renovierungsplanung.
                                </p>
                            </div>
                        </button>
                    </div>
                </section>

                {/* ── Section: Backup import ── */}
                <section className="ph-section">
                    <h2 className="ph-section-title">Projekt aus Backup wiederherstellen</h2>
                    <p className="ph-import-hint">
                        Workshop-Backup (ZIP/JSON) oder Renovierungsprojekt (JSON) hier hochladen — alle Daten werden sofort wiederhergestellt.
                    </p>
                    <div className="ph-import-row">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".zip,.json,application/zip,application/json"
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />
                        <button
                            className="ph-import-btn"
                            onClick={() => { setImportError(null); fileInputRef.current?.click(); }}
                            disabled={importing}
                            type="button"
                        >
                            <Upload size={16} />
                            {importing ? 'Wird importiert …' : 'Workshop-Backup (ZIP/JSON)'}
                        </button>
                        <input
                            ref={renovImportRef}
                            type="file"
                            accept=".json,application/json"
                            style={{ display: 'none' }}
                            onChange={handleRenovImport}
                        />
                        <button
                            className="ph-import-btn ph-import-btn-renov"
                            onClick={() => { setRenovImportError(null); renovImportRef.current?.click(); }}
                            disabled={renovImporting}
                            type="button"
                        >
                            <Upload size={16} />
                            {renovImporting ? 'Wird importiert …' : 'Renovierungsprojekt (JSON)'}
                        </button>
                    </div>
                    {importError && <p className="ph-import-error">{importError}</p>}
                    {renovImportError && <p className="ph-import-error">{renovImportError}</p>}
                </section>

                {/* ── Section: Supported regions info ── */}
                <section className="ph-section ph-section-info">
                    <h2 className="ph-section-title">Unterstützte Bundesländer</h2>
                    <div className="ph-region-grid">
                        <div className="ph-region-card">
                            <Building2 size={18} />
                            <strong>Bayern</strong>
                            <span>LoD2 via LDBV · Open Data</span>
                        </div>
                        <div className="ph-region-card">
                            <Building2 size={18} />
                            <strong>Baden-Württemberg</strong>
                            <span>LoD2 via LGL BW · Open Data</span>
                        </div>
                        <div className="ph-region-card ph-region-card-soon">
                            <Building2 size={18} />
                            <strong>Weitere Länder</strong>
                            <span>In Vorbereitung</span>
                        </div>
                    </div>
                </section>
            </div>

            {/* ── Edit metadata overlay ── */}
            {editingId && (
                <div className="ph-edit-overlay" role="dialog" aria-modal="true">
                    <div className="ph-edit-dialog">
                        <header className="ph-edit-header">
                            <span>Projektmetadaten bearbeiten</span>
                            <button className="ph-edit-close" onClick={() => setEditingId(null)} type="button">
                                <X size={16} />
                            </button>
                        </header>
                        <div className="ph-edit-fields">
                            <label className="ph-edit-label">Titel
                                <input className="ph-edit-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                            </label>
                            <label className="ph-edit-label">Untertitel
                                <input className="ph-edit-input" value={editSubtitle} onChange={(e) => setEditSubtitle(e.target.value)} />
                            </label>
                            <label className="ph-edit-label">Standort
                                <input className="ph-edit-input" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
                            </label>
                            <label className="ph-edit-label">Beschreibung
                                <textarea className="ph-edit-input ph-edit-textarea" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
                            </label>
                        </div>
                        <footer className="ph-edit-footer">
                            <button className="ph-edit-cancel" onClick={() => setEditingId(null)} type="button">Abbrechen</button>
                            <button className="ph-edit-save" onClick={saveEdit} type="button">Speichern</button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}
