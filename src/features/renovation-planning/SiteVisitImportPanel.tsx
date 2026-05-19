import { useEffect, useState } from 'react';
import {
  parseSiteVisitImportDraft,
  siteVisitTemplate,
  summarizeSiteVisitImport,
  type SiteVisitImport,
} from './siteVisitImport';

const STORAGE_KEY = 'hauskompass.siteVisitImports.v1';

function loadImports(): SiteVisitImport[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveImports(imports: SiteVisitImport[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(imports, null, 2));
}

export function SiteVisitImportPanel() {
  const [imports, setImports] = useState<SiteVisitImport[]>(() => loadImports());
  const [draft, setDraft] = useState(() => JSON.stringify(siteVisitTemplate, null, 2));
  const [message, setMessage] = useState('Paste or edit a local S01-S20 import JSON. Nothing is uploaded.');

  useEffect(() => {
    saveImports(imports);
  }, [imports]);

  function importDraft() {
    const result = parseSiteVisitImportDraft(draft);
    if (!result.importData) {
      setMessage(result.errors.join('; '));
      return;
    }
    const imported = result.importData;
    setImports((current) => [imported, ...current.filter((item) => item.visitId !== imported.visitId)]);
    setMessage(`Imported ${imported.visitId} locally.`);
  }

  return (
    <section className="panel">
      <div className="panel-title">S01-S20 Site Visit Import</div>
      <p className="panel-copy">
        Local import workflow for photo block filenames and laser-distance metadata. Use this after the field visit to keep
        Gaussian-Splatting/photogrammetry context structured without committing private image data.
      </p>
      <div className="local-register-grid">
        <div>
          <label className="local-register-label" htmlFor="site-visit-import-editor">Import JSON</label>
          <textarea
            className="local-register-editor"
            id="site-visit-import-editor"
            onChange={(event) => setDraft(event.target.value)}
            value={draft}
          />
          <div className="local-register-actions">
            <button className="filter-pill filter-pill-active" onClick={importDraft} type="button">Validate and import locally</button>
            <button className="filter-pill" onClick={() => setDraft(JSON.stringify(siteVisitTemplate, null, 2))} type="button">Reset template</button>
          </div>
          <p className="fine-print">{message}</p>
        </div>
        <div className="planning-list">
          {imports.length === 0 && <div><strong>No site visits imported</strong><span>Use the template after your S01-S20 photo pass.</span></div>}
          {imports.map((item) => {
            const summary = summarizeSiteVisitImport(item);
            return (
              <div key={item.visitId}>
                <strong>{item.visitId}</strong>
                <span>{item.visitDate} · {item.device}</span>
                <span>{summary.blockCount} blocks · {summary.photoCount} photos · {summary.measurementCount} laser measurements</span>
                <small>Missing blocks: {summary.missingBlocks.length === 0 ? 'none' : summary.missingBlocks.join(', ')}</small>
              </div>
            );
          })}
        </div>
      </div>
      <details className="local-register-export">
        <summary>Export imported site visits JSON</summary>
        <pre>{JSON.stringify(imports, null, 2)}</pre>
      </details>
    </section>
  );
}
