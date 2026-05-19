import type { EvidenceQualityFlag } from '@/domain/EvidenceInspection';
import { summarizeEvidenceQuality, type EvidenceReport, type EvidenceSourceRef } from '@/domain/EvidenceInspection';
import { adaptIfcElementToEvidence, type NormalizedIfcElement } from '@/domain/ifcMetadataAdapter';
import { FlaskConical } from 'lucide-react';

// ── Synthetic IFC fixtures (benchmark data only, no real building data) ────────

const SOURCE_REF: EvidenceSourceRef = {
    id: 'source-ifc-synthetic-fixture',
    label: 'Synthetic IFC Metadata Fixture',
    sourceType: 'ifc-metadata',
    reliability: 'medium',
};

const syntheticElements: NormalizedIfcElement[] = [
    {
        globalId: '2B3KLmN0P1QrStu9VwXyZa',
        name: 'Synthetic Concrete Wall W01',
        ifcClass: 'IfcWall',
        material: 'Concrete',
        baseQuantity: { value: 14.4, unit: 'm2' },
    },
    {
        globalId: '3C4DLmN0P2QrStu9VwXyZb',
        name: 'Synthetic Unknown-Material Wall W02',
        ifcClass: 'IfcWall',
        material: undefined,
        baseQuantity: { value: 8.0, unit: 'm2' },
    },
    {
        globalId: '4D5ELmN0P3QrStu9VwXyZc',
        name: 'Synthetic Slab Without Area S01',
        ifcClass: 'IfcSlab',
        material: 'Reinforced Concrete',
        baseQuantity: undefined,
    },
    {
        globalId: null,
        name: 'Synthetic Unidentified Beam B01',
        ifcClass: 'IfcBeam',
        material: 'Steel',
        baseQuantity: { value: 3.6, unit: 'm' },
    },
];

const buildingElementEvidence = syntheticElements.map((el) =>
    adaptIfcElementToEvidence(el, SOURCE_REF.id),
);

const syntheticReport: EvidenceReport = {
    id: 'evidence-report-ifc-synthetic-fixture',
    label: 'Synthetic IFC Metadata — Evidence Inspection',
    sourceRefs: [SOURCE_REF],
    buildingElementEvidence,
    documentEvidence: [],
    matchCandidates: [],
    findings: [],
    recommendedActions: [
        {
            id: 'action-material-check',
            label: 'Schedule material inspection',
            actionType: 'inspect',
            rationale: 'Wall W02 has no material recorded in IFC metadata. On-site inspection or expert review required.',
        },
        {
            id: 'action-quantity-survey',
            label: 'Request quantity from surveyor',
            actionType: 'measure',
            rationale: 'Slab S01 has no base quantity. A floor-area survey or take-off from drawings is needed.',
        },
        {
            id: 'action-globalid-reexport',
            label: 'Re-export IFC with GlobalId assignment',
            actionType: 'update-model',
            rationale: 'Beam B01 has no GlobalId. Elements without stable IDs cannot be reliably tracked across model versions.',
        },
    ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const FLAG_LABELS: Record<EvidenceQualityFlag, string> = {
    'missing-source': 'Quelle fehlt',
    'estimated-value': 'Geschätzter Wert',
    'ambiguous-identity': 'Unklare ID',
    'quantity-mismatch': 'Mengenabweichung',
    'material-mismatch': 'Materialabweichung',
    'stale-source': 'Veraltete Quelle',
    'needs-expert-review': 'Expertenprüfung erforderlich',
};

const ACTION_TYPE_LABELS: Record<string, string> = {
    inspect: 'Begutachten',
    measure: 'Messen',
    'ask-expert': 'Experten befragen',
    'request-document': 'Dokument anfordern',
    'update-model': 'Modell aktualisieren',
    other: 'Maßnahme',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function EvidenceInspectionPanel() {
    const summary = summarizeEvidenceQuality(syntheticReport);
    const reviewCount = buildingElementEvidence.filter(
        (el) => el.quality.confidence !== 'high',
    ).length;

    return (
        <div className="evidence-inspection-root">
            {/* Demo-data banner */}
            <div className="evidence-demo-banner" role="status">
                <FlaskConical size={14} />
                <strong>DEMO-DATEN</strong> — Synthetische Testelemente aus einem fiktiven IFC-Export.
                Kein echtes Gebäudemodell, keine gemessenen Werte.
            </div>
            {/* Header panel */}
            <section className="panel">
                <div className="panel-title">
                    <FlaskConical size={18} />
                    Nachweisprüfung — IFC-Metadaten
                </div>
                <p className="panel-copy">
                    Synthetische Referenzelemente aus einem IFC-Export via <code>ifcMetadataAdapter</code>.
                    Konfidenz und Qualitätsflags werden aus der Vollständigkeit des IFC-Eintrags berechnet
                    — keine realen Projektdaten.
                </p>
                <div className="metric-list metric-list-wide">
                    <div>
                        <dt>Elemente</dt>
                        <dd>{summary.evidenceItems}</dd>
                    </div>
                    <div>
                        <dt>Hohe Konfidenz</dt>
                        <dd>{summary.evidenceItems - reviewCount}</dd>
                    </div>
                    <div>
                        <dt>Prüfbedarf</dt>
                        <dd>{reviewCount}</dd>
                    </div>
                    <div>
                        <dt>Quelle</dt>
                        <dd>
                            <span className="badge confidence-medium">{SOURCE_REF.label}</span>
                        </dd>
                    </div>
                </div>
            </section>

            {/* Element evidence table */}
            <section className="panel">
                <div className="panel-title">Bauteil-Nachweise</div>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Bezeichnung</th>
                                <th>Typ</th>
                                <th>Material</th>
                                <th>Menge</th>
                                <th>Konfidenz</th>
                                <th>Qualitätsflags</th>
                            </tr>
                        </thead>
                        <tbody>
                            {buildingElementEvidence.map((el) => (
                                <tr key={el.id}>
                                    <td>
                                        <strong>{el.label}</strong>
                                        {el.stableElementId && (
                                            <div className="fine-print" style={{ marginTop: 2 }}>
                                                {el.stableElementId}
                                            </div>
                                        )}
                                    </td>
                                    <td>{el.elementType}</td>
                                    <td>{el.material ?? <span className="evidence-absent">—</span>}</td>
                                    <td>
                                        {el.quantity
                                            ? `${el.quantity.value} ${el.quantity.unit}`
                                            : <span className="evidence-absent">—</span>}
                                    </td>
                                    <td>
                                        <span className={`badge confidence-${el.quality.confidence}`}>
                                            {el.quality.confidence}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="evidence-flags">
                                            {el.quality.flags.length === 0 ? (
                                                <span className="evidence-flag-none">keine</span>
                                            ) : (
                                                el.quality.flags.map((flag) => (
                                                    <span key={flag} className="evidence-flag-tag">
                                                        {FLAG_LABELS[flag] ?? flag}
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="fine-print" style={{ marginTop: '0.75rem' }}>
                    Hinweis zur letzten Zeile: {buildingElementEvidence[buildingElementEvidence.length - 1]?.quality.explanation}
                </p>
            </section>

            {/* Recommended actions */}
            <section className="panel">
                <div className="panel-title">Empfohlene Maßnahmen</div>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Maßnahme</th>
                                <th>Art</th>
                                <th>Begründung</th>
                            </tr>
                        </thead>
                        <tbody>
                            {syntheticReport.recommendedActions.map((action) => (
                                <tr key={action.id}>
                                    <td><strong>{action.label}</strong></td>
                                    <td>
                                        <span className="badge confidence-medium">
                                            {ACTION_TYPE_LABELS[action.actionType] ?? action.actionType}
                                        </span>
                                    </td>
                                    <td>{action.rationale}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
