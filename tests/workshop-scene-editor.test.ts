import 'fake-indexeddb/auto';

import type { WorkshopScene } from '../src/domain/workshop/types';
import {
    buildSceneExportReport,
    normalizeScenePublicationForAssets,
    normalizeScenePublicationForReferences,
} from '../src/features/workshop/sceneSafety';
import {
    exportWorkshopBundle,
    saveAsset,
    saveWorkshopScene,
    workshopDb,
    type AssetRecord,
} from '../src/features/workshop/db/workshopDb';
import { buildExportBlob } from '../src/features/workshop/export/workshopExport';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const PROJECT_ID = 'proj-scene-editor-test';
const PUBLIC_ASSET_ID = 'A-SCENE-PUBLIC';
const INTERNAL_ASSET_ID = 'A-SCENE-INTERNAL';
const SCENE_ID = 'WS-SCENE-EDITOR-TEST';

const publicAsset: AssetRecord = {
    id: PUBLIC_ASSET_ID,
    projectId: PROJECT_ID,
    zoneId: 'z-test',
    assetType: 'photo',
    title: 'Public asset',
    tags: [],
    processingStatus: 'raw',
    sensitivityLevel: 'public',
    publicationStatus: 'publishable',
    createdAt: '2026-05-17T10:00:00',
    updatedAt: '2026-05-17T10:00:00',
};

const internalAsset: AssetRecord = {
    id: INTERNAL_ASSET_ID,
    projectId: PROJECT_ID,
    zoneId: 'z-test',
    assetType: 'other',
    title: 'Internal placeholder',
    tags: [],
    processingStatus: 'raw',
    sensitivityLevel: 'internal',
    publicationStatus: 'internal_only',
    createdAt: '2026-05-17T10:01:00',
    updatedAt: '2026-05-17T10:01:00',
};

function makeScene(patch: Partial<WorkshopScene> = {}): WorkshopScene {
    return {
        id: SCENE_ID,
        projectId: PROJECT_ID,
        title: 'Editor scene',
        guidingQuestion: 'Can captured material become a workshop scene?',
        selectedAssetIds: [PUBLIC_ASSET_ID],
        selectedObservationIds: ['OBS-1'],
        selectedClaimIds: ['C-1'],
        selectedQuestionIds: ['Q-1'],
        contextText: 'Context',
        observations: ['Observation text'],
        interpretations: ['Claim: statement'],
        openQuestions: ['Open question'],
        discussionPrompt: 'Discuss this responsibly.',
        exportStatus: 'draft',
        visibility: 'internal',
        sortOrder: 99,
        sensitivityLevel: 'internal',
        publicationStatus: 'needs_review',
        createdAt: '2026-05-17T10:02:00',
        updatedAt: '2026-05-17T10:02:00',
        ...patch,
    };
}

beforeAll(async () => {
    await workshopDb.projects.put({
        id: PROJECT_ID,
        slug: 'scene-editor-test',
        title: 'Scene Editor Test',
        description: 'Minimal WorkshopScene editor persistence test',
        siteId: 'site-scene-editor-test',
        projectMode: 'active',
        createdAt: '2026-05-17T00:00:00',
        updatedAt: '2026-05-17T00:00:00',
        version: '0.0.1',
        sensitivityDefault: 'internal',
        publicationDefault: 'internal_only',
    });
    await saveAsset(publicAsset, new Blob(['asset'], { type: 'image/jpeg' }));
    await saveAsset(internalAsset);
});

afterAll(async () => {
    await workshopDb.workshopScenes.delete(SCENE_ID);
    await workshopDb.assets.delete(PUBLIC_ASSET_ID);
    await workshopDb.assets.delete(INTERNAL_ASSET_ID);
    await workshopDb.assetBlobs.delete(PUBLIC_ASSET_ID);
    await workshopDb.projects.delete(PROJECT_ID);
});

describe('scene publication safety', () => {
    it('keeps a public scene when all selected assets are public and publishable', () => {
        const scene = makeScene({
            selectedAssetIds: [PUBLIC_ASSET_ID],
            selectedObservationIds: [],
            selectedClaimIds: [],
            selectedQuestionIds: [],
            visibility: 'public',
            publicationStatus: 'publishable',
            exportStatus: 'ready',
        });

        expect(normalizeScenePublicationForAssets(scene, [publicAsset])).toMatchObject({
            visibility: 'public',
            publicationStatus: 'publishable',
            exportStatus: 'ready',
        });
    });

    it('downgrades public scenes that reference internal assets', () => {
        const scene = makeScene({
            selectedAssetIds: [INTERNAL_ASSET_ID],
            visibility: 'public',
            publicationStatus: 'publishable',
            exportStatus: 'ready',
        });

        expect(normalizeScenePublicationForAssets(scene, [internalAsset])).toMatchObject({
            visibility: 'internal',
            publicationStatus: 'needs_review',
            exportStatus: 'draft',
        });
    });

    it('downgrades public scenes that link internal observations even when assets are public', () => {
        const scene = makeScene({
            selectedAssetIds: [PUBLIC_ASSET_ID],
            visibility: 'public',
            publicationStatus: 'publishable',
            exportStatus: 'ready',
        });

        expect(normalizeScenePublicationForReferences(scene, {
            assets: [publicAsset],
            observations: [{ id: 'OBS-1', sensitivityLevel: 'internal', publicationStatus: 'needs_review' }],
            claims: [{ id: 'C-1', sensitivityLevel: 'public', publicationStatus: 'publishable' }],
            questions: [{ id: 'Q-1', sensitivityLevel: 'public', publicationStatus: 'publishable' }],
        })).toMatchObject({
            visibility: 'internal',
            publicationStatus: 'needs_review',
            exportStatus: 'draft',
        });
    });
});

describe('saveWorkshopScene', () => {
    it('persists editor-created scene references and text lists', async () => {
        await saveWorkshopScene(makeScene());

        const stored = await workshopDb.workshopScenes.get(SCENE_ID);
        expect(stored?.selectedAssetIds).toEqual([PUBLIC_ASSET_ID]);
        expect(stored?.selectedObservationIds).toEqual(['OBS-1']);
        expect(stored?.selectedClaimIds).toEqual(['C-1']);
        expect(stored?.selectedQuestionIds).toEqual(['Q-1']);
        expect(stored?.observations).toContain('Observation text');
    });

    it('includes editor-created scenes in the JSON backup bundle', async () => {
        await saveWorkshopScene(makeScene());

        const bundle = await exportWorkshopBundle(PROJECT_ID);
        expect(bundle.workshopScenes.map((scene) => scene.id)).toContain(SCENE_ID);
    });

    it('keeps downgraded sensitive scenes out of public HTML export', async () => {
        const downgraded = normalizeScenePublicationForAssets(makeScene({
            selectedAssetIds: [INTERNAL_ASSET_ID],
            visibility: 'public',
            publicationStatus: 'publishable',
            title: 'Should not be public',
        }), [internalAsset]);
        await saveWorkshopScene(downgraded);

        const blob = buildExportBlob([downgraded], { mode: 'public', projectTitle: 'Test' });
        await expect(blob.text()).resolves.not.toContain('Should not be public');
    });

    it('keeps publishable-but-internal scenes out of public HTML export', async () => {
        const internalVisibilityScene = makeScene({
            title: 'Still internal',
            visibility: 'internal',
            publicationStatus: 'publishable',
            selectedAssetIds: [PUBLIC_ASSET_ID],
        });

        const blob = buildExportBlob([internalVisibilityScene], { mode: 'public', projectTitle: 'Test' });
        await expect(blob.text()).resolves.not.toContain('Still internal');
    });

    it('builds a public export report that excludes linked internal evidence', () => {
        const report = buildSceneExportReport([
            makeScene({
                id: 'WS-PUBLIC-OK',
                visibility: 'public',
                publicationStatus: 'publishable',
                selectedAssetIds: [PUBLIC_ASSET_ID],
                selectedObservationIds: [],
                selectedClaimIds: [],
                selectedQuestionIds: [],
            }),
            makeScene({
                id: 'WS-PUBLIC-BLOCKED',
                title: 'Blocked by question',
                visibility: 'public',
                publicationStatus: 'publishable',
                selectedAssetIds: [PUBLIC_ASSET_ID],
                selectedObservationIds: [],
            }),
        ], {
            assets: [publicAsset],
            observations: [],
            claims: [{ id: 'C-1', sensitivityLevel: 'public', publicationStatus: 'publishable' }],
            questions: [{ id: 'Q-1', sensitivityLevel: 'internal', publicationStatus: 'internal_only' }],
        }, 'public');

        expect(report.included.map((item) => item.scene.id)).toEqual(['WS-PUBLIC-OK']);
        expect(report.excluded.map((item) => item.scene.id)).toContain('WS-PUBLIC-BLOCKED');
        const blocked = report.excluded.find((item) => item.scene.id === 'WS-PUBLIC-BLOCKED');
        expect(blocked?.evaluation.blockingIssues.some((issue) => issue.code === 'question_not_public')).toBe(true);
    });
});
