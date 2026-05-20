/**
 * Workshop Export — generiert eine selbstständige HTML-Datei aus Workshop-Szenen.
 *
 * Exportmodi:
 *   'public'   — nur Szenen mit publicationStatus 'publishable'
 *   'internal' — zusätzlich 'needs_review' und 'internal_only'
 *
 * Kein Backend. Alles client-seitig als Blob erzeugt und per Download ausgespielt.
 */

import type { WorkshopScene } from '@/features/workshop/db/workshopDb';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type ExportMode = 'public' | 'internal';

export interface WorkshopExportOptions {
  mode: ExportMode;
  projectTitle?: string;
  exportedBy?: string;
}

/**
 * Generate a self-contained HTML blob from the given workshop scenes.
 */
export function buildExportBlob(
  scenes: WorkshopScene[],
  opts: WorkshopExportOptions,
): Blob {
  const { mode, projectTitle = 'Mein Projekt', exportedBy } = opts;

  const filtered = scenes.filter((s) => {
    if (s.publicationStatus === 'do_not_publish') return false;
    if (mode === 'public') return s.publicationStatus === 'publishable' && s.visibility === 'public';
    return true; // internal mode: all except do_not_publish (already excluded above)
  });

  const html = renderHtml(filtered, projectTitle, mode, exportedBy);
  return new Blob([html], { type: 'text/html;charset=utf-8' });
}

/**
 * Trigger a browser download of the given blob.
 */
export function downloadExportBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildExportFilename(projectTitle: string, mode: ExportMode): string {
  const date = new Date().toISOString().slice(0, 10);
  const slug = projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');
  return `${slug}-workshop-${mode}-${date}.html`;
}

// ---------------------------------------------------------------------------
// HTML renderer
// ---------------------------------------------------------------------------

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pill(label: string, color: string): string {
  return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;background:${color};margin-right:4px">${esc(label)}</span>`;
}

function renderList(items: string[], className = ''): string {
  if (!items || items.length === 0) return '';
  const lis = items.map((i) => `<li>${esc(i)}</li>`).join('\n');
  return `<ul class="${className}">${lis}</ul>`;
}

function renderScene(scene: WorkshopScene, index: number): string {
  const visibilityColor = scene.visibility === 'public' ? '#dcfce7' : '#fef3c7';
  const visibilityLabel = scene.visibility === 'public' ? 'Öffentlich' : 'Intern';

  return `
  <article class="scene" id="scene-${esc(scene.id)}">
    <header class="scene-header">
      <div class="scene-meta">
        ${pill(visibilityLabel, visibilityColor)}
        ${pill(`Szene ${index + 1}`, '#e0f2fe')}
      </div>
      <h2 class="scene-title">${esc(scene.title)}</h2>
      <p class="scene-question">${esc(scene.guidingQuestion)}</p>
    </header>

    ${scene.contextText ? `
    <section class="scene-section">
      <h3>Kontext</h3>
      <p>${esc(scene.contextText)}</p>
    </section>` : ''}

    ${scene.observations && scene.observations.length > 0 ? `
    <section class="scene-section">
      <h3>Beobachtungen</h3>
      ${renderList(scene.observations, 'item-list')}
    </section>` : ''}

    ${scene.interpretations && scene.interpretations.length > 0 ? `
    <section class="scene-section">
      <h3>Deutungen</h3>
      ${renderList(scene.interpretations, 'item-list item-list-interp')}
    </section>` : ''}

    ${scene.openQuestions && scene.openQuestions.length > 0 ? `
    <section class="scene-section">
      <h3>Offene Fragen</h3>
      ${renderList(scene.openQuestions, 'item-list item-list-questions')}
    </section>` : ''}

    ${scene.discussionPrompt ? `
    <section class="scene-prompt">
      <h3>Diskussionsimpuls</h3>
      <blockquote>${esc(scene.discussionPrompt)}</blockquote>
    </section>` : ''}

    ${scene.targetAudience ? `
    <footer class="scene-footer">
      <span>Zielgruppe: ${esc(scene.targetAudience)}</span>
    </footer>` : ''}
  </article>`;
}

function renderHtml(
  scenes: WorkshopScene[],
  title: string,
  mode: ExportMode,
  exportedBy?: string,
): string {
  const dateStr = new Date().toLocaleDateString('de-DE', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const modeLabel = mode === 'public' ? 'Öffentliche Version' : 'Interne Arbeitsversion';

  const toc = scenes
    .map((s, i) => `<li><a href="#scene-${esc(s.id)}">${i + 1}. ${esc(s.title)}</a></li>`)
    .join('\n');

  const scenesHtml = scenes.map((s, i) => renderScene(s, i)).join('\n<hr>\n');

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — Workshop-Mappe</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: 'Georgia', serif;
      background: #fffdf8;
      color: #1f2933;
      max-width: 820px;
      margin: 0 auto;
      padding: 32px 24px 80px;
      line-height: 1.65;
    }
    h1 { font-size: 1.8rem; color: #174837; margin-bottom: 4px; }
    h2 { font-size: 1.25rem; color: #174837; margin-top: 0; }
    h3 { font-size: 0.9rem; font-weight: 700; text-transform: uppercase;
         letter-spacing: 0.06em; color: #566473; margin: 20px 0 8px; }
    a { color: #174837; }
    hr { border: none; border-top: 2px solid #e8e4dc; margin: 40px 0; }
    blockquote {
      border-left: 4px solid #174837;
      margin: 0;
      padding: 10px 16px;
      background: #f0fdf4;
      border-radius: 0 6px 6px 0;
      font-style: italic;
      color: #1f2933;
    }
    .cover { border-bottom: 3px solid #174837; padding-bottom: 24px; margin-bottom: 32px; }
    .cover-meta { font-size: 0.8rem; color: #566473; margin-top: 8px; }
    .toc { background: #f7f5f0; border-radius: 8px; padding: 16px 20px; margin-bottom: 40px; }
    .toc h2 { font-size: 1rem; margin-bottom: 8px; }
    .toc ol { margin: 0; padding-left: 20px; }
    .toc li { margin: 4px 0; font-size: 0.88rem; }
    .scene { margin-bottom: 0; }
    .scene-header { margin-bottom: 16px; }
    .scene-meta { margin-bottom: 8px; }
    .scene-title { font-size: 1.4rem; margin-bottom: 6px; }
    .scene-question {
      font-size: 1.05rem;
      font-style: italic;
      color: #2d4f40;
      border-left: 3px solid #a3c4a8;
      padding-left: 12px;
      margin: 0;
    }
    .scene-section { margin-bottom: 20px; }
    .scene-prompt {
      background: #f0fdf4;
      border-radius: 8px;
      padding: 16px 20px;
      margin-top: 24px;
    }
    .scene-footer { font-size: 0.75rem; color: #90a4ae; margin-top: 16px; }
    .item-list { margin: 0; padding-left: 20px; }
    .item-list li { margin: 6px 0; font-size: 0.9rem; }
    .item-list-interp li { list-style: none; margin-left: -20px; padding-left: 16px;
                           border-left: 2px solid #a3c4a8; margin-bottom: 8px; }
    .item-list-questions li { list-style: '❓ '; }
    @media print {
      body { max-width: 100%; padding: 0; }
      hr { page-break-after: always; border: none; }
      .toc { display: none; }
    }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${esc(title)}</h1>
    <h2>Workshop-Mappe — ${esc(title)}</h2>
    <p class="cover-meta">
      ${esc(modeLabel)} · ${esc(dateStr)}
      ${exportedBy ? ` · Erstellt von: ${esc(exportedBy)}` : ''}
    </p>
    <p class="cover-meta">${scenes.length} Szene${scenes.length !== 1 ? 'n' : ''}</p>
  </div>

  <nav class="toc">
    <h2>Inhalt</h2>
    <ol>${toc}</ol>
  </nav>

  ${scenesHtml}

  <footer style="margin-top:60px;border-top:1px solid #e8e4dc;padding-top:16px;font-size:0.72rem;color:#90a4ae">
    Generiert mit Hauskompass Studio · ${esc(dateStr)} · Alle Rechte vorbehalten
  </footer>
</body>
</html>`;
}
