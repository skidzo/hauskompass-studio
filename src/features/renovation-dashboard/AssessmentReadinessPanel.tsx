import type { FetchedGeodataSummary } from '@/features/building-hull-import/fetchedGeodataSummary';
import type { ImportedTerrainData } from '@/features/lod2-derived/fetchTerrainProfile';
import type { ImportedProject } from '@/features/project-store/types';
import type { ReactNode } from 'react';

const demoRows = [
  ['Zielobjekt-Abgleich', 'Bestätigtes Verbundobjekt', 'LoD2-Kandidaten 1 und 2 bilden zusammen das Untersuchungsobjekt.'],
  ['CAD-Arbeitsdateien', 'Ausgeschlossen', 'Vorhandene FreeCAD/CAD-Experimente sind nicht als Bestandsbefund geeignet.'],
  ['Vorhandene Dachgeometrie', 'Rohdaten verfügbar', 'LoD2-Dachflächen für Teil 1 und 2 sind extrahiert. Sie bleiben Befund-Geometrie, keine Planungsgeometrie.'],
  ['Zukünftige Dachgeometrie', 'Spätere Variante', 'Ein einheitliches Dach über Teil 1 und 2 ist ein späterer Planungsschritt und darf das Bestandsmodell nicht überschreiben.'],
  ['Gelände', 'Rohdaten verfügbar', 'DGM1-GeoTIFF ist gecacht. Lokale Beprobung/Ausschnitt noch ausstehend.'],
  ['Baukonstruktions-Bewertung', 'Blockiert', 'Erfordert Fotos, Aufmaß, Dachkonstruktionsinspektion und Feuchtigkeitsprüfung.'],
];

function statusBadge(ok: boolean, yes: string, no: string): ReactNode {
  return <span className={`badge confidence-${ok ? 'high' : 'low'}`}>{ok ? yes : no}</span>;
}

export function AssessmentReadinessPanel({
  summary,
  project,
  terrainData,
  lod2GeneratedFor,
}: {
  summary?: FetchedGeodataSummary;
  project?: ImportedProject | null;
  terrainData?: ImportedTerrainData | null;
  lod2GeneratedFor?: string | null;
}) {
  if (project) {
    const hasLoD2 = project.candidates.length > 0;
    const hasConfirmed = project.confirmedIds.length > 0;
    const hasTerrain = terrainData != null;
    const hasIfc = lod2GeneratedFor != null;

    const rows: [string, ReactNode, string][] = [
      [
        'Adresse & Geocoding',
        statusBadge(true, 'Verfügbar', 'Fehlend'),
        project.geocode.displayName,
      ],
      [
        'LoD2 Gebäudemodell',
        statusBadge(hasLoD2, 'Importiert', 'Ausstehend'),
        hasLoD2
          ? `${project.candidates.length} Kandidaten aus Kachel ${project.geocode.tileId}`
          : 'Kachel noch nicht importiert',
      ],
      [
        'Gebäudeteile bestätigt',
        statusBadge(hasConfirmed, 'Bestätigt', 'Ausstehend'),
        hasConfirmed
          ? `${project.confirmedIds.length} Gebäudete${project.confirmedIds.length === 1 ? 'il' : 'ile'} als Untersuchungsobjekt gesetzt`
          : 'Noch keine Teile im Standort-Tab bestätigt',
      ],
      [
        'Geländemodell DGM1',
        statusBadge(hasTerrain, 'Geladen', 'Ausstehend'),
        hasTerrain
          ? `Höhenprofil verfügbar (N–S / O–W)`
          : 'Gelände-Tab → Daten laden, um Geländeanalyse zu aktivieren',
      ],
      [
        'IFC-Modell',
        statusBadge(hasIfc, 'Generiert', 'Ausstehend'),
        hasIfc
          ? `IFC aus LoD2 generiert — Elemente- und Ansichts-Tabs verfügbar`
          : 'Gebäude-Tab → IFC generieren, um Detail-Tabs freizuschalten',
      ],
      [
        'Vor-Ort-Begehung',
        <span className="badge confidence-low" key="visit">Ausstehend</span>,
        'Fotos, Aufmaß, Konstruktionsinspektion und Feuchtigkeitsprüfung erforderlich',
      ],
    ];

    return (
      <section className="panel">
        <div className="panel-title">Bewertungsbereitschaft</div>
        <p className="panel-copy">
          Abgeleitet aus dem aktuellen Datenstand des Projekts <strong>{project.address}</strong>.
          Jeder Punkt zeigt, ob die erforderliche Datenschicht bereits vorliegt.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Bereich</th>
                <th>Status</th>
                <th>Bedeutung</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([area, status, meaning]) => (
                <tr key={area}>
                  <td><strong>{area}</strong></td>
                  <td>{status}</td>
                  <td>{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  // Demo fallback
  return (
    <section className="panel">
      <div className="panel-title">Bewertungsbereitschaft</div>
      <p className="panel-copy">
        Die aktuelle Baseline ist ein verifizierter Datenabruf, kein Gebäudebefund. Der nächste sinnvolle Schritt
        ist die Umwandlung von {summary ? ` ${summary.lod2.tile} ` : ' LoD2 '} in gemessene Dach-/Wandflächen
        und deren Abgleich mit dem Vor-Ort-Befund.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Bereich</th>
              <th>Status</th>
              <th>Bedeutung</th>
            </tr>
          </thead>
          <tbody>
            {demoRows.map(([area, status, meaning]) => (
              <tr key={area}>
                <td><strong>{area}</strong></td>
                <td><span className="badge confidence-medium">{status}</span></td>
                <td>{meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
