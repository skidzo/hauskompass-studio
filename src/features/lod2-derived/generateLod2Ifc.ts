/**
 * generateLod2Ifc.ts
 * ------------------
 * Generates a minimal valid IFC2X3 STEP file from a Lod2Candidate
 * entirely in the browser — no Python pipeline required.
 *
 * Each LoD2 surface becomes an IfcBuildingElementProxy with
 * IfcShellBasedSurfaceModel geometry in local coordinates.
 */

import type { Lod2Candidate, SurfacePoint } from '@/features/project-store/types';

// ── IFC GUID ──────────────────────────────────────────────────────────────
// IFC uses a 22-character base64 string (non-standard alphabet).
function ifcGuid(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
    const bytes = crypto.getRandomValues(new Uint8Array(22));
    return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function fmt(n: number): string {
    return n.toFixed(4);
}

// ── Main generator ─────────────────────────────────────────────────────────
export function generateIfcStep(candidate: Lod2Candidate, address: string): string {
    const { bboxUtm32, surfaces } = candidate;
    const baseE = bboxUtm32.minE;
    const baseN = bboxUtm32.minN;
    const baseZ = bboxUtm32.minZ;

    let idCounter = 0;
    const nextId = () => ++idCounter;
    const lines: string[] = [];
    const push = (s: string) => lines.push(s);

    // ── Fixed entity IDs ──────────────────────────────────────────────────
    const ID = {
        project: nextId(),
        ownerHist: nextId(),
        personOrg: nextId(),
        person: nextId(),
        org: nextId(),
        app: nextId(),
        unitAssign: nextId(),
        lengthUnit: nextId(),
        areaUnit: nextId(),
        geomCtx: nextId(),
        originPt: nextId(),
        axis: nextId(),
        rootPlac: nextId(),
        site: nextId(),
        building: nextId(),
        storey: nextId(),
        aggSite: nextId(),
        aggBuilding: nextId(),
        aggStorey: nextId(),
    };

    const safeAddr = address.replace(/'/g, '').slice(0, 80);

    push(`#${ID.project}=IFCPROJECT('${ifcGuid()}',#${ID.ownerHist},'${safeAddr}',$,$,$,$,(#${ID.geomCtx}),#${ID.unitAssign});`);
    push(`#${ID.ownerHist}=IFCOWNERHISTORY(#${ID.personOrg},#${ID.app},$,.NOTDEFINED.,$,$,$,0);`);
    push(`#${ID.personOrg}=IFCPERSONANDORGANIZATION(#${ID.person},#${ID.org},$);`);
    push(`#${ID.person}=IFCPERSON($,'Hauskompass',$,$,$,$,$,$);`);
    push(`#${ID.org}=IFCORGANIZATION($,'Hauskompass',$,$,$);`);
    push(`#${ID.app}=IFCAPPLICATION(#${ID.org},'1.0','Hauskompass','Hauskompass');`);
    push(`#${ID.lengthUnit}=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);`);
    push(`#${ID.areaUnit}=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);`);
    push(`#${ID.unitAssign}=IFCUNITASSIGNMENT((#${ID.lengthUnit},#${ID.areaUnit}));`);
    push(`#${ID.originPt}=IFCCARTESIANPOINT((0.,0.,0.));`);
    push(`#${ID.axis}=IFCAXIS2PLACEMENT3D(#${ID.originPt},$,$);`);
    push(`#${ID.geomCtx}=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-5,#${ID.axis},$);`);
    push(`#${ID.rootPlac}=IFCLOCALPLACEMENT($,#${ID.axis});`);
    push(`#${ID.site}=IFCSITE('${ifcGuid()}',#${ID.ownerHist},'Site',$,$,#${ID.rootPlac},$,$,.ELEMENT.,$,$,$,$,$);`);
    push(`#${ID.building}=IFCBUILDING('${ifcGuid()}',#${ID.ownerHist},'${safeAddr}',$,$,#${ID.rootPlac},$,$,.ELEMENT.,$,$,$);`);
    push(`#${ID.storey}=IFCBUILDINGSTOREY('${ifcGuid()}',#${ID.ownerHist},'EG',$,$,#${ID.rootPlac},$,$,.ELEMENT.,0.0);`);
    push(`#${ID.aggSite}=IFCRELAGGREGATES('${ifcGuid()}',#${ID.ownerHist},$,$,#${ID.project},(#${ID.site}));`);
    push(`#${ID.aggBuilding}=IFCRELAGGREGATES('${ifcGuid()}',#${ID.ownerHist},$,$,#${ID.site},(#${ID.building}));`);
    push(`#${ID.aggStorey}=IFCRELAGGREGATES('${ifcGuid()}',#${ID.ownerHist},$,$,#${ID.building},(#${ID.storey}));`);

    // ── Surfaces → IFC entities ───────────────────────────────────────────
    const elementIds: number[] = [];

    type Surf = { id: string; kind: 'ground' | 'wall' | 'roof'; points: SurfacePoint[] };
    const allSurfaces: Surf[] = [
        ...surfaces.ground.map((s) => ({ id: s.id, kind: 'ground' as const, points: s.points })),
        ...surfaces.wall.map((s) => ({ id: s.id, kind: 'wall' as const, points: s.points })),
        ...surfaces.roof.map((s) => ({ id: s.id, kind: 'roof' as const, points: s.points })),
    ];

    for (const surface of allSurfaces) {
        // Remove closing duplicate point if present
        let pts = surface.points;
        if (pts.length > 3) {
            const first = pts[0];
            const last = pts[pts.length - 1];
            if (
                Math.abs(first.e - last.e) < 0.002 &&
                Math.abs(first.n - last.n) < 0.002 &&
                Math.abs(first.z - last.z) < 0.002
            ) {
                pts = pts.slice(0, -1);
            }
        }
        if (pts.length < 3) continue;

        const ptIds = pts.map((p) => {
            const pid = nextId();
            push(`#${pid}=IFCCARTESIANPOINT((${fmt(p.e - baseE)},${fmt(p.n - baseN)},${fmt(p.z - baseZ)}));`);
            return pid;
        });

        const loopId = nextId();
        push(`#${loopId}=IFCPOLYLOOP((${ptIds.map((i) => '#' + i).join(',')}));`);

        const boundId = nextId();
        push(`#${boundId}=IFCFACEOUTERBOUND(#${loopId},.T.);`);

        const faceId = nextId();
        push(`#${faceId}=IFCFACE((#${boundId}));`);

        const shellId = nextId();
        push(`#${shellId}=IFCOPENSHELL((#${faceId}));`);

        const modelId = nextId();
        push(`#${modelId}=IFCSHELLBASEDSURFACEMODEL((#${shellId}));`);

        const reprId = nextId();
        push(`#${reprId}=IFCSHAPEREPRESENTATION(#${ID.geomCtx},'Body','SurfaceModel',(#${modelId}));`);

        const pdsId = nextId();
        push(`#${pdsId}=IFCPRODUCTDEFINITIONSHAPE($,$,(#${reprId}));`);

        const placId = nextId();
        push(`#${placId}=IFCLOCALPLACEMENT(#${ID.rootPlac},#${ID.axis});`);

        const elemId = nextId();
        const shortId = surface.id.slice(-12);
        push(
            `#${elemId}=IFCBUILDINGELEMENTPROXY('${ifcGuid()}',#${ID.ownerHist},'${surface.kind}-${shortId}',$,$,#${placId},#${pdsId},$,$);`,
        );
        elementIds.push(elemId);
    }

    if (elementIds.length > 0) {
        const contId = nextId();
        push(
            `#${contId}=IFCRELCONTAINEDINSPATIALSTRUCTURE('${ifcGuid()}',#${ID.ownerHist},$,$,(${elementIds.map((i) => '#' + i).join(',')}),#${ID.storey});`,
        );
    }

    const today = new Date().toISOString().slice(0, 10);
    const header = [
        'ISO-10303-21;',
        'HEADER;',
        `FILE_DESCRIPTION(('Hauskompass LoD2 — ${safeAddr}'),'2;1');`,
        `FILE_NAME('hauskompass_lod2_${candidate.id}.ifc','${today}',(),$,'','Hauskompass','');`,
        "FILE_SCHEMA(('IFC2X3'));",
        'ENDSEC;',
        'DATA;',
    ];

    return [...header, ...lines, 'ENDSEC;', 'END-ISO-10303-21;'].join('\n');
}
