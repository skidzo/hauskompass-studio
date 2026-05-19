import type { SpatialScene } from '@/domain/spatial/types';
import { fetchProjectJson } from '@/features/project-data/projectDataLoader';
import type { WorkshopFocusKind } from '@/features/workshop/WorkshopRoute';
import { useInterpretations, useObservations, useWorkshopScenes, useZone, useZoneDetail } from '@/features/workshop/hooks/useWorkshopData';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { workshopDb } from '../db/workshopDb';

interface Workshop3DPanelProps {
    projectId: string;
    selectedZoneId: string | null;
    selectedAssetId?: string | null;
    onSelectZone: (zoneId: string) => void;
    onOpenEvidence: (focus: { kind: WorkshopFocusKind; id: string; zoneId?: string }) => void;
}

type LayerKey = 'terrain' | 'buildingHulls' | 'vegetation';
type LayerState = Record<LayerKey, boolean>;
type SpatialSceneObject =
    | SpatialScene['terrain'][number]
    | SpatialScene['buildingHulls'][number]
    | SpatialScene['vegetation'][number];

const CONFIDENCE_LABEL: Record<string, string> = {
    rough: 'grob',
    inferred: 'abgeleitet',
    imported: 'importiert',
    workshop_sketch: 'Workshop-Skizze',
    measured: 'gemessen',
    verified: 'verifiziert',
};

const VERIFICATION_LABEL: Record<string, string> = {
    verified_geometry: 'Geometrie: verifiziert',
    inferred_geometry: 'Geometrie: abgeleitet (LOD2)',
    placeholder_geometry: 'Geometrie: Platzhalter',
    unknown_geometry: 'Geometrie: unbekannt',
};

const LAYER_LABEL: Record<LayerKey, string> = {
    terrain: 'Gelände',
    buildingHulls: 'Hüllen',
    vegetation: 'Vegetation',
};

export function Workshop3DPanel({ projectId, selectedZoneId, selectedAssetId = null, onOpenEvidence, onSelectZone }: Workshop3DPanelProps) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const objectRefs = useRef<THREE.Object3D[]>([]);
    const compassRef = useRef<SVGGElement>(null);
    const [sceneData, setSceneData] = useState<SpatialScene | null>(null);
    const [sceneLoadState, setSceneLoadState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
    useEffect(() => {
        setSceneData(null);
        setSceneLoadState('loading');
        fetchProjectJson<SpatialScene>(projectId, 'spatial_context.json')
            .then((data) => { setSceneData(data); setSceneLoadState('ready'); })
            .catch(() => setSceneLoadState('unavailable'));
    }, [projectId]);
    const [layers, setLayers] = useState<LayerState>({ terrain: true, buildingHulls: true, vegetation: true });
    const [activeObjectId, setActiveObjectId] = useState<string | null>(null);
    const selectedAsset = useLiveQuery(
        async () => (selectedAssetId ? await workshopDb.assets.get(selectedAssetId) : undefined),
        [selectedAssetId],
        undefined,
    );

    const selectedObjects = useMemo(() => {
        if (!selectedZoneId || !sceneData) return [];
        return [
            ...sceneData.buildingHulls.filter((item) => item.zoneId === selectedZoneId),
            ...sceneData.vegetation.filter((item) => item.zoneId === selectedZoneId),
        ];
    }, [sceneData, selectedZoneId]);

    useEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap || !sceneData) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf6f3ed);
        scene.add(new THREE.AmbientLight(0xffffff, 0.72));
        const sun = new THREE.DirectionalLight(0xfff0d8, 0.95);
        sun.position.set(-120, 180, 80);
        scene.add(sun);
        const fill = new THREE.DirectionalLight(0xcfe3ff, 0.45);
        fill.position.set(120, 80, -130);
        scene.add(fill);

        const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(wrap.clientWidth || 900, wrap.clientHeight || 620);
        wrap.appendChild(renderer.domElement);

        const camera = new THREE.PerspectiveCamera(45, (wrap.clientWidth || 900) / (wrap.clientHeight || 620), 0.1, 1200);
        // Camera starts from SE, looking NW. fitScene() overrides with scene-fit position.
        camera.position.set(120, 170, 160);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.target.set(-20, 8, -10);
        controls.update();

        const grid = new THREE.GridHelper(420, 28, 0xd9d2c5, 0xe7e0d4);
        grid.position.y = -1.1;
        scene.add(grid);

        objectRefs.current = [];

        if (layers.terrain) {
            for (const terrain of sceneData.terrain) {
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(terrain.vertices.flatMap((p) => [p.x, p.y, p.z]), 3));
                geometry.setIndex(terrain.faces.flat());
                geometry.computeVertexNormals();
                const mesh = new THREE.Mesh(
                    geometry,
                    new THREE.MeshPhongMaterial({
                        color: 0xd8d0bd,
                        emissive: 0xebe5d8,
                        transparent: true,
                        opacity: 0.92,
                        side: THREE.DoubleSide,
                        shininess: 8,
                    }),
                );
                mesh.userData = { objectId: terrain.id, label: terrain.label, confidence: terrain.confidence, verificationStatus: terrain.verificationStatus };
                scene.add(mesh);
                objectRefs.current.push(mesh);
            }
        }

        if (layers.buildingHulls) {
            const hullById = new Map(sceneData.buildingHulls.map((hull) => [hull.id, hull]));
            for (const hull of sceneData.buildingHulls) {
                const selected = hull.zoneId === selectedZoneId;
                const plannedOnly = hull.historicalStatus === 'planned_not_built';
                const geometry = buildHullGeometry(hull.footprint, hull.baseElevation, hull.height);
                const material = new THREE.MeshPhongMaterial({
                    color: selected ? 0x23614b : plannedOnly ? 0x9ca3af : hull.levelOfDetail === 'workshop_sketch' ? 0x7ba7d9 : 0xb98f62,
                    transparent: true,
                    opacity: plannedOnly ? 0.16 : hull.levelOfDetail === 'workshop_sketch' ? 0.55 : 0.78,
                    side: THREE.DoubleSide,
                    shininess: 16,
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.userData = { objectId: hull.id, zoneId: hull.zoneId, label: hull.label, confidence: hull.confidence, verificationStatus: hull.verificationStatus };
                const edges = new THREE.LineSegments(
                    new THREE.EdgesGeometry(geometry),
                    new THREE.LineBasicMaterial({ color: selected ? 0x123c2b : plannedOnly ? 0x6b7280 : 0x5d5145, transparent: true, opacity: plannedOnly ? 0.9 : 0.65 }),
                );
                edges.userData = mesh.userData;
                scene.add(mesh);
                scene.add(edges);
                objectRefs.current.push(mesh, edges);
                if (hull.courtyard) {
                    const courtyard = buildCourtyardOutline(hull.courtyard, hull.baseElevation + hull.height + 0.08, selected, plannedOnly);
                    courtyard.userData = mesh.userData;
                    scene.add(courtyard);
                    objectRefs.current.push(courtyard);
                }
            }
            [
                ['hull-pavillon-4-nucos', 'hull-pavillon-2'],
                ['hull-pavillon-3', 'hull-pavillon-1'],
                ['hull-pavillon-3', 'hull-pavillon-2'],
                ['hull-pavillon-2', 'hull-kantine'],
                ['hull-pavillon-1', 'hull-kantine'],
            ].forEach(([fromId, toId]) => {
                const from = hullById.get(fromId);
                const to = hullById.get(toId);
                if (!from || !to) return;
                scene.add(buildTransitionLine(centerOfFootprint(from.footprint, from.baseElevation), centerOfFootprint(to.footprint, to.baseElevation)));
            });
        }

        if (layers.vegetation) {
            for (const veg of sceneData.vegetation) {
                const selected = veg.zoneId === selectedZoneId;
                const group = new THREE.Group();
                group.userData = { objectId: veg.id, zoneId: veg.zoneId, label: veg.label, confidence: veg.confidence, verificationStatus: veg.verificationStatus };
                const base = new THREE.Mesh(
                    new THREE.CylinderGeometry(veg.radius, veg.radius, 0.25, 28),
                    new THREE.MeshPhongMaterial({ color: selected ? 0x23614b : 0x7fa35f, transparent: true, opacity: 0.38 }),
                );
                base.position.set(veg.position.x, veg.position.y + 0.05, veg.position.z);
                const canopy = new THREE.Mesh(
                    new THREE.ConeGeometry(veg.radius * 0.72, veg.height, 16),
                    new THREE.MeshPhongMaterial({ color: selected ? 0x1f5a3d : 0x5f8d48, transparent: true, opacity: 0.68 }),
                );
                canopy.position.set(veg.position.x, veg.position.y + veg.height / 2, veg.position.z);
                base.userData = group.userData;
                canopy.userData = group.userData;
                group.add(base, canopy);
                scene.add(group);
                objectRefs.current.push(base, canopy);
            }
        }

        const fitScene = () => {
            const box = new THREE.Box3();
            objectRefs.current.forEach((object) => box.expandByObject(object));
            if (box.isEmpty()) return;
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z, 1);
            controls.target.copy(center);
            // South = +z (toward viewer), North = -z (into scene).
            // Camera from SE: x=+0.35 (East), y=+0.55 (elevated), z=+0.78 (South = in front)
            // → looks toward NW, North appears at top/back of screen.
            camera.position.copy(center).add(new THREE.Vector3(0.35, 0.55, 0.78).normalize().multiplyScalar(maxDim * 1.25));
            camera.near = Math.max(maxDim / 200, 0.1);
            camera.far = maxDim * 8;
            camera.updateProjectionMatrix();
            controls.update();
        };
        fitScene();

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        const handleClick = (event: MouseEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(pointer, camera);
            const hit = raycaster.intersectObjects(objectRefs.current, true)[0];
            const data = hit?.object.userData as { objectId?: string; zoneId?: string } | undefined;
            if (!data?.objectId) return;
            setActiveObjectId(data.objectId);
            if (data.zoneId) onSelectZone(data.zoneId);
        };
        renderer.domElement.addEventListener('click', handleClick);

        const ro = new ResizeObserver(() => {
            const width = wrap.clientWidth;
            const height = wrap.clientHeight;
            if (!width || !height) return;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        });
        ro.observe(wrap);

        let raf = 0;
        const northVec = new THREE.Vector3();
        const animate = () => {
            raf = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
            // Rotate compass needle to match current camera orientation.
            // North = (0,0,-1) in world. Transform to camera/view space:
            //   x = screen-right component, y = screen-up component.
            // atan2(x, y) = clockwise angle from screen-up = compass rotation.
            if (compassRef.current) {
                northVec.set(0, 0, -1).transformDirection(camera.matrixWorldInverse);
                const deg = Math.atan2(northVec.x, northVec.y) * (180 / Math.PI);
                compassRef.current.setAttribute('transform', `rotate(${deg.toFixed(2)}, 32, 32)`);
            }
        };
        animate();

        return () => {
            cancelAnimationFrame(raf);
            renderer.domElement.removeEventListener('click', handleClick);
            ro.disconnect();
            controls.dispose();
            renderer.dispose();
            if (wrap.contains(renderer.domElement)) wrap.removeChild(renderer.domElement);
            scene.traverse((object) => {
                if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
                    object.geometry?.dispose();
                    const materials = Array.isArray(object.material) ? object.material : [object.material];
                    materials.forEach((material) => material?.dispose());
                }
            });
        };
    }, [layers, onSelectZone, sceneData, selectedZoneId]);

    const sourceMap = useMemo(() => new Map((sceneData?.sources ?? []).map((source) => [source.id, source])), [sceneData]);
    const activeObject = useMemo(() => {
        if (!sceneData) return undefined;
        return [
            ...sceneData.terrain,
            ...sceneData.buildingHulls,
            ...sceneData.vegetation,
        ].find((item) => item.id === activeObjectId);
    }, [activeObjectId, sceneData]);
    const activeZoneId = getSpatialObjectZoneId(activeObject) ?? selectedZoneId;
    const activeZone = useZone(activeZoneId);
    const { assets, claims, questions } = useZoneDetail(activeZoneId, projectId);
    const observations = useObservations(activeZoneId);
    const interpretations = useInterpretations(activeZoneId);
    const scenes = useWorkshopScenes(projectId);
    const linkedScenes = useMemo(() => {
        const assetIds = new Set((assets ?? []).map((item) => item.id));
        const observationIds = new Set((observations ?? []).map((item) => item.id));
        const claimIds = new Set((claims ?? []).map((item) => item.id));
        const questionIds = new Set((questions ?? []).map((item) => item.id));
        return (scenes ?? []).filter((scene) => (
            scene.selectedAssetIds.some((id) => assetIds.has(id))
            || (scene.selectedObservationIds ?? []).some((id) => observationIds.has(id))
            || (scene.selectedClaimIds ?? []).some((id) => claimIds.has(id))
            || (scene.selectedQuestionIds ?? []).some((id) => questionIds.has(id))
        ));
    }, [assets, claims, observations, questions, scenes]);
    const linkedAssetsForActiveObject = useMemo(() => {
        if (!activeObject) return [];
        return (assets ?? []).filter((asset) => asset.linkedSpatialObjectId === activeObject.id);
    }, [activeObject, assets]);
    const zoneAssetsWithoutDirectObjectLink = useMemo(() => {
        if (!activeObject) return assets ?? [];
        return (assets ?? []).filter((asset) => asset.linkedSpatialObjectId !== activeObject.id);
    }, [activeObject, assets]);

    useEffect(() => {
        if (!selectedAsset?.linkedSpatialObjectId) return;
        setActiveObjectId(selectedAsset.linkedSpatialObjectId);
        if (selectedAsset.zoneId) onSelectZone(selectedAsset.zoneId);
    }, [onSelectZone, selectedAsset?.id, selectedAsset?.linkedSpatialObjectId, selectedAsset?.zoneId]);

    return (
        <section className="ws-3d-workspace">
            <div className="ws-3d-viewport">
                {sceneLoadState === 'unavailable' ? (
                    <div className="ws-3d-unavailable">
                        <strong>Keine 3D-Szene verfügbar</strong>
                        <p>
                            Für dieses Projekt existiert keine räumliche Kontextdatei (<code>spatial_context.json</code>).
                            Die 3D-Ansicht ist nur für Projekte mit vorkonfigurierten Geometriedaten verfügbar.
                        </p>
                    </div>
                ) : (
                    <div ref={wrapRef} className="ws-3d-canvas" />
                )}
                <div className="ws-3d-toolbar" role="toolbar" aria-label="Workshop 3D layer controls">
                    {(Object.keys(layers) as LayerKey[]).map((key) => (
                        <button
                            className={`ws-3d-tool-btn${layers[key] ? ' active' : ''}`}
                            key={key}
                            onClick={() => setLayers((current) => ({ ...current, [key]: !current[key] }))}
                            type="button"
                        >
                            {LAYER_LABEL[key]}
                        </button>
                    ))}
                </div>
                {/* Cardinal direction compass — rotates with camera; N=-z (into scene) */}
                <div className="ws-3d-compass" aria-label="Himmelsrichtungen" title="Kompass dreht sich mit der Kamera">
                    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <g ref={compassRef}>
                            <polygon points="32,4 28,23 36,23" fill="#c0392b" />
                            <polygon points="32,60 28,41 36,41" fill="#8d9fa6" />
                            <polygon points="60,32 41,28 41,36" fill="#8d9fa6" />
                            <polygon points="4,32 23,28 23,36" fill="#8d9fa6" />
                            <circle cx="32" cy="32" r="5" fill="#2c3e50" />
                            <text x="32" y="14" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#c0392b" fontFamily="system-ui,sans-serif">N</text>
                            <text x="32" y="62" textAnchor="middle" fontSize="10" fontWeight="600" fill="#607d8b" fontFamily="system-ui,sans-serif">S</text>
                            <text x="61" y="36" textAnchor="end" fontSize="10" fontWeight="600" fill="#607d8b" fontFamily="system-ui,sans-serif">O</text>
                            <text x="3" y="36" textAnchor="start" fontSize="10" fontWeight="600" fill="#607d8b" fontFamily="system-ui,sans-serif">W</text>
                        </g>
                    </svg>
                </div>
                <div className="ws-3d-source-badge">
                    Rough spatial model · no digital twin · zone-linked workshop orientation
                </div>
            </div>
            <aside className="ws-3d-panel">
                <div className="ws-3d-panel-head">
                    <strong>Workshop 3D</strong>
                    <span>{sceneData?.label}</span>
                </div>
                <div className="ws-3d-meta-grid">
                    <div>
                        <dt>Terrain</dt>
                        <dd>{sceneData?.terrain.length ?? '…'} layer · {CONFIDENCE_LABEL[sceneData?.terrain[0]?.confidence ?? ''] ?? 'unknown'}</dd>
                    </div>
                    <div>
                        <dt>Hulls</dt>
                        <dd>{sceneData?.buildingHulls.length ?? '…'} objects</dd>
                    </div>
                    <div>
                        <dt>Vegetation</dt>
                        <dd>{sceneData?.vegetation.length ?? '…'} clusters</dd>
                    </div>
                    <div>
                        <dt>Links</dt>
                        <dd>{sceneData?.evidenceLinks.length ?? '…'} evidence anchors</dd>
                    </div>
                </div>
                <div className="ws-3d-selected">
                    <strong>Selected zone</strong>
                    <span>{selectedZoneId ?? 'No zone selected'}</span>
                    {selectedObjects.map((object) => (
                        <button
                            className="ws-3d-object-chip"
                            key={object.id}
                            onClick={() => setActiveObjectId(object.id)}
                            type="button"
                        >
                            {object.label} · {CONFIDENCE_LABEL[object.confidence] ?? object.confidence}
                        </button>
                    ))}
                </div>
                {activeObject && (
                    <div className="ws-3d-object-detail">
                        <strong>{activeObject.label}</strong>
                        <span>Confidence: {CONFIDENCE_LABEL[activeObject.confidence] ?? activeObject.confidence}</span>
                        {'verificationStatus' in activeObject && activeObject.verificationStatus && (
                            <span>{VERIFICATION_LABEL[activeObject.verificationStatus] ?? activeObject.verificationStatus}</span>
                        )}
                        {'sourceId' in activeObject && (
                            <span>Source: {sourceMap.get(activeObject.sourceId)?.label ?? activeObject.sourceId}</span>
                        )}
                        {'role' in activeObject && activeObject.role && <span>Role: {activeObject.role}</span>}
                        {'historicalStatus' in activeObject && activeObject.historicalStatus && <span>Status: {activeObject.historicalStatus}</span>}
                        {activeZone && <span>Zone: {activeZone.name}</span>}
                        <span>Direct media links: {linkedAssetsForActiveObject.length}</span>
                    </div>
                )}
                <div className="ws-3d-evidence-panel">
                    <div className="ws-3d-evidence-head">
                        <strong>Linked evidence</strong>
                        <span>{activeZone?.name ?? activeZoneId ?? 'Select a spatial object'}</span>
                    </div>
                    <div className="ws-3d-evidence-counts">
                        <span>{assets?.length ?? 0} assets</span>
                        <span>{observations?.length ?? 0} observations</span>
                        <span>{interpretations?.length ?? 0} interpretations</span>
                        <span>{claims?.length ?? 0} claims</span>
                        <span>{questions?.length ?? 0} questions</span>
                        <span>{linkedAssetsForActiveObject.length} direct object links</span>
                        <span>{linkedScenes.length} scenes</span>
                    </div>
                    <EvidenceList
                        empty={activeObject ? 'No assets are linked directly to this spatial object yet.' : 'No linked assets for this zone yet.'}
                        items={(activeObject ? linkedAssetsForActiveObject : (assets ?? [])).slice(0, 3).map((asset) => ({
                            kind: 'asset' as const,
                            id: asset.id,
                            eyebrow: buildAssetEyebrow(asset, activeZone),
                            text: asset.title,
                            zoneId: activeZoneId ?? undefined,
                        }))}
                        onOpenEvidence={onOpenEvidence}
                        title={activeObject ? 'Spatially linked assets' : 'Assets'}
                    />
                    {activeObject && (
                        <EvidenceList
                            empty="No additional zone assets for this object context."
                            items={zoneAssetsWithoutDirectObjectLink.slice(0, 3).map((asset) => ({
                                kind: 'asset' as const,
                                id: asset.id,
                                eyebrow: buildAssetEyebrow(asset, activeZone),
                                text: asset.title,
                                zoneId: activeZoneId ?? undefined,
                            }))}
                            onOpenEvidence={onOpenEvidence}
                            title="Other zone assets"
                        />
                    )}
                    <EvidenceList
                        empty="No observations for this zone yet."
                        items={(observations ?? []).slice(0, 3).map((observation) => ({
                            kind: 'observation' as const,
                            id: observation.id,
                            eyebrow: observation.confidence,
                            text: observation.text,
                            zoneId: activeZoneId ?? undefined,
                        }))}
                        onOpenEvidence={onOpenEvidence}
                        title="Observations"
                    />
                    <EvidenceList
                        empty="No interpretations for this zone yet."
                        items={(interpretations ?? []).slice(0, 2).map((interpretation) => ({
                            kind: 'interpretation' as const,
                            id: interpretation.id,
                            eyebrow: interpretation.confidence,
                            text: interpretation.text,
                            zoneId: activeZoneId ?? undefined,
                        }))}
                        onOpenEvidence={onOpenEvidence}
                        title="Interpretations"
                    />
                    <EvidenceList
                        empty="No claims or questions for this zone yet."
                        items={[
                            ...(claims ?? []).slice(0, 2).map((claim) => ({
                                kind: 'claim' as const,
                                id: claim.id,
                                eyebrow: claim.claimType,
                                text: claim.statement,
                                zoneId: activeZoneId ?? undefined,
                            })),
                            ...(questions ?? []).slice(0, 2).map((question) => ({
                                kind: 'question' as const,
                                id: question.id,
                                eyebrow: question.priority,
                                text: question.text,
                                zoneId: activeZoneId ?? undefined,
                            })),
                        ]}
                        onOpenEvidence={onOpenEvidence}
                        title="Claims / Questions"
                    />
                    <EvidenceList
                        empty="No workshop scenes reference this zone evidence yet."
                        items={linkedScenes.slice(0, 3).map((scene) => ({
                            kind: 'scene' as const,
                            id: scene.id,
                            eyebrow: scene.exportStatus,
                            text: scene.title,
                            zoneId: activeZoneId ?? undefined,
                        }))}
                        onOpenEvidence={onOpenEvidence}
                        title="Scenes"
                    />
                </div>
                <div className="ws-3d-note">
                    This view is an explicit approximation for workshop orientation. Geometry is useful for discussion and evidence linking, not for measured design decisions.
                </div>
            </aside>
        </section>
    );
}

function getSpatialObjectZoneId(object: SpatialSceneObject | undefined): string | undefined {
    return object && 'zoneId' in object ? object.zoneId : undefined;
}

function buildAssetEyebrow(
    asset: {
        assetType: string;
        spatialAnchorType?: string;
        bearingConfidence?: string;
        targetZoneId?: string;
    },
    activeZone?: { id: string; name: string } | undefined,
): string {
    const parts = [
        asset.assetType,
        asset.spatialAnchorType,
        asset.bearingConfidence,
        asset.targetZoneId && activeZone && asset.targetZoneId !== activeZone.id ? `target:${asset.targetZoneId}` : null,
    ].filter(Boolean);
    return parts.join(' · ');
}

function EvidenceList({
    empty,
    items,
    onOpenEvidence,
    title,
}: {
    empty: string;
    items: Array<{ kind: WorkshopFocusKind; id: string; eyebrow: string; text: string; zoneId?: string }>;
    onOpenEvidence: (focus: { kind: WorkshopFocusKind; id: string; zoneId?: string }) => void;
    title: string;
}) {
    return (
        <div className="ws-3d-evidence-list">
            <strong>{title}</strong>
            {items.length === 0 ? (
                <span className="ws-3d-evidence-empty">{empty}</span>
            ) : (
                items.map((item) => (
                    <button
                        className="ws-3d-evidence-item"
                        key={item.id}
                        onClick={() => onOpenEvidence({ kind: item.kind, id: item.id, zoneId: item.zoneId })}
                        type="button"
                    >
                        <span>{item.eyebrow}</span>
                        <p>{item.text}</p>
                    </button>
                ))
            )}
        </div>
    );
}

function buildHullGeometry(footprint: { x: number; z: number }[], baseElevation: number, height: number): THREE.BufferGeometry {
    const positions: number[] = [];
    for (const point of footprint) positions.push(point.x, baseElevation, point.z);
    for (const point of footprint) positions.push(point.x, baseElevation + height, point.z);

    const n = footprint.length;
    const indices: number[] = [];
    const topShape = footprint.map((point) => new THREE.Vector2(point.x, point.z));
    const triangles = THREE.ShapeUtils.triangulateShape(topShape, []);

    for (const triangle of triangles) indices.push(triangle[0], triangle[2], triangle[1]);
    for (const triangle of triangles) indices.push(n + triangle[0], n + triangle[1], n + triangle[2]);
    for (let i = 0; i < n; i++) {
        const next = (i + 1) % n;
        indices.push(i, next, n + i);
        indices.push(next, n + next, n + i);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

function buildCourtyardOutline(
    courtyard: { x: number; z: number }[],
    y: number,
    selected: boolean,
    plannedOnly: boolean,
): THREE.LineLoop {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(courtyard.flatMap((point) => [point.x, y, point.z]), 3));
    return new THREE.LineLoop(
        geometry,
        new THREE.LineBasicMaterial({
            color: selected ? 0xf6fff8 : plannedOnly ? 0x6b7280 : 0x3d3328,
            transparent: true,
            opacity: plannedOnly ? 0.72 : 0.82,
        }),
    );
}

function centerOfFootprint(footprint: { x: number; z: number }[], baseElevation: number): THREE.Vector3 {
    const sum = footprint.reduce((acc, point) => {
        acc.x += point.x;
        acc.z += point.z;
        return acc;
    }, { x: 0, z: 0 });
    return new THREE.Vector3(sum.x / footprint.length, baseElevation + 0.18, sum.z / footprint.length);
}

function buildTransitionLine(from: THREE.Vector3, to: THREE.Vector3): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    return new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({ color: 0x6f7f68, transparent: true, opacity: 0.58 }),
    );
}
