import { CombinedHullMetricsPanel } from '@/features/assessment/CombinedHullMetricsPanel';
import { EvidenceInspectionPanel } from '@/features/assessment/EvidenceInspectionPanel';
import { BuildingCandidateTable } from '@/features/building-hull-import/BuildingCandidateTable';
import { BuildingEvidencePanel } from '@/features/building-hull-import/BuildingEvidencePanel';
import { ConfirmedObjectPanel } from '@/features/building-hull-import/ConfirmedObjectPanel';
import { SurfaceMetricsTable } from '@/features/building-hull-import/SurfaceMetricsTable';
import { fetchedGeodataSummary } from '@/features/building-hull-import/fetchedGeodataSummary';
import { lod2CandidateGeometry } from '@/features/building-hull-import/generated/lod2CandidateGeometry';
import { Part1ElementPlanPanel } from '@/features/building-parts/Part1ElementPlanPanel';
import { Part1SectionDrawingsPanel } from '@/features/building-parts/Part1SectionDrawingsPanel';
import { DataInventoryPanel } from '@/features/data-inventory/DataInventoryPanel';
import { buildProjectInventory } from '@/features/data-inventory/buildProjectInventory';
import { dataInventorySeed } from '@/features/data-inventory/dataInventorySeed';
import { InspectionShotListPanel } from '@/features/deconstruction/InspectionShotListPanel';
import { MaterialReusePanel } from '@/features/deconstruction/MaterialReusePanel';
import { SolarPvPlanPanel } from '@/features/deconstruction/SolarPvPlanPanel';
import { IFCViewerPanel } from '@/features/ifc-viewer/IFCViewerPanel';
import { type ImportedTerrainData } from '@/features/lod2-derived/fetchTerrainProfile';
import { generateCombinedIfcStep } from '@/features/lod2-derived/generateLod2Ifc';
import { ImportedSiteMapPanel } from '@/features/map-view/ImportedSiteMapPanel';
import { LocationContextPanel } from '@/features/map-view/LocationContextPanel';
import { MetadataExplorerPanel } from '@/features/metadata/MetadataExplorerPanel';
import { NewProjectWizard } from '@/features/new-project/NewProjectWizard';
import { ProjectHome, type BuiltinProject } from '@/features/project-home/ProjectHome';
import { ProjectProvider, useProject } from '@/features/project-store/ProjectContext';
import { listProjects, loadProject } from '@/features/project-store/projectStore';
import type { ImportedProject, Lod2Candidate } from '@/features/project-store/types';
import { AssessmentReadinessPanel } from '@/features/renovation-dashboard/AssessmentReadinessPanel';
import { MissingMeasurementsPanel } from '@/features/renovation-dashboard/MissingMeasurementsPanel';
import { RenovationPlanningPanel } from '@/features/renovation-planning/RenovationPlanningPanel';
import { ScenarioRegistryPanel } from '@/features/scenarios/ScenarioRegistryPanel';
import { ShowcaseRoute } from '@/features/showcase/ShowcaseRoute';
import { TerrainCrossSectionEWPanel } from '@/features/terrain/TerrainCrossSectionEWPanel';
import { TerrainCrossSectionPanel } from '@/features/terrain/TerrainCrossSectionPanel';
import { TerrainSamplingPanel } from '@/features/terrain/TerrainSamplingPanel';
import { LoD2SurfaceViewer } from '@/features/three-viewer/LoD2SurfaceViewer';
import { WorkshopQuickStartDialog } from '@/features/workshop/WorkshopQuickStartDialog';
import { WorkshopRoute, type WorkshopFocusRequest } from '@/features/workshop/WorkshopRoute';
import { BulkImportPanel } from '@/features/workshop/components/BulkImportPanel';
import { GpsMetadataPanel } from '@/features/workshop/components/GpsMetadataPanel';
import { Workshop3DPanel } from '@/features/workshop/components/Workshop3DPanel';
import { WorkshopMapPanel } from '@/features/workshop/components/WorkshopMapPanel';
import { seedProject } from '@/features/workshop/db/seedLoader';
import { type QuickStartResult } from '@/features/workshop/db/workshopDb';
import { useGpsAssets, useZones } from '@/features/workshop/hooks/useWorkshopData';
import { BrainCircuit, Building2, CheckCircle2, Circle, ClipboardList, Combine, Compass, Database, FolderOpen, Home, Layers, MapPinned, Mountain, Play, Plus, ShieldCheck, Upload, Wrench, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCandidateSelection } from './hooks/useCandidateSelection';
import { useIfcGeneration } from './hooks/useIfcGeneration';
import { useTerrainData } from './hooks/useTerrainData';

const demoLabel = import.meta.env.VITE_PROJECT_LABEL || 'Mein Projekt';

type AppMode = 'home' | 'renovation' | 'workshop';
type Section = 'planning' | 'building' | 'site' | 'assessment' | 'data';
type AssessmentTab = 'hull' | 'reuse' | 'shots' | 'readiness' | 'evidence' | 'data';

export function App() {
  if (window.location.pathname === '/showcase') {
    return <ShowcaseRoute />;
  }

  return (
    <ProjectProvider>
      <HauskompassApp />
    </ProjectProvider>
  );
}

// ── Top-level mode router ────────────────────────────────────────────────────

function HauskompassApp() {
  const { activeProject, activateProject, deactivateProject } = useProject();
  const [appMode, setAppMode] = useState<AppMode>(() =>
    activeProject ? 'renovation' : 'home',
  );
  const [showNewProject, setShowNewProject] = useState(false);
  const [showWorkshopQuickStart, setShowWorkshopQuickStart] = useState(false);
  const [activeWorkshopProject, setActiveWorkshopProject] = useState<BuiltinProject | null>(null);

  const goHome = () => setAppMode('home');

  const handleSelectBuiltin = (project: BuiltinProject) => {
    if (project.type === 'workshop') {
      setActiveWorkshopProject(project);
      setAppMode('workshop');
      return;
    }
    deactivateProject();
    setAppMode('renovation');
  };

  const handleSelectRenovation = (slug: string) => {
    activateProject(slug);
    setAppMode('renovation');
  };

  const handleQuickStartWorkshop = (result: QuickStartResult) => {
    setShowWorkshopQuickStart(false);
    setActiveWorkshopProject({
      id: result.projectId,
      projectId: result.projectId,
      siteId: result.siteId,
      title: result.title,
      subtitle: 'Schnell-Start',
      type: 'workshop',
      location: '',
      description: '',
    });
    setAppMode('workshop');
  };

  const handleImportBackup = (projectId: string, siteId: string, title: string) => {
    setActiveWorkshopProject({
      id: projectId,
      projectId,
      siteId,
      title,
      subtitle: 'Aus Backup importiert',
      type: 'workshop',
      location: '',
      description: '',
    });
    setAppMode('workshop');
  };

  // Workshop full-screen mode
  if (appMode === 'workshop') {
    return <WorkshopApp onGoHome={goHome} project={activeWorkshopProject} />;
  }

  // Home screen mode
  if (appMode === 'home') {
    return (
      <>
        {showWorkshopQuickStart && (
          <WorkshopQuickStartDialog
            onStarted={handleQuickStartWorkshop}
            onClose={() => setShowWorkshopQuickStart(false)}
          />
        )}
        {showNewProject && (
          <NewProjectWizard
            onClose={() => setShowNewProject(false)}
            onProjectActivated={(slug) => {
              activateProject(slug);
              setShowNewProject(false);
              setAppMode('renovation');
            }}
          />
        )}
        <ProjectHome
          onSelectBuiltin={handleSelectBuiltin}
          onSelectRenovation={handleSelectRenovation}
          onNewProject={() => setShowNewProject(true)}
          onStartWorkshop={() => setShowWorkshopQuickStart(true)}
          onImportBackup={handleImportBackup}
        />
      </>
    );
  }

  // Renovation mode
  return <RenovationApp onGoHome={goHome} />;
}

function RenovationApp({ onGoHome }: { onGoHome: () => void }) {
  const { activeProject, activateProject, deactivateProject, updateProject } = useProject();
  const [showNewProject, setShowNewProject] = useState(false);
  const [showProjectDrawer, setShowProjectDrawer] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('site');
  const [siteTab, setSiteTab] = useState<'evidence' | 'terrain' | 'crosssection' | 'crosssectionew'>('evidence');
  const [buildingTab, setBuildingTab] = useState<'lod2' | 'parts' | 'sections' | 'ifc'>('lod2');
  const [assessmentTab, setAssessmentTab] = useState<AssessmentTab>('hull');

  const { terrainData, terrainFetchState, terrainFetchError, fetchTerrain } = useTerrainData(activeProject);
  const {
    selectedCandidateId,
    setSelectedCandidateId,
    effectiveCandidateId,
    selectedCandidate,
    activeCandidates,
    confirmedCandidates,
    runtimeCandidates,
    runtimeConfirmedIds,
  } = useCandidateSelection(activeProject);
  const { lod2IfcContent, setGenerated, resetGeneration } = useIfcGeneration();

  const projectLabel = activeProject ? activeProject.address : demoLabel;
  const isImportedProject = !!activeProject;

  // Detail-Tabs (Elemente/Ansichten) nur anzeigen wenn IFC generiert oder Demo-Modus
  const showDetailTabs = !isImportedProject || lod2IfcContent !== null;

  const availableSources = dataInventorySeed.filter((item) => item.status === 'candidate' || item.status === 'available').length;

  useEffect(() => {
    if (!showProjectDrawer) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowProjectDrawer(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showProjectDrawer]);

  // Reset IFC-Generierung beim Projekt-Wechsel
  useEffect(() => {
    resetGeneration();
    setBuildingTab('lod2');
  }, [activeProject?.slug]);

  // Zurück auf LoD2 wenn Detail-Tabs ausgeblendet werden (Projekt ohne IFC)
  useEffect(() => {
    if (!showDetailTabs && (buildingTab === 'parts' || buildingTab === 'sections')) {
      setBuildingTab('lod2');
    }
  }, [showDetailTabs, buildingTab]);

  return (
    <div className="app-shell">
      {/* ── New-project wizard overlay ── */}
      {showNewProject && (
        <NewProjectWizard
          onClose={() => setShowNewProject(false)}
          onProjectActivated={(slug) => {
            activateProject(slug);
            // Wizard stays open to show Step 4 "Zur Projektansicht"
          }}
        />
      )}

      {showProjectDrawer && (
        <div className="project-drawer-overlay" onClick={() => setShowProjectDrawer(false)}>
          <div className="project-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="sidebar-header">
              <button
                className="project-drawer-close"
                onClick={() => setShowProjectDrawer(false)}
                title="Schließen"
                type="button"
              >
                <X size={16} />
              </button>
              <p className="eyebrow">{isImportedProject ? 'Importiertes Projekt' : 'Demo-Modus'}</p>
              <h1 title={projectLabel}>{projectLabel}</h1>
              <div className="privacy-pill">
                <ShieldCheck size={13} />
                Local-first · keine Adresse übertragen
              </div>
            </div>
            {listProjects().filter(slug => slug !== activeProject?.slug).map(slug => {
              const proj = loadProject(slug);
              if (!proj) return null;
              return (
                <button
                  key={slug}
                  className="sidebar-demo-btn"
                  onClick={() => { activateProject(slug); setShowProjectDrawer(false); }}
                  title={proj.address}
                  type="button"
                >
                  <FolderOpen size={12} />
                  {proj.address}
                </button>
              );
            })}
            <button
              className="sidebar-demo-btn"
              onClick={() => { setShowProjectDrawer(false); onGoHome(); }}
              title="Zur Projektstartseite"
              type="button"
            >
              <Home size={12} />
              Zur Startseite
            </button>
            <button
              className="sidebar-new-project-btn"
              onClick={() => { setShowNewProject(true); setShowProjectDrawer(false); }}
              title="Neues Projekt für eine andere Adresse einrichten"
              type="button"
            >
              <Plus size={13} />
              Neues Projekt anlegen
            </button>
            <div className="sidebar-footer">
              <button
                className="sidebar-stat sidebar-stat-link"
                onClick={() => { setActiveSection('data'); setShowProjectDrawer(false); }}
                type="button"
              >
                <span className="sidebar-stat-label">Datenquellen bereit</span>
                <strong className="sidebar-stat-value">{availableSources}&thinsp;/&thinsp;{dataInventorySeed.length} →</strong>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Icon rail ── */}
      <nav className="nav-rail">
        <button
          className={`nav-rail-logo${showProjectDrawer ? ' nav-rail-logo-active' : ''}`}
          onClick={() => setShowProjectDrawer((v) => !v)}
          title="Projektinformationen"
          type="button"
        >
          <Compass size={22} />
        </button>
        <div className="nav-rail-nav">
          <button
            className={`nav-icon-btn${activeSection === 'site' ? ' nav-icon-btn-active' : ''}`}
            data-label="Lage"
            onClick={() => setActiveSection('site')}
            type="button"
          >
            <MapPinned size={20} />
          </button>
          <button
            className={`nav-icon-btn${activeSection === 'building' ? ' nav-icon-btn-active' : ''}`}
            data-label="Gebäude"
            onClick={() => setActiveSection('building')}
            type="button"
          >
            <Building2 size={20} />
          </button>
          <button
            className={`nav-icon-btn${activeSection === 'assessment' ? ' nav-icon-btn-active' : ''}`}
            data-label="Bewertung"
            onClick={() => setActiveSection('assessment')}
            type="button"
          >
            <ClipboardList size={20} />
          </button>
          <button
            className={`nav-icon-btn${activeSection === 'planning' ? ' nav-icon-btn-active' : ''}`}
            data-label="Planung"
            onClick={() => setActiveSection('planning')}
            type="button"
          >
            <BrainCircuit size={20} />
          </button>
          <button
            className={`nav-icon-btn${activeSection === 'data' ? ' nav-icon-btn-active' : ''}`}
            data-label="Daten"
            onClick={() => setActiveSection('data')}
            type="button"
          >
            <Database size={20} />
          </button>
        </div>
        <div className="nav-rail-footer">
          <button
            className="nav-icon-btn"
            data-label="Startseite"
            onClick={onGoHome}
            title="Zurück zur Startseite"
            type="button"
          >
            <Home size={18} />
          </button>
          <button
            className="nav-rail-add"
            data-label="Neues Projekt"
            onClick={() => setShowNewProject(true)}
            title="Neues Projekt anlegen"
            type="button"
          >
            <Plus size={18} />
          </button>
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="main-content">

        {/* Planning section — agentic renovation planning surface */}
        {activeSection === 'planning' && (
          <div className="section-page">
            <header className="section-header">
              <h2 className="section-title">Planung — Renovierungsplanung</h2>
            </header>
            <RenovationPlanningPanel project={activeProject} />
          </div>
        )}

        {/* Building section — LoD2 viewer + IFC viewer */}
        {activeSection === 'building' && (
          <div className="section-page">
            <header className="section-header">
              <h2 className="section-title">Gebäude — {isImportedProject ? activeProject.address : 'LoD2 Geometrie'}</h2>
            </header>

            {/* Tab-Leiste (ohne Teil-Selektor — alle Gebäude werden gemeinsam dargestellt) */}
            <div className="building-tab-bar">
              <div className="tab-strip">
                <button
                  className={`tab-btn ${buildingTab === 'lod2' ? 'tab-btn-active' : ''}`}
                  onClick={() => setBuildingTab('lod2')}
                  type="button"
                >
                  LoD2 Ansicht
                </button>
                {showDetailTabs && (
                  <>
                    <button
                      className={`tab-btn ${buildingTab === 'parts' ? 'tab-btn-active' : ''}`}
                      onClick={() => setBuildingTab('parts')}
                      type="button"
                    >
                      Elemente
                    </button>
                    <button
                      className={`tab-btn ${buildingTab === 'sections' ? 'tab-btn-active' : ''}`}
                      onClick={() => setBuildingTab('sections')}
                      type="button"
                    >
                      Ansichten
                    </button>
                  </>
                )}
                <button
                  className={`tab-btn ${buildingTab === 'ifc' ? 'tab-btn-active' : ''}`}
                  onClick={() => setBuildingTab('ifc')}
                  type="button"
                >
                  IFC-Modell
                </button>
              </div>
            </div>

            {buildingTab === 'lod2' && (
              <div className="building-layout">
                <div className="building-viewer-wrap">
                  {/* Alle bestätigten Kandidaten im gemeinsamen Koordinatenraum */}
                  <LoD2SurfaceViewer
                    candidates={isImportedProject
                      ? (confirmedCandidates.length > 0 ? confirmedCandidates : (selectedCandidate ? [selectedCandidate] : []))
                      : undefined}
                    candidate={!isImportedProject ? selectedCandidate! : undefined}
                  />
                </div>
                <div className="building-side">
                  {isImportedProject && selectedCandidate
                    ? <>
                      <ImportedCandidateMetricsPanel candidate={selectedCandidate} />
                      <Lod2GenerateCard
                        candidates={confirmedCandidates.length > 0 ? confirmedCandidates : [selectedCandidate]}
                        address={activeProject!.address}
                        isGenerated={lod2IfcContent !== null}
                        onGenerate={(ifcContent) => {
                          setGenerated(ifcContent);
                        }}
                      />
                    </>
                    : <><CombinedHullMetricsPanel /><TerrainSamplingPanel /></>}
                </div>
              </div>
            )}

            {buildingTab === 'parts' && showDetailTabs && (
              isImportedProject && lod2IfcContent !== null
                ? <Lod2FloorPlanPanel candidate={selectedCandidate!} />
                : <Part1ElementPlanPanel />
            )}

            {buildingTab === 'sections' && showDetailTabs && (
              isImportedProject && lod2IfcContent !== null
                ? <Lod2ElevationsPanel candidate={selectedCandidate!} />
                : <Part1SectionDrawingsPanel />
            )}

            {buildingTab === 'ifc' && (
              isImportedProject && lod2IfcContent !== null
                ? <IFCViewerPanel ifcContent={lod2IfcContent} />
                : isImportedProject
                  ? <div className="panel"><PipelineRequiredHint context="ifc" /></div>
                  : <IFCViewerPanel />
            )}
          </div>
        )}

        {/* Site section — full-width map + tabbed info panels */}
        {activeSection === 'site' && (
          <div className="section-page">
            <header className="section-header">
              <h2 className="section-title">Lage — {isImportedProject ? activeProject.address : 'Demo-Standort'}</h2>
            </header>

            {!isImportedProject && (
              <div className="panel site-map-full">
                <LocationContextPanel
                  addressPoint={lod2CandidateGeometry.addressPointUtm32}
                  candidates={lod2CandidateGeometry.candidates}
                  onSelectCandidate={setSelectedCandidateId}
                  selectedCandidateId={selectedCandidateId}
                />
              </div>
            )}

            {isImportedProject && (
              <ImportedSiteMapPanel
                project={activeProject}
                terrainData={terrainData}
                selectedId={effectiveCandidateId}
                onSelectCandidate={setSelectedCandidateId}
                onUpdateProject={updateProject}
              />
            )}

            <div className="site-info-tabs">
              <div className="tab-strip">
                <button
                  className={`tab-btn ${siteTab === 'evidence' ? 'tab-btn-active' : ''}`}
                  onClick={() => setSiteTab('evidence')}
                  type="button"
                >
                  Gebäudebefund
                </button>
                <button
                  className={`tab-btn ${siteTab === 'terrain' ? 'tab-btn-active' : ''}`}
                  onClick={() => setSiteTab('terrain')}
                  type="button"
                >
                  Gelände
                </button>
                <button
                  className={`tab-btn ${siteTab === 'crosssection' ? 'tab-btn-active' : ''}`}
                  onClick={() => setSiteTab('crosssection')}
                  type="button"
                >
                  N–S Schnitt
                </button>
                <button
                  className={`tab-btn ${siteTab === 'crosssectionew' ? 'tab-btn-active' : ''}`}
                  onClick={() => setSiteTab('crosssectionew')}
                  type="button"
                >
                  O–W Schnitt
                </button>
              </div>
              <div className="tab-content">
                {siteTab === 'evidence' && (
                  <div className="panel">
                    {isImportedProject ? (
                      <ImportedCandidatePanel
                        candidates={activeProject.candidates}
                        confirmedIds={activeProject.confirmedIds}
                        selectedId={effectiveCandidateId}
                        onSelect={setSelectedCandidateId}
                        project={activeProject}
                        onUpdateProject={updateProject}
                      />
                    ) : (
                      <BuildingEvidencePanel candidate={selectedCandidate!} summary={fetchedGeodataSummary} />
                    )}
                  </div>
                )}
                {siteTab === 'terrain' && !isImportedProject && <TerrainSamplingPanel />}
                {siteTab === 'crosssection' && !isImportedProject && <TerrainCrossSectionPanel />}
                {siteTab === 'crosssectionew' && !isImportedProject && <TerrainCrossSectionEWPanel />}
                {siteTab === 'terrain' && isImportedProject && (
                  terrainData
                    ? <ImportedTerrainSamplingPanel data={terrainData} />
                    : <TerrainFetchCard fetchState={terrainFetchState} error={terrainFetchError} onFetch={fetchTerrain} />
                )}
                {siteTab === 'crosssection' && isImportedProject && (
                  terrainData
                    ? <ImportedTerrainCrossSectionPanel data={terrainData} axis="ns" />
                    : <TerrainFetchCard fetchState={terrainFetchState} error={terrainFetchError} onFetch={fetchTerrain} />
                )}
                {siteTab === 'crosssectionew' && isImportedProject && (
                  terrainData
                    ? <ImportedTerrainCrossSectionPanel data={terrainData} axis="ew" />
                    : <TerrainFetchCard fetchState={terrainFetchState} error={terrainFetchError} onFetch={fetchTerrain} />
                )}
              </div>
            </div>
          </div>
        )
        }

        {/* Assessment section */}
        {
          activeSection === 'assessment' && (
            <div className="section-page">
              <header className="section-header">
                <h2 className="section-title">Bewertung &amp; Bestand</h2>
              </header>
              <div className="site-info-tabs">
                <div className="tab-strip">
                  <button className={`tab-btn ${assessmentTab === 'hull' ? 'tab-btn-active' : ''}`} onClick={() => setAssessmentTab('hull')} type="button">Gebäudehülle</button>
                  {!isImportedProject && <button className={`tab-btn ${assessmentTab === 'reuse' ? 'tab-btn-active' : ''}`} onClick={() => setAssessmentTab('reuse')} type="button">Wiedernutzung</button>}
                  {!isImportedProject && <button className={`tab-btn ${assessmentTab === 'shots' ? 'tab-btn-active' : ''}`} onClick={() => setAssessmentTab('shots')} type="button">Fotos</button>}
                  {!isImportedProject && <button className={`tab-btn ${assessmentTab === 'readiness' ? 'tab-btn-active' : ''}`} onClick={() => setAssessmentTab('readiness')} type="button">Planungsreife</button>}
                  {!isImportedProject && <button className={`tab-btn ${assessmentTab === 'evidence' ? 'tab-btn-active' : ''}`} onClick={() => setAssessmentTab('evidence')} type="button">Nachweise</button>}
                  <button className={`tab-btn ${assessmentTab === 'data' ? 'tab-btn-active' : ''}`} onClick={() => setAssessmentTab('data')} type="button">Daten</button>
                </div>
                <div className="tab-content">
                  <div className="assessment-layout">
                    {assessmentTab === 'hull' && (
                      <>
                        {!isImportedProject && <ConfirmedObjectPanel candidates={activeCandidates} />}
                        {isImportedProject
                          ? confirmedCandidates.map((c) => <ImportedCandidateMetricsPanel key={c.id} candidate={c} />)
                          : <CombinedHullMetricsPanel />}
                        <SurfaceMetricsTable candidate={selectedCandidate!} />
                      </>
                    )}
                    {assessmentTab === 'reuse' && !isImportedProject && (
                      <>
                        <SolarPvPlanPanel />
                        <MaterialReusePanel />
                      </>
                    )}
                    {assessmentTab === 'shots' && !isImportedProject && <InspectionShotListPanel />}
                    {assessmentTab === 'readiness' && !isImportedProject && <MissingMeasurementsPanel />}
                    {assessmentTab === 'evidence' && !isImportedProject && <EvidenceInspectionPanel />}
                    {assessmentTab === 'data' && (
                      <>
                        <ScenarioRegistryPanel project={activeProject} />
                        {!isImportedProject && <MetadataExplorerPanel />}
                        <DataInventoryPanel items={isImportedProject ? buildProjectInventory(activeProject!, terrainData, lod2IfcContent !== null ? 'generated' : null) : dataInventorySeed} />
                        <AssessmentReadinessPanel summary={fetchedGeodataSummary} project={activeProject} terrainData={terrainData} lod2GeneratedFor={lod2IfcContent !== null ? 'generated' : null} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* Data section */}
        {
          activeSection === 'data' && (
            <div className="section-page">
              <header className="section-header">
                <h2 className="section-title">Datenquellen &amp; Inventar</h2>
              </header>
              <div className="data-layout">
                {!isImportedProject && <MetadataExplorerPanel />}
                <DataInventoryPanel items={isImportedProject ? buildProjectInventory(activeProject!, terrainData, lod2IfcContent !== null ? 'generated' : null) : dataInventorySeed} />
                {!isImportedProject && (
                  <>
                    <BuildingCandidateTable
                      candidates={lod2CandidateGeometry.candidates}
                      onSelectCandidate={setSelectedCandidateId}
                      selectedCandidateId={selectedCandidateId}
                    />
                    <SurfaceMetricsTable candidate={selectedCandidate!} />
                  </>
                )}
              </div>
            </div>
          )
        }


      </main >
    </div >
  );
}

// ── Workshop App ────────────────────────────────────────────────────────────

type WorkshopSection = 'workshop' | 'map' | 'spatial3d' | 'import';

function WorkshopApp({ onGoHome, project }: { onGoHome: () => void; project: BuiltinProject | null }) {
  const workshopProjectId = project?.projectId ?? '';
  const workshopSiteId = project?.siteId ?? '';
  const [section, setSection] = useState<WorkshopSection>('workshop');
  const [wsSeeded, setWsSeeded] = useState(false);
  const [flyToPos, setFlyToPos] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedMapZoneId, setSelectedMapZoneId] = useState<string | null>(null);
  const [selectedMapAssetId, setSelectedMapAssetId] = useState<string | null>(null);
  const [workshopFocus, setWorkshopFocus] = useState<WorkshopFocusRequest | null>(null);

  useEffect(() => {
    setWsSeeded(false);
    setFlyToPos(null);
    setSelectedMapZoneId(null);
    setSelectedMapAssetId(null);
    setWorkshopFocus(null);
    if (workshopProjectId) seedProject(workshopProjectId)
      .then(() => setWsSeeded(true))
      .catch((err) => { console.error('seedProject failed:', err); setWsSeeded(true); });
  }, [workshopProjectId]);

  const zones = useZones(workshopSiteId);
  const gpsAssets = useGpsAssets(workshopProjectId);

  return (
    <div className="app-shell">
      <nav className="nav-rail">
        <button className="nav-rail-logo" onClick={onGoHome} title="Zur Startseite" type="button">
          <Compass size={22} />
        </button>
        <div className="nav-rail-nav">
          <button
            className={`nav-icon-btn${section === 'workshop' ? ' nav-icon-btn-active' : ''}`}
            data-label="Workshop"
            onClick={() => setSection('workshop')}
            title="Workshop — Zonen, Timeline, Szenen"
            type="button"
          >
            <Layers size={20} />
          </button>
          <button
            className={`nav-icon-btn${section === 'map' ? ' nav-icon-btn-active' : ''}`}
            data-label="Lage"
            onClick={() => setSection('map')}
            title="Lage — Zonenplan mit GPS-Fotos"
            type="button"
          >
            <MapPinned size={20} />
          </button>
          <button
            className={`nav-icon-btn${section === 'spatial3d' ? ' nav-icon-btn-active' : ''}`}
            data-label="3D"
            onClick={() => setSection('spatial3d')}
            title="3D — Gelände, Hüllen und Vegetation"
            type="button"
          >
            <Building2 size={20} />
          </button>
          <button
            className={`nav-icon-btn${section === 'import' ? ' nav-icon-btn-active' : ''}`}
            data-label="Import"
            onClick={() => setSection('import')}
            title="Fotos importieren — GPS-basierte Zonen-Zuweisung"
            type="button"
          >
            <Upload size={20} />
          </button>
        </div>
        <div className="nav-rail-footer">
          <button
            className="nav-icon-btn"
            data-label="Startseite"
            onClick={onGoHome}
            title="Zurück zur Startseite"
            type="button"
          >
            <Home size={18} />
          </button>
        </div>
      </nav>

      <main className="main-content">
        {section === 'workshop' && (
          <div className="section-page" style={{ padding: 0 }}>
            <WorkshopRoute focusRequest={workshopFocus} projectId={workshopProjectId} siteId={workshopSiteId} />
          </div>
        )}
        {section === 'map' && (
          <div className="ws-map-section-layout">
            <div className="ws-map-section-map">
              {wsSeeded ? (
                <WorkshopMapPanel
                  projectId={workshopProjectId}
                  zones={zones ?? []}
                  selectedZoneId={selectedMapZoneId}
                  selectedAssetId={selectedMapAssetId}
                  onSelectZone={(zoneId) => setSelectedMapZoneId(zoneId)}
                  onSelectAsset={(assetId) => setSelectedMapAssetId(assetId)}
                  flyToPosition={flyToPos}
                  assetMarkers={(gpsAssets ?? []).map((a) => ({
                    id: a.id,
                    lat: a.gpsLat!,
                    lon: a.gpsLon!,
                    title: a.title,
                    zoneId: a.zoneId,
                    capturedAt: a.capturedAt,
                    isPlaceholder: false,
                    bearing: a.gpsBearing,
                  }))}
                />
              ) : (
                <div className="ws-loading">Karte wird geladen …</div>
              )}
            </div>
            <GpsMetadataPanel
              projectId={workshopProjectId}
              selectedZoneId={selectedMapZoneId}
              selectedAssetId={selectedMapAssetId}
              onSelectZone={(zoneId) => setSelectedMapZoneId(zoneId || null)}
              onSelectAsset={(assetId) => setSelectedMapAssetId(assetId)}
              onFocusAsset={(lat, lon) => setFlyToPos({ lat, lon })}
              onOpenAsset={(asset) => {
                if (asset.zoneId) setSelectedMapZoneId(asset.zoneId);
                setSelectedMapAssetId(asset.id);
                setWorkshopFocus({
                  kind: 'asset',
                  id: asset.id,
                  zoneId: asset.zoneId,
                  nonce: Date.now(),
                });
                setSection('workshop');
              }}
            />
          </div>
        )}
        {section === 'spatial3d' && (
          <Workshop3DPanel
            projectId={workshopProjectId}
            selectedZoneId={selectedMapZoneId}
            selectedAssetId={selectedMapAssetId}
            onSelectZone={(zoneId) => setSelectedMapZoneId(zoneId)}
            onOpenEvidence={(focus) => {
              if (focus.zoneId) setSelectedMapZoneId(focus.zoneId);
              setWorkshopFocus({ ...focus, nonce: Date.now() });
              setSection('workshop');
            }}
          />
        )}
        {section === 'import' && (
          <div className="section-page">
            <BulkImportPanel projectId={workshopProjectId} zones={zones ?? []} />
          </div>
        )}
      </main>
    </div>
  );
}

// ── Small helper components for imported projects ───────────────────────────

function ImportedCandidateMetricsPanel({ candidate }: { candidate: Lod2Candidate }) {
  const groundArea = candidate.surfaces.ground.reduce((s, f) => s + f.areaM2, 0);
  const roofArea = candidate.surfaces.roof.reduce((s, f) => s + f.areaM2, 0);
  const wallArea = candidate.surfaces.wall.reduce((s, f) => s + f.areaM2, 0);
  const width = (candidate.bboxUtm32.maxE - candidate.bboxUtm32.minE).toFixed(1);
  const depth = (candidate.bboxUtm32.maxN - candidate.bboxUtm32.minN).toFixed(1);
  const steepestPitch = candidate.surfaces.roof.length > 0
    ? Math.max(...candidate.surfaces.roof.map((s) => s.pitchDeg))
    : 0;
  return (
    <section className="panel">
      <div className="panel-title">
        <Combine size={18} />
        LoD2 Hüllmetriken
      </div>
      <dl className="metric-list metric-list-wide">
        <div><dt>Höhe (LoD2)</dt><dd>{candidate.measuredHeightM.toFixed(2)} m</dd></div>
        <div><dt>Grundfläche</dt><dd>{groundArea.toFixed(1)} m²</dd></div>
        <div><dt>Dachfläche</dt><dd>{roofArea.toFixed(1)} m²</dd></div>
        <div><dt>Wandfläche</dt><dd>{wallArea.toFixed(1)} m²</dd></div>
        <div><dt>BBox</dt><dd>{width} m × {depth} m</dd></div>
        <div><dt>Max. Dachneigung</dt><dd>{steepestPitch.toFixed(1)}°</dd></div>
        <div style={{ gridColumn: '1 / -1' }}>
          <dt>Flächen</dt>
          <dd>{candidate.surfaces.roof.length} Dach · {candidate.surfaces.wall.length} Wand · {candidate.surfaces.ground.length} Boden</dd>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <dt style={{ fontSize: '0.72rem' }}>ID</dt>
          <dd style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{candidate.id}</dd>
        </div>
      </dl>
    </section>
  );
}

function ImportedCandidatePanel({
  candidates,
  confirmedIds,
  selectedId,
  onSelect,
  project,
  onUpdateProject,
}: {
  candidates: Lod2Candidate[];
  confirmedIds: string[];
  selectedId: string;
  onSelect: (id: string) => void;
  project: ImportedProject;
  onUpdateProject: (project: ImportedProject) => void;
}) {
  const isSelectedConfirmed = confirmedIds.includes(selectedId);
  
  const handleToggleSelected = () => {
    if (!selectedId) return;
    const newConfirmedIds = isSelectedConfirmed
      ? confirmedIds.filter((id) => id !== selectedId)
      : [...confirmedIds, selectedId];
    onUpdateProject({ ...project, confirmedIds: newConfirmedIds });
  };

  const handleClearAll = () => {
    onUpdateProject({ ...project, confirmedIds: [] });
  };

  return (
    <div className="imported-candidate-panel">
      <p className="imported-candidate-heading">
        {candidates.length} Gebäude aus GML · {confirmedIds.length} ausgewählt
      </p>
      
      {/* Action Bar */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '12px',
        padding: '8px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
      }}>
        <button
          className="btn btn-sm"
          onClick={handleToggleSelected}
          disabled={!selectedId}
          type="button"
          style={{
            minWidth: '120px',
            padding: '6px 12px',
            fontSize: '12px',
          }}
        >
          {isSelectedConfirmed ? '✕ Abwählen' : '✓ Auswählen'}
        </button>
        <button
          className="btn btn-sm"
          onClick={handleClearAll}
          disabled={confirmedIds.length === 0}
          type="button"
          style={{
            minWidth: '120px',
            padding: '6px 12px',
            fontSize: '12px',
          }}
        >
          Alle abwählen
        </button>
      </div>

      <div className="imported-candidate-list">
        {candidates.slice(0, 20).map((c) => {
          const confirmed = confirmedIds.includes(c.id);
          const selected = c.id === selectedId;
          return (
            <button
              className={`imported-candidate-row ${selected ? 'imported-candidate-row-selected' : ''}`}
              key={c.id}
              onClick={() => onSelect(c.id)}
              type="button"
            >
              {confirmed ? (
                <CheckCircle2 size={14} style={{ color: '#34d399', flexShrink: 0 }} />
              ) : (
                <Circle size={14} style={{ color: '#4b5563', flexShrink: 0 }} />
              )}
              <div>
                <strong>{c.id}</strong>
                <span>
                  {c.measuredHeightM.toFixed(1)} m · {c.surfaces.roof.length} Dach · {c.surfaces.wall.length} Wand ·{' '}
                  {c.bboxDistanceToGeocodeM.toFixed(0)} m von Adresse
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Terrain fetch card + derived panels (imported projects) ──────────────

function TerrainFetchCard({
  fetchState,
  error,
  onFetch,
}: {
  fetchState: 'idle' | 'loading' | 'error';
  error: string;
  onFetch: () => void;
}) {
  return (
    <section className="panel terrain-fetch-card">
      <div className="panel-title">
        <Mountain size={18} />
        Geländedaten laden
      </div>
      <p className="lod2-generate-desc">
        Höhenprofil und Geländeschnitte (N–S / E–W) aus dem öffentlichen EUDEM 25 m Geländemodell
        für diesen Standort abrufen. Die Daten werden direkt im Browser geladen — keine externe
        Pipeline erforderlich.
      </p>
      {fetchState === 'error' && (
        <p className="terrain-fetch-error">Fehler: {error}</p>
      )}
      <button
        className="lod2-generate-btn"
        disabled={fetchState === 'loading'}
        onClick={onFetch}
        type="button"
      >
        {fetchState === 'loading' ? (
          <><span className="terrain-spinner" /> Geländedaten werden abgerufen…</>
        ) : (
          <><Mountain size={14} /> Geländedaten laden</>
        )}
      </button>
      <p className="lod2-derive-note" style={{ marginTop: 10 }}>
        Quelle: Open-Meteo Elevation API · SRTM / ASTER · kostenlos
      </p>
    </section>
  );
}

function ImportedTerrainSamplingPanel({ data }: { data: ImportedTerrainData }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <Mountain size={18} />
        Geländeanalyse (EUDEM 25 m)
      </div>
      <dl className="metric-list metric-list-wide">
        <div><dt>Mittlere Höhe</dt><dd>{data.meanElevationM.toFixed(1)} m ü. NHN</dd></div>
        <div><dt>Höhe Gebäudezentrum</dt><dd>{data.centerZ.toFixed(1)} m ü. NHN</dd></div>
        <div><dt>Relief (±120 m)</dt><dd>{data.reliefM.toFixed(1)} m</dd></div>
        <div><dt>Mittl. Geländegefälle</dt><dd>{data.slopePercent.toFixed(1)} %</dd></div>
        <div><dt>Profilpunkte</dt><dd>{data.nsProfile.length} N–S · {data.ewProfile.length} E–W</dd></div>
      </dl>
      <p className="lod2-derive-note">
        {data.source} · abgerufen {new Date(data.fetchedAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
      </p>
    </section>
  );
}

function ImportedTerrainCrossSectionPanel({
  data,
  axis,
}: {
  data: ImportedTerrainData;
  axis: 'ns' | 'ew';
}) {
  const profile = axis === 'ns' ? data.nsProfile : data.ewProfile;
  const label = axis === 'ns' ? 'N–S Geländeschnitt' : 'E–W Geländeschnitt';
  const axisLabel = axis === 'ns' ? 'N (m)' : 'E (m)';

  const W = 800, H = 240;
  const PAD = { top: 24, right: 20, bottom: 40, left: 52 };
  const dists = profile.map((p) => p.dist);
  const zs = profile.map((p) => p.zSmooth);

  const minD = dists[0];
  const maxD = dists[dists.length - 1];
  const minZ = Math.min(...zs) - 1;
  const maxZ = Math.max(...zs) + 1.5;

  const cx = (d: number) => PAD.left + ((d - minD) / (maxD - minD)) * (W - PAD.left - PAD.right);
  const cy = (z: number) => PAD.top + ((maxZ - z) / (maxZ - minZ)) * (H - PAD.top - PAD.bottom);

  const smoothLine = profile.map((p) => `${cx(p.dist).toFixed(1)},${cy(p.zSmooth).toFixed(1)}`).join(' ');

  const fillPath =
    `M ${cx(minD).toFixed(1)},${cy(minZ).toFixed(1)} ` +
    profile.map((p) => `L ${cx(p.dist).toFixed(1)},${cy(p.zSmooth).toFixed(1)}`).join(' ') +
    ` L ${cx(maxD).toFixed(1)},${cy(minZ).toFixed(1)} Z`;

  const zTick0 = Math.ceil(minZ / 2) * 2;
  const zTicks: number[] = [];
  for (let z = zTick0; z <= maxZ; z += 2) zTicks.push(z);

  const dTick0 = Math.ceil(minD / 20) * 20;
  const dTicks: number[] = [];
  for (let d = dTick0; d <= maxD; d += 20) dTicks.push(d);

  const buildingX = cx(0);

  return (
    <section className="panel">
      <div className="panel-title">
        <Mountain size={18} />
        {label}
      </div>
      <div style={{ padding: '0 4px' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', display: 'block', background: '#111827', borderRadius: 6 }}
          aria-label={label}
        >
          <defs>
            <linearGradient id={`terrainFillImported-${axis}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4a7c59" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#1e3a2f" stopOpacity="0.85" />
            </linearGradient>
            <clipPath id={`chartClipImported-${axis}`}>
              <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom} />
            </clipPath>
          </defs>
          {/* Grid */}
          {zTicks.map((z) => (
            <line key={z} x1={PAD.left} x2={W - PAD.right} y1={cy(z)} y2={cy(z)} stroke="#ffffff18" strokeWidth="0.6" strokeDasharray="3 4" />
          ))}
          {dTicks.map((d) => (
            <line key={d} x1={cx(d)} x2={cx(d)} y1={PAD.top} y2={H - PAD.bottom} stroke="#ffffff10" strokeWidth="0.5" strokeDasharray="2 5" />
          ))}
          {/* Building marker at dist=0 */}
          <rect x={buildingX - 4} width={8} y={PAD.top} height={H - PAD.top - PAD.bottom}
            fill="#f59e0b" fillOpacity="0.15" clipPath={`url(#chartClipImported-${axis})`} />
          <line x1={buildingX} x2={buildingX} y1={PAD.top} y2={H - PAD.bottom}
            stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="4 3" clipPath={`url(#chartClipImported-${axis})`} />
          {/* Terrain fill + line */}
          <path d={fillPath} fill={`url(#terrainFillImported-${axis})`} clipPath={`url(#chartClipImported-${axis})`} />
          <polyline points={smoothLine} fill="none" stroke="#6ee7b7" strokeWidth="1.6" clipPath={`url(#chartClipImported-${axis})`} />
          {/* Y axis */}
          {zTicks.map((z) => (
            <text key={z} x={PAD.left - 5} y={cy(z) + 4} textAnchor="end" fontSize="10" fill="#9ca3af">{z}</text>
          ))}
          <text x={12} y={H / 2} textAnchor="middle" fontSize="10" fill="#9ca3af" transform={`rotate(-90,12,${H / 2})`}>m ü. NHN</text>
          {/* X axis */}
          {dTicks.map((d) => (
            <text key={d} x={cx(d)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize="10" fill="#9ca3af">{d}</text>
          ))}
          <text x={(PAD.left + W - PAD.right) / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="#9ca3af">{axisLabel}</text>
          {/* Building label */}
          <text x={buildingX} y={PAD.top - 6} textAnchor="middle" fontSize="10" fill="#f59e0b">Gebäude</text>
          {/* Center elevation */}
          <text x={buildingX + 6} y={cy(data.centerZ) - 6} fontSize="9" fill="#fbbf24">{data.centerZ.toFixed(0)} m</text>
        </svg>
      </div>
      <p className="lod2-derive-note" style={{ marginTop: 6 }}>
        {data.source} · ±120 m Transekt
      </p>
    </section>
  );
}

function generatePipelineConfig(project: ImportedProject, candidateId: string) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const addrSlug = project.address
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  const cacheSlug = `retrieval_${date}_${addrSlug}`;
  const confirmedIds = project.confirmedIds.length > 0 ? project.confirmedIds : [candidateId];
  return {
    _comment: 'Automatisch generiert aus Hauskompass-Import. Cache-Ordner und GML-Datei manuell anlegen.',
    cacheSlug,
    dgmTile: project.geocode.tileId,
    targetEasting: project.geocode.utm32.easting,
    targetNorthing: project.geocode.utm32.northing,
    confirmedLod2Ids: confirmedIds,
    referenceLod2Ids: project.candidates
      .map((c) => c.id)
      .filter((id) => !confirmedIds.includes(id))
      .slice(0, 8),
  };
}

// Suppress unused-variable warning — kept for future use
void generatePipelineConfig;

// ── In-browser LoD2 → Ansichten / IFC generator ──────────────────────────

function Lod2GenerateCard({
  candidates,
  address,
  isGenerated,
  onGenerate,
}: {
  candidates: Lod2Candidate[];
  address: string;
  isGenerated: boolean;
  onGenerate: (ifcContent: string) => void;
}) {
  const handleGenerate = () => {
    const ifcStep = generateCombinedIfcStep(candidates, address);
    onGenerate(ifcStep);
  };

  if (isGenerated) {
    return (
      <section className="panel lod2-generate-card lod2-generate-card--done">
        <div className="panel-title">
          <Play size={18} />
          Daten generiert
        </div>
        <p className="lod2-generate-desc">
          Grundriss, Ansichten und IFC-Modell wurden aus der LoD2-Geometrie abgeleitet.
          Die anderen Tabs sind jetzt befüllt.
        </p>
      </section>
    );
  }

  return (
    <section className="panel lod2-generate-card">
      <div className="panel-title">
        <Play size={18} />
        Daten generieren
      </div>
      <p className="lod2-generate-desc">
        Aus der LoD2-Geometrie werden Grundriss, Seitenansichten und ein IFC-Modell
        direkt im Browser erzeugt — ohne externe Pipeline.
      </p>
      <button className="lod2-generate-btn" onClick={handleGenerate} type="button">
        <Play size={14} />
        {candidates.length > 1
          ? `${candidates.length} Gebäude · Grundriss · IFC generieren`
          : 'Grundriss · Ansichten · IFC generieren'}
      </button>
    </section>
  );
}

// ── Floor plan derived from LoD2 ground surface ───────────────────────────

function Lod2FloorPlanPanel({ candidate }: { candidate: Lod2Candidate }) {
  const { bboxUtm32, surfaces } = candidate;
  const baseE = bboxUtm32.minE;
  const baseN = bboxUtm32.minN;
  const widthM = bboxUtm32.maxE - baseE;
  const depthM = bboxUtm32.maxN - baseN;
  const groundArea = surfaces.ground.reduce((s, f) => s + f.areaM2, 0);

  // Project ground surface to 2D (E=X, N=Y flipped for SVG)
  const rawPts = surfaces.ground[0]?.points ?? [];
  // Remove closing duplicate
  const pts =
    rawPts.length > 3 &&
      Math.abs(rawPts[0].e - rawPts[rawPts.length - 1].e) < 0.005 &&
      Math.abs(rawPts[0].n - rawPts[rawPts.length - 1].n) < 0.005
      ? rawPts.slice(0, -1)
      : rawPts;

  const svgPts = pts.map((p) => `${(p.e - baseE).toFixed(2)},${-(p.n - baseN).toFixed(2)}`).join(' ');
  const pad = 2;
  const vb = `${-pad} ${-depthM - pad} ${widthM + pad * 2} ${depthM + pad * 2}`;

  return (
    <section className="panel">
      <div className="panel-title">
        <Building2 size={18} />
        Grundriss (LoD2 Projektion)
      </div>
      <svg viewBox={vb} className="lod2-plan-svg" role="img" aria-label="Grundriss aus LoD2">
        {pts.length >= 3 ? (
          <polygon points={svgPts} fill="#e8f0fe" stroke="#3b82f6" strokeWidth={0.15} />
        ) : (
          <rect x={0} y={-depthM} width={widthM} height={depthM} fill="#e8f0fe" stroke="#3b82f6" strokeWidth={0.15} />
        )}
        {/* Width dimension */}
        <line x1={0} y1={pad * 0.6} x2={widthM} y2={pad * 0.6} stroke="#9ca3af" strokeWidth={0.07} />
        <line x1={0} y1={pad * 0.45} x2={0} y2={pad * 0.75} stroke="#9ca3af" strokeWidth={0.07} />
        <line x1={widthM} y1={pad * 0.45} x2={widthM} y2={pad * 0.75} stroke="#9ca3af" strokeWidth={0.07} />
        <text x={widthM / 2} y={pad * 0.3} textAnchor="middle" fontSize={0.55} fill="#374151">
          {widthM.toFixed(1)} m
        </text>
        {/* Depth dimension */}
        <line x1={-pad * 0.6} y1={0} x2={-pad * 0.6} y2={-depthM} stroke="#9ca3af" strokeWidth={0.07} />
        <line x1={-pad * 0.45} y1={0} x2={-pad * 0.75} y2={0} stroke="#9ca3af" strokeWidth={0.07} />
        <line x1={-pad * 0.45} y1={-depthM} x2={-pad * 0.75} y2={-depthM} stroke="#9ca3af" strokeWidth={0.07} />
        <text
          x={-pad * 0.3}
          y={-depthM / 2}
          textAnchor="middle"
          fontSize={0.55}
          fill="#374151"
          transform={`rotate(-90, ${-pad * 0.3}, ${-depthM / 2})`}
        >
          {depthM.toFixed(1)} m
        </text>
        {/* North indicator */}
        <text x={widthM + 0.4} y={-depthM + 0.6} fontSize={0.6} fill="#6b7280">N↑</text>
      </svg>
      <p className="lod2-derive-note">
        Grundfläche: {groundArea.toFixed(1)} m² · BBox: {widthM.toFixed(1)} × {depthM.toFixed(1)} m ·
        Koordinatensystem: UTM32, lokalisiert
      </p>
    </section>
  );
}

// ── Elevation views derived from LoD2 wall/roof surfaces ─────────────────

function Lod2ElevationsPanel({ candidate }: { candidate: Lod2Candidate }) {
  const { bboxUtm32, surfaces, measuredHeightM } = candidate;
  const baseE = bboxUtm32.minE;
  const baseN = bboxUtm32.minN;
  const baseZ = bboxUtm32.minZ;
  const widthEW = bboxUtm32.maxE - baseE;
  const widthNS = bboxUtm32.maxN - baseN;

  type Proj = (p: { e: number; n: number; z: number }) => { x: number; y: number };

  const views: { label: string; width: number; proj: Proj }[] = [
    { label: 'Süd', width: widthEW, proj: (p) => ({ x: p.e - baseE, y: p.z - baseZ }) },
    { label: 'Ost', width: widthNS, proj: (p) => ({ x: p.n - baseN, y: p.z - baseZ }) },
  ];

  const allSurfs = [
    ...surfaces.wall.map((s) => ({ ...s, kind: 'wall' as const })),
    ...surfaces.roof.map((s) => ({ ...s, kind: 'roof' as const })),
  ];

  return (
    <section className="panel">
      <div className="panel-title">
        <Combine size={18} />
        Ansichten (LoD2 Projektion)
      </div>
      {views.map((view) => {
        const pad = 1;
        const vb = `${-pad} ${-measuredHeightM - pad * 0.5} ${view.width + pad * 2} ${measuredHeightM + pad * 1.5}`;

        return (
          <div key={view.label} style={{ marginBottom: 12 }}>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '4px 0' }}>{view.label}</p>
            <svg viewBox={vb} className="lod2-elevation-svg" role="img" aria-label={`${view.label}-Ansicht`}>
              {/* Ground line */}
              <line x1={-0.3} y1={0} x2={view.width + 0.3} y2={0} stroke="#6b7280" strokeWidth={0.1} />
              {/* Wall surfaces */}
              {allSurfs.map((surf) => {
                let pts = surf.points;
                if (
                  pts.length > 3 &&
                  Math.abs(pts[0].e - pts[pts.length - 1].e) < 0.005
                ) {
                  pts = pts.slice(0, -1);
                }
                const svgPts = pts
                  .map(view.proj)
                  .map((p) => `${p.x.toFixed(2)},${(-p.y).toFixed(2)}`)
                  .join(' ');
                return (
                  <polygon
                    key={surf.id}
                    points={svgPts}
                    fill={surf.kind === 'roof' ? '#c8862a' : '#d1c4a8'}
                    stroke={surf.kind === 'roof' ? '#8a5a10' : '#8a7060'}
                    strokeWidth={0.07}
                    opacity={0.88}
                  />
                );
              })}
              {/* Height annotation */}
              <line
                x1={view.width + pad * 0.5}
                y1={0}
                x2={view.width + pad * 0.5}
                y2={-measuredHeightM}
                stroke="#9ca3af"
                strokeWidth={0.07}
              />
              <text
                x={view.width + pad * 0.8}
                y={-measuredHeightM / 2}
                fontSize={0.5}
                fill="#374151"
                textAnchor="start"
              >
                {measuredHeightM.toFixed(2)} m
              </text>
            </svg>
          </div>
        );
      })}
      <p className="lod2-derive-note">
        Orthogonale Projektion der LoD2-Flächen. Wandstärken und Öffnungen sind nicht modelliert.
      </p>
    </section>
  );
}

function PipelineRequiredHint({ context }: { context?: 'parts' | 'sections' | 'ifc' | 'terrain' }) {
  const messages: Record<string, { title: string; body: string }> = {
    parts: {
      title: 'Elementplan nicht verfügbar',
      body: 'Der detaillierte Elementplan (Wände, Decken, Öffnungen) wird aus dem IFC-Gebäudemodell erzeugt. Dafür ist die Python-Pipeline mit aufbereitetem BIM-Modell erforderlich.',
    },
    sections: {
      title: 'Seitenansichten nicht verfügbar',
      body: 'Maßhaltige Seitenansichten und Schnittzeichnungen werden aus dem IFC-Gebäudemodell generiert. Dafür ist die Python-Pipeline mit aufbereitetem BIM-Modell erforderlich.',
    },
    ifc: {
      title: 'IFC-Modell nicht verfügbar',
      body: 'Das strukturierte IFC-Gebäudemodell wird durch die Python-Pipeline aus LoD2-Geometrie und Bestandsaufnahme erzeugt. Den Einstieg findest du in der Projektdokumentation unter „Pipeline starten".',
    },
    terrain: {
      title: 'Geländeanalyse nicht verfügbar',
      body: 'Geländeschnitte und Terrain-Analyse benötigen DGM1-Daten und die Python-Pipeline. Den Cache-Pfad und die Anleitung findest du im Wizard unter „Neues Projekt anlegen".',
    },
  };
  const { title, body } = messages[context ?? 'terrain'];
  return (
    <div className="pipeline-required-hint">
      <Wrench size={20} />
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </div>
  );
}
