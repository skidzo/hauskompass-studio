import type { DocumentationPriority, DocumentationStatus, Zone } from '@/domain/workshop/types';
import { AlertCircle, Camera, ChevronRight, Circle, Eye, HelpCircle, MessageSquare } from 'lucide-react';
import {
    ZONE_DOC_LEVEL_COLOR,
    ZONE_DOC_LEVEL_LABEL,
    type ZoneDocLevel,
    computeZoneDocLevel,
} from '../completeness';
import { SensitivityBadge } from './Badges';

// ---------------------------------------------------------------------------
// Priority / Status helpers
// ---------------------------------------------------------------------------

const PRIORITY_STYLE: Record<DocumentationPriority, { dot: string; label: string }> = {
    critical: { dot: '#b71c1c', label: 'Kritisch' },
    high: { dot: '#e65100', label: 'Hoch' },
    medium: { dot: '#1565c0', label: 'Mittel' },
    low: { dot: '#546e7a', label: 'Niedrig' },
};

const STATUS_ICON: Record<DocumentationStatus, React.ReactNode> = {
    not_started: <Circle size={13} color="#90a4ae" />,
    partial: <AlertCircle size={13} color="#e65100" />,
    complete: <Camera size={13} color="#2e7d32" />,
};

// ---------------------------------------------------------------------------
// ZoneListItem
// ---------------------------------------------------------------------------

interface ZoneListItemProps {
    zone: Zone;
    assetCount: number;
    claimCount: number;
    questionCount: number;
    observationCount: number;
    interpretationCount: number;
    isSelected: boolean;
    onClick: () => void;
}

export function ZoneListItem({
    zone,
    assetCount,
    claimCount,
    questionCount,
    observationCount,
    interpretationCount,
    isSelected,
    onClick,
}: ZoneListItemProps) {
    const ps = PRIORITY_STYLE[zone.documentationPriority];
    const docLevel = computeZoneDocLevel(assetCount, observationCount, interpretationCount);
    const docColor = ZONE_DOC_LEVEL_COLOR[docLevel];
    const docLabel = ZONE_DOC_LEVEL_LABEL[docLevel];
    return (
        <button
            className={`ws-zone-item${isSelected ? ' ws-zone-item-active' : ''}`}
            onClick={onClick}
            type="button"
        >
            <div className="ws-zone-item-header">
                <span className="ws-zone-priority-dot" style={{ background: ps.dot }} title={ps.label} />
                <span className="ws-zone-name">{zone.name}</span>
                {STATUS_ICON[zone.documentationStatus]}
                <ChevronRight size={14} className="ws-zone-chevron" />
            </div>
            <p className="ws-zone-desc">{zone.description}</p>
            <div className="ws-zone-counts">
                {assetCount > 0 && <span><Camera size={11} /> {assetCount}</span>}
                {observationCount > 0 && <span><Eye size={11} /> {observationCount}</span>}
                {claimCount > 0 && <span><MessageSquare size={11} /> {claimCount}</span>}
                {questionCount > 0 && <span><HelpCircle size={11} /> {questionCount}</span>}
                <SensitivityBadge level={zone.sensitivityLevel} />
            </div>
            <div className="ws-zone-doc-level" style={{ color: docColor }} title={docLabel}>
                <span className="ws-zone-doc-dot" style={{ background: docColor }} />
                {docLabel}
            </div>
        </button>
    );
}

// ---------------------------------------------------------------------------
// ZoneCompleteSummary — project-level progress bar
// ---------------------------------------------------------------------------

interface ZoneCompleteSummaryProps {
    zones: Zone[];
    assetCounts: Record<string, number>;
    observationCountsByZone: Record<string, number>;
    interpretationCountsByZone: Record<string, number>;
}

function ZoneCompleteSummary({
    zones,
    assetCounts,
    observationCountsByZone,
    interpretationCountsByZone,
}: ZoneCompleteSummaryProps) {
    const counts: Record<ZoneDocLevel, number> = { empty: 0, assets_only: 0, observed: 0, interpreted: 0 };
    for (const z of zones) {
        const lvl = computeZoneDocLevel(
            assetCounts[z.id] ?? 0,
            observationCountsByZone[z.id] ?? 0,
            interpretationCountsByZone[z.id] ?? 0,
        );
        counts[lvl]++;
    }
    const total = zones.length;
    if (total === 0) return null;

    return (
        <div className="ws-completeness-bar">
            <div className="ws-completeness-track" title="Dokumentationsfortschritt aller Zonen">
                {(['interpreted', 'observed', 'assets_only', 'empty'] as ZoneDocLevel[]).map((lvl) => {
                    const pct = (counts[lvl] / total) * 100;
                    if (pct === 0) return null;
                    return (
                        <div
                            key={lvl}
                            className="ws-completeness-segment"
                            style={{ width: `${pct}%`, background: ZONE_DOC_LEVEL_COLOR[lvl] }}
                            title={`${ZONE_DOC_LEVEL_LABEL[lvl]}: ${counts[lvl]}`}
                        />
                    );
                })}
            </div>
            <div className="ws-completeness-legend">
                {counts.interpreted > 0 && <span style={{ color: ZONE_DOC_LEVEL_COLOR.interpreted }}>✓ {counts.interpreted} interpretiert</span>}
                {counts.observed > 0 && <span style={{ color: ZONE_DOC_LEVEL_COLOR.observed }}>● {counts.observed} beobachtet</span>}
                {counts.assets_only > 0 && <span style={{ color: ZONE_DOC_LEVEL_COLOR.assets_only }}>◐ {counts.assets_only} mit Medien</span>}
                {counts.empty > 0 && <span style={{ color: '#90a4ae' }}>○ {counts.empty} leer</span>}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// ZoneList
// ---------------------------------------------------------------------------

interface ZoneListProps {
    zones: Zone[];
    assetCounts: Record<string, number>;
    claimCountsByZone: Record<string, number>;
    questionCountsByZone: Record<string, number>;
    observationCountsByZone: Record<string, number>;
    interpretationCountsByZone?: Record<string, number>;
    selectedZoneId: string | null;
    onSelectZone: (id: string) => void;
}

export function ZoneList({
    zones,
    assetCounts,
    claimCountsByZone,
    questionCountsByZone,
    observationCountsByZone,
    interpretationCountsByZone = {},
    selectedZoneId,
    onSelectZone,
}: ZoneListProps) {
    return (
        <div className="ws-zone-list">
            <ZoneCompleteSummary
                zones={zones}
                assetCounts={assetCounts}
                observationCountsByZone={observationCountsByZone}
                interpretationCountsByZone={interpretationCountsByZone}
            />
            {zones.map((z) => (
                <ZoneListItem
                    key={z.id}
                    zone={z}
                    assetCount={assetCounts[z.id] ?? 0}
                    claimCount={claimCountsByZone[z.id] ?? 0}
                    questionCount={questionCountsByZone[z.id] ?? 0}
                    observationCount={observationCountsByZone[z.id] ?? 0}
                    interpretationCount={interpretationCountsByZone[z.id] ?? 0}
                    isSelected={z.id === selectedZoneId}
                    onClick={() => onSelectZone(z.id)}
                />
            ))}
        </div>
    );
}
