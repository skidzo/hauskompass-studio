/**
 * ProjectHome — Startseite / Projektwähler
 *
 * Zeigt:
 *  1. Eingebaute Projekte aus /projects/index.json
 *  2. Gespeicherte Renovierungsprojekte aus localStorage
 *  3. "Neues Projekt anlegen" (nur Bayern und Baden-Württemberg)
 */

import { listProjects, loadProject } from '@/features/project-store/projectStore';
import type { ImportedProject } from '@/features/project-store/types';
import { importWorkshopBundle, importWorkshopBundleZip, type WorkshopBundleExport } from '@/features/workshop/db/workshopDb';
import { Building2, FolderOpen, Home, Layers, MapPin, Plus, Upload, Wrench } from 'lucide-react';
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

export function ProjectHome({ onSelectBuiltin, onSelectRenovation, onNewProject, onStartWorkshop, onImportBackup }: ProjectHomeProps) {
    const builtinProjects = useBuiltinProjects();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [importing, setImporting] = useState(false);

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
                    <h2 className="ph-section-title">Vorhandene Projekte</h2>
                    <div className="ph-project-grid">
                        {builtinProjects.map((proj) => (
                            <button
                                key={proj.id}
                                className="ph-project-card ph-project-card-builtin"
                                onClick={() => onSelectBuiltin(proj)}
                                type="button"
                            >
                                <div className="ph-card-icon">
                                    {proj.type === 'workshop' ? <Wrench size={22} /> : <Home size={22} />}
                                </div>
                                <div className="ph-card-body">
                                    <span className="ph-card-label">
                                        {proj.type === 'workshop' ? 'Workshop-Projekt' : 'Renovierungsprojekt'}
                                    </span>
                                    <strong className="ph-card-title">{proj.title}</strong>
                                    <span className="ph-card-sub">{proj.subtitle}</span>
                                    <span className="ph-card-loc">
                                        <MapPin size={11} />
                                        {proj.location}
                                    </span>
                                    <p className="ph-card-desc">{proj.description}</p>
                                </div>
                            </button>
                        ))}

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
                        Sie haben eine zuvor exportierte JSON-Backup-Datei? Laden Sie sie hier hoch — alle Notizen und Daten werden sofort wiederhergestellt.
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".zip,.json,application/zip,application/json"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                    <button
                        className="ph-import-btn"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                        type="button"
                    >
                        <Upload size={16} />
                        {importing ? 'Wird importiert …' : 'JSON-Backup auswählen'}
                    </button>
                    {importError && <p className="ph-import-error">{importError}</p>}
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
        </div>
    );
}
