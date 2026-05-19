# Domain Model: Workshop-Assessment

**Version:** 0.2.0 — aktualisiert 2026-05-17  
**Implementierungsstand:** vollständig in `src/domain/workshop/types.ts`, Persistenz via Dexie v4 (IndexedDB, Schema v3)

Dieses Dokument beschreibt das Fachmodell für das digitale Workshop-Assessment-System. Es gilt für den Eiermann-Campus als ersten Anwendungsfall und ist auf andere Projekte übertragbar.

---

## Überblick: Zentrale Domain-Objekte und Evidenzfluss

```
Project
  └── Site
        ├── Zone[]
        │     ├── Place[]
        │     ├── Asset[]              ← Belege, nicht nur Dateien
        │     ├── Observation[]        ← was ist sichtbar/dokumentiert
        │     ├── Interpretation[]     ← Deutung aus Beobachtungen (NEU: zoneId)
        │     ├── Claim[]              ← geprüfte/prüfbare Aussagen
        │     ├── Question[]           ← offene Prüffragen (Arbeitsobjekte)
        │     └── Memory[]             ← Erinnerungen / Nachlassmaterial
        ├── EventPhase[]
        ├── Assessment[]
        ├── Scenario[]
        └── WorkshopScene[]
```

**Evidenzfluss:**

```
Place / Zone → Asset → Observation → Interpretation → Claim
                                                        ↓
                                                   Question → Assessment
                                                                  ↓
                                                             Scenario → WorkshopScene → Export
```

---

## Erkenntnistypen (EpistemicType)

```typescript
type EpistemicType =
  | 'verified_fact'    // geprüfte historische Tatsache, mit belastbarer Quelle
  | 'observation'      // konkret beobachtet, beschrieben, dokumentiert
  | 'interpretation'   // Deutung aus Beobachtungen, rückführbar
  | 'memory'           // persönliche Erinnerung oder Zeitzeugenaussage
  | 'hypothesis'       // fachliche Annahme, plausibel, ungeprüft
  | 'disputed_claim'   // strittige These, Gegenargumente vorhanden
  | 'open_question';   // noch nicht geklärte Prüffrage
```

**Wichtig:** Diese sieben Typen sind strikt zu unterscheiden. Eine gesicherte historische Tatsache, eine persönliche Erinnerung und eine offene Prüffrage sind nicht dasselbe.

---

## Belastbarkeit (DataConfidence)

```typescript
type DataConfidence = 'high' | 'medium' | 'low' | 'unknown';
```

---

## Sensitivity & Publication

```typescript
type SensitivityLevel =
  | 'public'              // keine Einschränkung
  | 'internal'            // nur für Projektmitglieder
  | 'sensitive_personal'  // personenbezogen, besondere Sorgfalt
  | 'restricted'          // nur für namentlich Autorisierte
  | 'unknown';            // noch nicht klassifiziert

type PublicationStatus =
  | 'publishable'           // freigegeben für öffentliche Nutzung
  | 'needs_review'          // inhaltlich zu prüfen vor Veröffentlichung
  | 'anonymize_before_use'  // personenbezogene Anteile entfernen
  | 'internal_only'         // keine Veröffentlichung geplant
  | 'do_not_publish';       // explizit gesperrt
```

**Exportregel:** Beim öffentlichen Export (`ExportMode = 'public'`) werden nur `publishable`-Inhalte ausgegeben. `do_not_publish` wird in allen Exportmodi ausgeschlossen. Memory-Einträge haben konservative Defaults (`not_released`, `internal_only`).

---

## Domain-Objekte (Typen-Referenz)

### Project

```typescript
interface WorkshopProject {
  id: string;                    // "proj-eiermann-campus"
  slug: string;
  title: string;
  description: string;
  siteId: string;
  projectMode: 'active' | 'archived' | 'reference';
  createdAt: string;             // ISO 8601
  updatedAt: string;
  version: string;
  responsibleParty?: string;
  sensitivityDefault: SensitivityLevel;
  publicationDefault: PublicationStatus;
}
```

### Site

```typescript
interface Site {
  id: string;
  projectId: string;
  name: string;
  shortDescription: string;
  address?: string;
  geocode?: { lat: number; lon: number };
  historicalSummary?: string;
  currentAccess: 'open' | 'restricted' | 'closed' | 'unknown';
  heritageStatus?: string;
  externalRefs?: { label: string; url: string }[];
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
}
```

### Zone

```typescript
interface Zone {
  id: string;                       // "z-parkdeck-1"
  siteId: string;
  name: string;
  description: string;
  spatialRef?: string;              // GeoJSON-ID oder informelle Raumbeschreibung
  documentationPriority: 'critical' | 'high' | 'medium' | 'low';
  documentationStatus: 'not_started' | 'partial' | 'complete';
  openQuestionIds: string[];        // Referenzen auf Question-Objekte
  linkedAssetIds: string[];
  linkedAssessmentIds: string[];
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
  sortOrder?: number;
}
```

### Place

```typescript
interface Place {
  id: string;
  zoneId: string;
  name: string;
  description?: string;
  placeType: 'entrance' | 'room' | 'corridor' | 'staircase' | 'facade' |
             'level' | 'vegetation' | 'route' | 'threshold' | 'technical' | 'other';
  linkedAssetIds: string[];
  geocode?: { lat: number; lon: number };
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
}
```

### Asset

Assets sind **Belege**, nicht nur Dateien. Sie müssen auffindbar, beurteilbar und selektiv exportierbar sein.

```typescript
interface Asset {
  id: string;                       // "A-000001" oder "A-{ts}-{rnd}" bei Ingest
  projectId: string;
  assetType: 'photo' | 'video' | 'scan' | 'document' | 'audio' |
             'model' | 'map' | 'sketch' | 'screenshot' | 'transcript' | 'other';
  title: string;
  description?: string;
  filePath?: string;                // Rohdatei bleibt unverändert
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  capturedAt?: string;
  digitizedAt?: string;
  source?: string;
  zoneId?: string;
  placeId?: string;
  linkedEventIds?: string[];
  linkedPersonIds?: string[];
  derivates?: { thumbnail?: string; preview?: string; transcript?: string };
  tags: string[];
  qualityRating?: 'excellent' | 'good' | 'acceptable' | 'poor';
  processingStatus: 'raw' | 'reviewed' | 'processed' | 'archived';
  sensitivityLevel: SensitivityLevel;    // ← pflicht
  publicationStatus: PublicationStatus;  // ← pflicht
  createdAt: string;
  updatedAt: string;
  // optional for future semantic search:
  embedding?: number[];
}
```

Binärdaten (Blob) werden in der separaten `assetBlobs`-Tabelle gespeichert (gleiche ID). Dies hält Metadata-Abfragen schnell und Blob-Speicher isoliert.

### Observation

Beobachtungen beschreiben — sie deuten **nicht**. `epistemic` ist auf `'observation' | 'verified_fact'` beschränkt.

```typescript
interface Observation {
  id: string;
  projectId: string;
  text: string;
  observer?: string;
  observedAt?: string;
  zoneId?: string;
  placeId?: string;
  linkedAssetIds: string[];
  epistemic: 'observation' | 'verified_fact';  // keine Interpretation hier
  confidence: DataConfidence;
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
  createdAt: string;
  // optional:
  embedding?: number[];
}
```

### Interpretation

Deutungen verdichten Beobachtungen zu einem interpretativen Rahmen — Zwischenschicht vor dem Claim. `zoneId` ermöglicht zonengebundene Abfragen (seit Schema v3).

```typescript
interface Interpretation {
  id: string;
  projectId: string;
  zoneId?: string;              // ← NEU seit Schema v3: für Zonen-Query
  text: string;
  basedOnObservationIds: string[];
  basedOnAssetIds?: string[];
  source?: string;
  confidence: DataConfidence;
  counterPositions?: string[];
  epistemic: 'interpretation' | 'hypothesis';  // kein verified_fact hier
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
  createdAt: string;
}
```

### Claim

Claims sind überprüfbare Aussagen mit Quellennachweis und Prüfstatus.

```typescript
interface Claim {
  id: string;                    // "C-000001"
  projectId: string;
  statement: string;
  claimType: 'historical' | 'spatial' | 'ecological' | 'social' |
             'technical' | 'organizational' | 'evaluative' | 'normative';
  epistemic: EpistemicType;
  confidence: DataConfidence;
  sourceRefs: string[];          // Asset-IDs oder Dokument-Referenzen
  zoneId?: string;
  eventId?: string;
  reviewStatus: 'unreviewed' | 'under_review' | 'confirmed' | 'rejected' | 'needs_revision';
  counterArguments?: string[];
  linkedQuestionIds?: string[];
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
  createdAt: string;
  updatedAt: string;
  embedding?: number[];
}
```

### Question

Offene Fragen werden **als Arbeitsobjekte geführt**, nicht als Lücken versteckt.

```typescript
interface Question {
  id: string;                    // "Q-000001"
  projectId: string;
  text: string;
  questionType: 'technical' | 'historical' | 'legal' | 'ecological' |
                'social' | 'organizational' | 'aesthetic' | 'ethical' | 'other';
  priority: 'critical' | 'high' | 'medium' | 'low';
  requiredExpertise?: string[];
  zoneId?: string;
  linkedClaimIds?: string[];
  nextCheckStep?: string;
  status: 'open' | 'in_progress' | 'answered' | 'deferred' | 'out_of_scope';
  answer?: string;
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
  createdAt: string;
  updatedAt: string;
}
```

### Memory

Erinnerungen, Zeitzeugenhinweise, Nachlassinhalte. Conservative Defaults: `not_released`, `internal_only`, `sensitive_personal`.

```typescript
interface Memory {
  id: string;                    // "M-000001"
  projectId: string;
  title: string;
  summary: string;
  sourceOrPerson?: string;       // anonymisieren, wenn sensitiv
  roleDescription?: string;
  timePeriod?: string;
  linkedAssetIds?: string[];
  zoneId?: string;
  eventId?: string;
  themes: string[];
  citability: 'freely_citable' | 'citable_with_context' | 'internal_only' | 'not_citable';
  releaseStatus: 'released' | 'pending_consent' | 'not_released';
  sensitivityLevel: SensitivityLevel;    // ← pflicht
  publicationStatus: PublicationStatus;  // ← pflicht
  createdAt: string;
}
```

**Wichtig:** Memories werden **nicht automatisch** aus internen Inhalten zu veröffentlichbarem Material. Jede Freigabe ist explizit.

### EventPhase

```typescript
interface EventPhase {
  id: string;                    // "E-ibm-hauptverwaltung"
  projectId: string;
  title: string;
  phaseType: 'planning' | 'construction' | 'operation' | 'transition' |
             'vacancy' | 'reuse' | 'workshop' | 'documentation' | 'other';
  startYear?: number;
  endYear?: number;
  description: string;
  linkedAssetIds?: string[];
  linkedClaimIds?: string[];
  sortOrder: number;
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
}
```

### Assessment

Fachliche Bewertung entlang klar benannter Kriterien, immer mit Evidenz und expliziter Unsicherheit.

```typescript
interface CampusAssessment {
  id: string;
  projectId: string;
  subjectId: string;
  subjectType: 'zone' | 'place' | 'asset' | 'scenario';
  dimensions: AssessmentDimension[];
  assessedBy?: string;
  assessedAt: string;
  notes?: string;
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
}

interface AssessmentDimension {
  criterion: 'spatial_relevance' | 'historical_value' | 'documentation_quality' |
             'workshop_relevance' | 'transformation_potential' | 'ecological_relevance' |
             'uncertainty' | 'publication_readiness' | 'decision_relevance' | 'memory_value';
  rating: 'high' | 'medium' | 'low' | 'unknown';
  rationale?: string;
  evidenceIds?: string[];
}
```

### Scenario

Szenarien sind Fragestellungen für Workshops — sie bündeln mehrere Assessments und Evidenzketten.

```typescript
interface Scenario {
  id: string;                    // "S-001"
  projectId: string;
  title: string;
  guidingQuestion: string;
  description: string;
  linkedZoneIds: string[];
  linkedAssetIds?: string[];
  linkedClaimIds?: string[];
  linkedQuestionIds?: string[];
  expectedDiscussion?: string;
  benefits?: string;
  risks?: string;
  status: 'draft' | 'ready' | 'in_use' | 'archived';
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
  createdAt: string;
}
```

### WorkshopScene

Kuratierte Sichten auf das Assessment. WorkshopScenes sind **nicht die Wahrheitsquelle**, sondern Inszenierungen für spezifische Diskussionssituationen.

```typescript
interface WorkshopScene {
  id: string;
  projectId: string;
  scenarioId?: string;
  title: string;
  guidingQuestion: string;
  dramaturgy?: string;
  selectedAssetIds: string[];    // 3–8 Assets
  contextText: string;
  observations: string[];        // Freitextbeobachtungen für die Szene
  interpretations: string[];     // Freitextdeutungen für die Szene
  openQuestions: string[];
  discussionPrompt: string;
  targetAudience?: string;
  exportStatus: 'not_ready' | 'draft' | 'ready';
  visibility: 'internal' | 'public';
  sortOrder?: number;
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;  // ← steuert Export-Sichtbarkeit
  createdAt: string;
  updatedAt: string;
}
```

---

## Seed-Datenstand (Eiermann-Campus, 2026-05-17)

| Entität | Anzahl | Dateipfad |
|---------|--------|-----------|
| Project | 1 | `examples/eiermann/project.json` |
| Site | 1 | `examples/eiermann/site.json` |
| Zone | 12 | `examples/eiermann/zones.json` |
| EventPhase | 8 | `examples/eiermann/event_phases.json` |
| Claim | 5 | `examples/eiermann/claims.json` |
| Question | 8 | `examples/eiermann/questions.json` |
| Memory | 3 | `examples/eiermann/memories.json` |
| Observation (Seed) | 6 | `examples/eiermann/observations.json` |
| WorkshopScene | 5 | `examples/eiermann/workshop_scenes.json` |
| Asset | 0 (leer) | via Asset-Ingest UI |
| Interpretation | 0 (leer) | via InterpretationPanel UI |

---

## Datenbank-Indizes (Dexie Schema v3)

```
projects:       id, slug, projectMode
sites:          id, projectId
zones:          id, siteId, documentationPriority, documentationStatus
places:         id, zoneId, placeType
assets:         id, projectId, zoneId, placeId, assetType, sensitivityLevel, publicationStatus, processingStatus, capturedAt
observations:   id, projectId, zoneId, placeId, epistemic, confidence
interpretations: id, projectId, zoneId, epistemic, confidence
claims:         id, projectId, zoneId, eventId, claimType, epistemic, reviewStatus, sensitivityLevel
questions:      id, projectId, zoneId, questionType, priority, status
memories:       id, projectId, zoneId, eventId, releaseStatus, sensitivityLevel
eventPhases:    id, projectId, phaseType, sortOrder
assessments:    id, projectId, subjectId, subjectType
scenarios:      id, projectId, status
workshopScenes: id, projectId, scenarioId, exportStatus, visibility, sortOrder
assetBlobs:     id
```

---

## Validierungsregeln (Implementierungsstand)

- `sensitivityLevel` und `publicationStatus` sind auf allen exportrelevanten Entitäten Pflicht
- `epistemic` begrenzt den Erkenntnistyp: Observations können keine Interpretationen sein, Interpretations keine verified_facts
- Memory-Einträge erhalten beim Anlegen konservative Defaults (`sensitivityLevel: 'sensitive_personal'`, `releaseStatus: 'not_released'`)
- `publicationStatus === 'do_not_publish'` blockiert alle Exportmodi
- WorkshopScene-Export filtert strikt nach `publicationStatus` (keine impliziten Freigaben)

---

## Erweiterungsrichtungen (strukturell vorbereitet)

| Richtung | Vorbereitung | Notizen |
|----------|-------------|---------|
| GIS/GeoJSON | `spatialRef`, `geocode` auf Zone + Place | Zone-GeoJSON bereits in `public/zone_geometry.json` |
| BIM/IFC | `linkedAssetIds` auf Zonen; IFC-Adapter in `src/domain/` | `ifcMetadataAdapter.ts` vorhanden |
| Semantische Suche | `embedding?: number[]` auf Asset/Claim/Observation | Transformers.js geplant, kein Index |
| PostgreSQL/PostGIS | WorkshopProjectBundle als Migrationspfad | Alle IDs stabil als Strings |
| Mehrprojekt | `projectId` auf allen Domain-Objekten | kein hardcoded Eiermann-Bezug im Schema |

Dieses Dokument beschreibt das Fachmodell für das digitale Workshop-Assessment-System. Es gilt für den Eiermann-Campus als ersten Anwendungsfall und ist auf andere Projekte übertragbar.

---

## Überblick: Zentrale Domain-Objekte

```
Project
  └── Site
        ├── Zone[]
        │     ├── Place[]
        │     ├── Asset[]
        │     ├── Observation[]
        │     ├── Claim[]
        │     └── Question[]
        ├── EventPhase[]
        ├── Memory[]
        ├── Assessment[]
        ├── Scenario[]
        └── WorkshopScene[]
```

---

## Erkenntnistypen (EpistemicType)

```typescript
type EpistemicType =
  | 'verified_fact'    // geprüfte historische Tatsache, mit belastbarer Quelle
  | 'observation'      // konkret beobachtet, beschrieben, dokumentiert
  | 'interpretation'   // Deutung aus Beobachtungen, rückführbar
  | 'memory'           // persönliche Erinnerung oder Zeitzeugenaussage
  | 'hypothesis'       // fachliche Annahme, plausibel, ungeprüft
  | 'disputed_claim'   // strittige These, Gegenargumente vorhanden
  | 'open_question';   // noch nicht geklärte Prüffrage
```

---

## Sensitivity & Publication

```typescript
type SensitivityLevel =
  | 'public'              // keine Einschränkung
  | 'internal'            // nur für Projektmitglieder
  | 'sensitive_personal'  // personenbezogen, besondere Sorgfalt
  | 'restricted'          // nur für namentlich Autorisierte
  | 'unknown';            // noch nicht klassifiziert

type PublicationStatus =
  | 'publishable'           // freigegeben für öffentliche Nutzung
  | 'needs_review'          // inhaltlich zu prüfen vor Veröffentlichung
  | 'anonymize_before_use'  // personenbezogene Anteile entfernen
  | 'internal_only'         // keine Veröffentlichung geplant
  | 'do_not_publish';       // explizit gesperrt
```

---

## Domain-Objekte (Typen-Referenz)

### Project

Repräsentiert ein Assessment-Projekt.

```typescript
interface Project {
  id: string;                    // stabile ID, z.B. "proj-eiermann-campus"
  slug: string;                  // URL-fähig, z.B. "eiermann-campus"
  title: string;
  description: string;
  siteId: string;
  projectMode: 'active' | 'archived' | 'reference';
  createdAt: string;             // ISO 8601
  updatedAt: string;
  version: string;
  responsibleParty?: string;
  sensitivityDefault: SensitivityLevel;
  publicationDefault: PublicationStatus;
}
```

### Site

Repräsentiert das Areal als fachlichen Gegenstand.

```typescript
interface Site {
  id: string;
  projectId: string;
  name: string;
  shortDescription: string;
  address?: string;
  geocode?: { lat: number; lon: number };
  historicalSummary?: string;
  currentAccess: 'open' | 'restricted' | 'closed' | 'unknown';
  heritageStatus?: string;       // z.B. "Kulturdenkmal nach §2 DSchG BW"
  externalRefs?: { label: string; url: string }[];
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
}
```

### Zone

Repräsentiert einen räumlichen Bereich des Areals.

```typescript
interface Zone {
  id: string;                    // z.B. "z-parkdeck-1"
  siteId: string;
  name: string;
  description: string;
  spatialRef?: string;           // GeoJSON-ID oder informelle Raumbeschreibung
  documentationPriority: 'critical' | 'high' | 'medium' | 'low';
  documentationStatus: 'not_started' | 'partial' | 'complete';
  openQuestions: string[];       // IDs offener Questions
  linkedAssetIds: string[];
  linkedAssessmentIds: string[];
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
  sortOrder?: number;
}
```

### Place

Repräsentiert einen konkreten Ort innerhalb einer Zone.

```typescript
interface Place {
  id: string;
  zoneId: string;
  name: string;
  description?: string;
  placeType: 'entrance' | 'room' | 'corridor' | 'staircase' | 'facade' |
             'level' | 'vegetation' | 'route' | 'threshold' | 'technical' | 'other';
  linkedAssetIds: string[];
  geocode?: { lat: number; lon: number };
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
}
```

### Asset

Repräsentiert jedes digitale oder digitalisierte Material. Assets sind Belege, nicht nur Dateien.

```typescript
interface Asset {
  id: string;                    // stabile ID, z.B. "A-000001"
  projectId: string;
  assetType: 'photo' | 'video' | 'scan' | 'document' | 'audio' |
             'model' | 'map' | 'sketch' | 'screenshot' | 'transcript' | 'other';
  title: string;
  description?: string;
  filePath?: string;             // relativer Pfad, Rohdatei unverändert
  fileName?: string;
  fileSize?: number;             // Bytes
  mimeType?: string;
  capturedAt?: string;           // Aufnahmedatum (ISO 8601)
  digitizedAt?: string;          // Digitalisierungsdatum, falls verschieden
  source?: string;               // Urheber, Institution, Person
  zoneId?: string;
  placeId?: string;
  linkedEventIds?: string[];
  linkedPersonIds?: string[];
  derivates?: {
    thumbnail?: string;
    preview?: string;
    transcript?: string;
    compressed?: string;
  };
  tags: string[];
  qualityRating?: 'excellent' | 'good' | 'acceptable' | 'poor';
  processingStatus: 'raw' | 'reviewed' | 'processed' | 'archived';
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
  createdAt: string;
  updatedAt: string;
}
```

### Observation

Repräsentiert eine konkrete, beschreibende Beobachtung — ohne Deutung.

```typescript
interface Observation {
  id: string;
  projectId: string;
  text: string;                  // "Die Vegetation wächst in Fugen des Parkdecks."
  observer?: string;
  observedAt?: string;
  zoneId?: string;
  placeId?: string;
  linkedAssetIds: string[];
  epistemic: Extract<EpistemicType, 'observation' | 'verified_fact'>;
  confidence: DataConfidence;
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
  createdAt: string;
}
```

### Interpretation

Repräsentiert eine Deutung, die auf Beobachtungen aufbaut.

```typescript
interface Interpretation {
  id: string;
  projectId: string;
  text: string;                  // "Das Parkdeck ist ein transformierbarer Rohling."
  basedOnObservationIds: string[];
  basedOnAssetIds?: string[];
  source?: string;
  confidence: DataConfidence;
  counterPositions?: string[];
  epistemic: 'interpretation' | 'hypothesis';
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
  createdAt: string;
}
```

### Claim

Repräsentiert eine überprüfbare Aussage mit Quellennachweis und Sicherheitsgrad.

```typescript
interface Claim {
  id: string;                    // z.B. "C-000001"
  projectId: string;
  statement: string;
  claimType: 'historical' | 'spatial' | 'ecological' | 'social' |
             'technical' | 'organizational' | 'evaluative' | 'normative';
  epistemic: EpistemicType;
  confidence: DataConfidence;
  sourceRefs: string[];          // Asset-IDs, Dokument-Verweise
  zoneId?: string;
  eventId?: string;
  reviewStatus: 'unreviewed' | 'under_review' | 'confirmed' | 'rejected' | 'needs_revision';
  counterArguments?: string[];
  linkedQuestionIds?: string[];
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
  createdAt: string;
  updatedAt: string;
}
```

### Question

Repräsentiert eine offene Prüffrage — als Arbeitsobjekt geführt, nicht als Lücke versteckt.

```typescript
interface Question {
  id: string;                    // z.B. "Q-000001"
  projectId: string;
  text: string;
  questionType: 'technical' | 'historical' | 'legal' | 'ecological' |
                'social' | 'organizational' | 'aesthetic' | 'ethical' | 'other';
  priority: 'critical' | 'high' | 'medium' | 'low';
  requiredExpertise?: string[];
  zoneId?: string;
  linkedClaimIds?: string[];
  nextCheckStep?: string;
  status: 'open' | 'in_progress' | 'answered' | 'deferred' | 'out_of_scope';
  answer?: string;
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
  createdAt: string;
  updatedAt: string;
}
```

### Memory

Repräsentiert Erinnerungen, Zeitzeugenhinweise und Nachlassinhalte.

```typescript
interface Memory {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  sourceOrPerson?: string;       // anonym, wenn sensitiv
  roleDescription?: string;      // Funktion ohne Namensnennung
  timePeriod?: string;
  linkedAssetIds?: string[];
  zoneId?: string;
  eventId?: string;
  themes: string[];
  citability: 'freely_citable' | 'citable_with_context' | 'internal_only' | 'not_citable';
  releaseStatus: 'released' | 'pending_consent' | 'not_released';
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
  createdAt: string;
}
```

### EventPhase

Repräsentiert historische Phasen und Ereignisse.

```typescript
interface EventPhase {
  id: string;
  projectId: string;
  title: string;
  phaseType: 'planning' | 'construction' | 'operation' | 'transition' |
             'vacancy' | 'reuse' | 'workshop' | 'documentation' | 'other';
  startYear?: number;
  endYear?: number;
  description: string;
  linkedAssetIds?: string[];
  linkedClaimIds?: string[];
  sortOrder: number;
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
}
```

### CampusAssessment

Repräsentiert eine fachliche Bewertung entlang mehrerer Dimensionen.

```typescript
interface CampusAssessment {
  id: string;
  projectId: string;
  subjectId: string;             // Zone-, Place- oder Asset-ID
  subjectType: 'zone' | 'place' | 'asset' | 'scenario';
  dimensions: AssessmentDimension[];
  assessedBy?: string;
  assessedAt: string;
  notes?: string;
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
}

interface AssessmentDimension {
  criterion: 'spatial_relevance' | 'historical_value' | 'documentation_quality' |
             'workshop_relevance' | 'transformation_potential' | 'ecological_relevance' |
             'uncertainty' | 'publication_readiness' | 'decision_relevance' | 'memory_value';
  rating: 'high' | 'medium' | 'low' | 'unknown';
  rationale?: string;
  evidenceIds?: string[];
}
```

### Scenario

Repräsentiert eine mögliche Entwicklungsrichtung oder Prüfsituation.

```typescript
interface Scenario {
  id: string;                    // z.B. "S-001"
  projectId: string;
  title: string;
  guidingQuestion: string;
  description: string;
  linkedZoneIds: string[];
  linkedAssetIds?: string[];
  linkedClaimIds?: string[];
  linkedQuestionIds?: string[];
  expectedDiscussion?: string;
  benefits?: string;
  risks?: string;
  status: 'draft' | 'ready' | 'in_use' | 'archived';
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
  createdAt: string;
}
```

### WorkshopScene

Repräsentiert eine kuratierte, präsentierbare Szene für den Workshop-Modus.

```typescript
interface WorkshopScene {
  id: string;
  projectId: string;
  scenarioId?: string;
  title: string;
  guidingQuestion: string;
  dramaturgy?: string;           // narrative Führung durch die Szene
  selectedAssetIds: string[];    // 3–8 Assets
  selectedObservationIds?: string[];
  selectedClaimIds?: string[];
  selectedQuestionIds?: string[];
  contextText: string;           // Hintergrundinformation
  observations: string[];        // Beobachtungstexte
  interpretations: string[];     // Deutungstexte
  openQuestions: string[];       // Prüffragen-Texte oder IDs
  discussionPrompt: string;      // Einstiegsfrage für Diskussion
  targetAudience?: string;
  exportStatus: 'not_ready' | 'draft' | 'ready';
  visibility: 'internal' | 'public';
  sortOrder?: number;
  sensitivityLevel: SensitivityLevel;
  publicationStatus: PublicationStatus;
  createdAt: string;
  updatedAt: string;
}
```

Hinweis: Die optionalen Referenzfelder erlauben dem Minimal Scene Editor, ausgewählte Beobachtungen, Claims und Fragen nachvollziehbar zu speichern. Viewer und HTML-Export rendern derzeit weiterhin kuratierte Textlisten; die Referenzauflösung als Evidenzkarten bleibt eine spätere Ausbaustufe.

---

## Beziehungs-Muster

```
Site
  ↳ Zone (1:N)
      ↳ Place (1:N)
      ↳ Asset (M:N via zoneId/placeId)
      ↳ Observation (M:N)
      ↳ Claim (M:N)
      ↳ Question (M:N)

Asset → Observation (belegt)
Observation → Interpretation (stützt)
Interpretation → Claim (verdichtet)
Claim → Question (wirft auf)
Claim + Question + Asset → Assessment (bewertet)
Assessment → Scenario (begründet)
Scenario + Asset → WorkshopScene (kuratiert)
WorkshopScene → Export (veröffentlicht/intern)

Memory → Asset (primäre Quelle)
Memory → Zone / Place / EventPhase (verknüpft)
EventPhase → Asset, Claim (historisch belegt)
```

---

## ID-Konventionen

| Typ | Format | Beispiel |
|---|---|---|
| Asset | `A-XXXXXX` (6-stellig) | `A-000001` |
| Claim | `C-XXXXXX` | `C-000001` |
| Question | `Q-XXXXXX` | `Q-000001` |
| Scenario | `S-XXX` | `S-001` |
| Zone | `z-{slug}` | `z-parkdeck-1` |
| Place | `p-{slug}` | `p-nucos-buero` |
| Memory | `M-XXXXXX` | `M-000001` |
| Event/Phase | `E-{slug}` | `E-ibm-hauptverwaltung` |

---

## Wichtige Invarianten

1. **Keine Beobachtung ohne räumlichen oder zeitlichen Bezug.**
2. **Kein Claim ohne mindestens eine Quellreferenz (Asset-ID oder Textquelle).**
3. **Kein Asset ohne Sensitivity-Level (Standard: `'unknown'`).**
4. **Kein öffentlicher Export von Assets mit `sensitive_personal` oder `restricted`.**
5. **Erinnerungen sind nicht automatisch zitierbar.**
6. **Hypothesen werden nie wie Fakten dargestellt.**
