import type { ImportedProject } from '@/features/project-store/types';
import {
  buildStudioBundleFilename,
  createStudioBundlePreview,
  formatStudioBundleCountSummary,
  formatStudioBundleLabel,
  formatStudioBundleTransportLabel,
  type StudioBundlePreview,
} from '@/lib/studio-core/backup/helpers';
import { useState, type ChangeEvent } from 'react';
import {
  exportRenovationBundle,
  importRenovationBundle,
  inspectRenovationBundleImport,
  type RenovationBundleExport,
} from './renovationBundle';
import {
  mergeLocalAssessmentPackageRegisters,
  parseLocalAssessmentPackage,
  summarizeLocalAssessmentPackage,
  type LocalAssessmentPackageImport,
} from './localAssessmentPackages';
import { loadLocalPlanningRegisters, localRegisterLabels, saveLocalPlanningRegisters, type LocalRegisterType } from './localPlanningRegisters';

const registerTypes: LocalRegisterType[] = ['buildingFacts', 'assumptions', 'measurementNeeds', 'renovationDecisions'];

export function LocalAssessmentPackagePanel({ project }: { project?: ImportedProject | null }) {
  const [packageImport, setPackageImport] = useState<LocalAssessmentPackageImport | null>(null);
  const [message, setMessage] = useState('Kein Paket geladen.');
  const [bundleSummary, setBundleSummary] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{ bundle: RenovationBundleExport; preview: StudioBundlePreview } | null>(null);

  function loadPackage(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseLocalAssessmentPackage(String(reader.result ?? ''));
      if (!result.importResult) {
        setPackageImport(null);
        setMessage(result.errors.join('; '));
        input.value = '';
        return;
      }
      setPackageImport(result.importResult);
      setMessage(`Loaded ${file.name}.`);
      input.value = '';
    };
    reader.onerror = () => setMessage(`Datei konnte nicht gelesen werden: ${file.name}.`);
    reader.readAsText(file);
  }

  function mergeRegisters() {
    if (!packageImport) return;
    const current = loadLocalPlanningRegisters();
    const merged = mergeLocalAssessmentPackageRegisters(current, packageImport.registers);
    saveLocalPlanningRegisters(merged);
    setMessage(`${summarizeLocalAssessmentPackage(packageImport).registerCount} Paket-Einträge in Browser-Register übernommen.`);
  }

  function downloadRenovationBundle() {
    if (!project) return;
    const bundle = exportRenovationBundle(project);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = buildStudioBundleFilename(bundle, 'json');
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    const summary = `${formatStudioBundleLabel(bundle)} · ${formatStudioBundleTransportLabel(bundle.mediaTransport)} · ${formatStudioBundleCountSummary(bundle.counts)}`;
    setBundleSummary(summary);
    setMessage(`${formatStudioBundleLabel(bundle)} für ${project.slug} exportiert.`);
  }

  function importRenovationBackup(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? '')) as RenovationBundleExport;
        const preview = createStudioBundlePreview(parsed, inspectRenovationBundleImport(parsed));
        setPendingRestore({ bundle: parsed, preview });
        setMessage(`Backup ${file.name} geladen. Wiederherstellung prüfen.`);
      } catch (error) {
        setPendingRestore(null);
        setBundleSummary(null);
        setMessage(error instanceof Error ? error.message : `Backup konnte nicht importiert werden: ${file.name}.`);
      }
      input.value = '';
    };
    reader.onerror = () => setMessage(`Backup konnte nicht gelesen werden: ${file.name}.`);
    reader.readAsText(file);
  }

  function confirmRenovationBackupRestore() {
    if (!pendingRestore) return;
    try {
      const restored = importRenovationBundle(pendingRestore.bundle);
      const label = formatStudioBundleLabel(pendingRestore.bundle);
      setBundleSummary(`${pendingRestore.preview.label} · ${pendingRestore.preview.transportLabel} · ${pendingRestore.preview.countSummary}`);
      setMessage(`${label} für ${restored.slug} lokal wiederhergestellt.`);
      setPendingRestore(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Backup konnte nicht importiert werden.');
    }
  }

  const summary = packageImport ? summarizeLocalAssessmentPackage(packageImport) : null;

  return (
    <section className="panel">
      <div className="panel-title">Lokales Befundpaket</div>
      <p className="panel-copy">
        Adress-agnostischer Paketimport für lokale/private Befundungs-Anwendungsfälle. Die App liest eine generische Paketstruktur;
        genaue Adressen, Koordinaten und heruntergeladene Quelldateien verbleiben in ignorierten privaten Dateien.
      </p>

      <div className="local-package-actions">
        <label className="filter-pill filter-pill-active local-register-import">
          Paket-JSON laden
          <input accept="application/json,.json" onChange={loadPackage} type="file" />
        </label>
        <button className="filter-pill" disabled={!packageImport} onClick={mergeRegisters} type="button">
          Register lokal übernehmen
        </button>
        {project && (
          <>
            <button className="filter-pill" onClick={downloadRenovationBundle} type="button">
              Renovierungs-Backup exportieren
            </button>
            <label className="filter-pill local-register-import">
              Renovierungs-Backup importieren
              <input accept="application/json,.json" onChange={importRenovationBackup} type="file" />
            </label>
          </>
        )}
      </div>
      <p className="fine-print">{message}</p>
      {bundleSummary && <p className="fine-print">{bundleSummary}</p>}
      {pendingRestore && (
        <article className="planning-card local-package-summary">
          <span>Wiederherstellung prüfen</span>
          <strong>{pendingRestore.preview.title}</strong>
          <p>{pendingRestore.preview.label} · {pendingRestore.preview.transportLabel}</p>
          <small>{pendingRestore.preview.countSummary} · Exportiert: {pendingRestore.preview.exportedAtLabel}</small>
          {pendingRestore.preview.warnings.map((warning) => <p key={warning}>Warnung: {warning}</p>)}
          {pendingRestore.preview.errors.map((error) => <p key={error}>Fehler: {error}</p>)}
          <div className="local-package-actions">
            <button className="filter-pill" disabled={!pendingRestore.preview.restorable || pendingRestore.preview.errors.length > 0} onClick={confirmRenovationBackupRestore} type="button">
              Jetzt wiederherstellen
            </button>
            <button className="filter-pill" onClick={() => setPendingRestore(null)} type="button">
              Verwerfen
            </button>
          </div>
        </article>
      )}

      {summary && packageImport && (
        <div className="local-package-layout">
          <article className="planning-card local-package-summary">
            <span>{summary.privacy}</span>
            <strong>{summary.title}</strong>
            <p>{summary.implication || packageImport.package.subject.description || 'Keine Bewertungsimplikation angegeben.'}</p>
            <small>{summary.kind} · {summary.packageId} · {summary.createdAt}</small>
          </article>

          <div className="planning-stat-grid local-package-stats">
            <div><strong>{summary.registerCount}</strong><span>Registereinträge</span></div>
            <div><strong>{summary.publicFactCount}</strong><span>Fakten (öffentlich)</span></div>
            <div><strong>{summary.sourceCount}</strong><span>Quellen</span></div>
            <div><strong>{summary.unknownCount}</strong><span>Unbekannte</span></div>
          </div>

          {packageImport.warnings.length > 0 && (
            <article className="planning-card local-package-warning">
              <strong>Datenschutzwarnung</strong>
              {packageImport.warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </article>
          )}

          <div className="planning-grid">
            <article className="panel">
              <div className="panel-title">Paket-Register</div>
              <div className="planning-list">
                {registerTypes.map((type) => (
                  <div key={type}>
                    <strong>{localRegisterLabels[type]}</strong>
                    <span>{packageImport.registers[type].length} Einträge</span>
                  </div>
                ))}
              </div>
            </article>
            <article className="panel">
              <div className="panel-title">Hochprioritäre Unbekannte</div>
              <div className="planning-list">
                {(packageImport.package.highPriorityUnknowns ?? []).map((unknown) => (
                  <div key={unknown}>
                    <strong>{unknown}</strong>
                  </div>
                ))}
                {(packageImport.package.highPriorityUnknowns ?? []).length === 0 && (
                  <div><strong>Keine hochprioritären Unbekannten angegeben</strong></div>
                )}
              </div>
            </article>
          </div>

          <details className="local-register-export">
            <summary>Paket-Metadaten Vorschau</summary>
            <pre>{JSON.stringify(packageImport.package, null, 2)}</pre>
          </details>
        </div>
      )}
    </section>
  );
}

