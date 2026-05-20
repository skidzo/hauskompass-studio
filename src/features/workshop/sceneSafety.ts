import type { Claim, Observation, Question, WorkshopScene } from '@/domain/workshop/types';
import type { AssetRecord } from './db/workshopDb';

type AssetPublicationInfo = Pick<AssetRecord, 'id' | 'sensitivityLevel' | 'publicationStatus'>;
type ObservationPublicationInfo = Pick<Observation, 'id' | 'sensitivityLevel' | 'publicationStatus'>;
type ClaimPublicationInfo = Pick<Claim, 'id' | 'sensitivityLevel' | 'publicationStatus'>;
type QuestionPublicationInfo = Pick<Question, 'id' | 'sensitivityLevel' | 'publicationStatus'>;

type EvidencePublicationInfo =
    | AssetPublicationInfo
    | ObservationPublicationInfo
    | ClaimPublicationInfo
    | QuestionPublicationInfo;

export interface SceneSafetyInputs {
    assets?: AssetPublicationInfo[];
    observations?: ObservationPublicationInfo[];
    claims?: ClaimPublicationInfo[];
    questions?: QuestionPublicationInfo[];
}

export type SceneSafetyIssueCode =
    | 'scene_not_public'
    | 'scene_not_publishable'
    | 'asset_not_public'
    | 'asset_missing'
    | 'observation_not_public'
    | 'observation_missing'
    | 'claim_not_public'
    | 'claim_missing'
    | 'question_not_public'
    | 'question_missing';

export interface SceneSafetyIssue {
    code: SceneSafetyIssueCode;
    label: string;
    linkedId?: string;
}

export interface SceneSafetyEvaluation {
    isPubliclyExportable: boolean;
    blockingIssues: SceneSafetyIssue[];
}

export interface SceneExportReportItem {
    scene: WorkshopScene;
    evaluation: SceneSafetyEvaluation;
}

export interface SceneExportReport {
    mode: 'public' | 'internal';
    included: SceneExportReportItem[];
    excluded: SceneExportReportItem[];
}

export function isAssetPubliclyExportable(asset: AssetPublicationInfo): boolean {
    return asset.sensitivityLevel === 'public' && asset.publicationStatus === 'publishable';
}

export function hasOnlyPubliclyExportableAssets(
    selectedAssetIds: string[],
    assets: AssetPublicationInfo[],
): boolean {
    const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
    return selectedAssetIds.every((id) => {
        const asset = assetsById.get(id);
        return asset ? isAssetPubliclyExportable(asset) : false;
    });
}

export function normalizeScenePublicationForAssets(
    scene: WorkshopScene,
    assets: AssetPublicationInfo[],
): WorkshopScene {
    return normalizeScenePublicationForReferences(scene, { assets });
}

export function normalizeScenePublicationForReferences(
    scene: WorkshopScene,
    inputs: SceneSafetyInputs,
): WorkshopScene {
    const requestsPublicUse = scene.visibility === 'public' || scene.publicationStatus === 'publishable';
    if (!requestsPublicUse) return scene;
    if (evaluateSceneForPublicExport(scene, inputs).isPubliclyExportable) return scene;

    return {
        ...scene,
        visibility: 'internal',
        publicationStatus: 'needs_review',
        exportStatus: scene.exportStatus === 'ready' ? 'draft' : scene.exportStatus,
    };
}

export function evaluateSceneForPublicExport(
    scene: WorkshopScene,
    inputs: SceneSafetyInputs,
): SceneSafetyEvaluation {
    const blockingIssues: SceneSafetyIssue[] = [];

    if (scene.visibility !== 'public') {
        blockingIssues.push({
            code: 'scene_not_public',
            label: 'Sichtbarkeit ist nicht auf öffentlich gesetzt.',
        });
    }
    if (scene.publicationStatus !== 'publishable') {
        blockingIssues.push({
            code: 'scene_not_publishable',
            label: 'Szenenstatus ist nicht veröffentlichbar.',
        });
    }

    pushLinkedEvidenceIssues(blockingIssues, scene.selectedAssetIds, inputs.assets ?? [], 'asset');
    pushLinkedEvidenceIssues(blockingIssues, scene.selectedObservationIds ?? [], inputs.observations ?? [], 'observation');
    pushLinkedEvidenceIssues(blockingIssues, scene.selectedClaimIds ?? [], inputs.claims ?? [], 'claim');
    pushLinkedEvidenceIssues(blockingIssues, scene.selectedQuestionIds ?? [], inputs.questions ?? [], 'question');

    return {
        isPubliclyExportable: blockingIssues.length === 0,
        blockingIssues,
    };
}

export function buildSceneExportReport(
    scenes: WorkshopScene[],
    inputs: SceneSafetyInputs,
    mode: 'public' | 'internal',
): SceneExportReport {
    const items = scenes.map((scene) => ({
        scene,
        evaluation: evaluateSceneForPublicExport(scene, inputs),
    }));

    if (mode === 'internal') {
        return {
            mode,
            included: items.filter(({ scene }) => scene.publicationStatus !== 'do_not_publish'),
            excluded: items.filter(({ scene }) => scene.publicationStatus === 'do_not_publish'),
        };
    }

    return {
        mode,
        included: items.filter(({ evaluation }) => evaluation.isPubliclyExportable),
        excluded: items.filter(({ evaluation }) => !evaluation.isPubliclyExportable),
    };
}

function pushLinkedEvidenceIssues(
    issues: SceneSafetyIssue[],
    linkedIds: string[],
    items: EvidencePublicationInfo[],
    kind: 'asset' | 'observation' | 'claim' | 'question',
) {
    const itemsById = new Map(items.map((item) => [item.id, item]));
    for (const linkedId of linkedIds) {
        const item = itemsById.get(linkedId);
        if (!item) {
            issues.push({
                code: `${kind}_missing` as SceneSafetyIssueCode,
                linkedId,
                label: `${labelForKind(kind)} ${linkedId} fehlt.`,
            });
            continue;
        }
        if (item.sensitivityLevel !== 'public' || item.publicationStatus !== 'publishable') {
            issues.push({
                code: `${kind}_not_public` as SceneSafetyIssueCode,
                linkedId,
                label: `${labelForKind(kind)} ${linkedId} ist nicht öffentlich freigegeben.`,
            });
        }
    }
}

function labelForKind(kind: 'asset' | 'observation' | 'claim' | 'question'): string {
    switch (kind) {
        case 'asset':
            return 'Asset';
        case 'observation':
            return 'Beobachtung';
        case 'claim':
            return 'Claim';
        case 'question':
            return 'Frage';
    }
}
