/**
 * Zweck: Geprüfte lokale und Web-Bildkandidaten in das Eiermann-Media-Manifest integrieren.
 * Aufruf: node utils/generate-media-manifest.mjs --local output/eiermann-local-media-candidates.json --web output/eiermann-web-media-candidates.json --approve ids.json|all
 * Output: public/local-media/eiermann-campus-pascalstrasse-100/media-manifest.json und kopierte/heruntergeladene Bilder
 * Abhängigkeiten: keine
 */

import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const PROJECT_ID = 'proj-eiermann-campus';
const SITE_ID = 'site-eiermann-campus';
const MEDIA_SLUG = 'eiermann-campus-pascalstrasse-100';
const MEDIA_ROOT = path.join(appRoot, `public/local-media/${MEDIA_SLUG}`);
const IMAGE_ROOT = path.join(MEDIA_ROOT, 'images');
const MANIFEST_PATH = path.join(MEDIA_ROOT, 'media-manifest.json');
const UNKNOWN_CAPTURED_AT = '1984-01-01T00:00:00.000Z';

export function generateAssetId(filename, capturedAt) {
    const stable = [String(filename), String(capturedAt ?? '')].join('|');
    return `A-${createHash('sha1').update(stable).digest('hex').slice(0, 10).toUpperCase()}`;
}

export function sanitizeFilename(name) {
    const ext = path.extname(name).toLowerCase() || '.jpg';
    const stem = path.basename(name, path.extname(name));
    const normalized = stem
        .replace(/[Ää]/g, 'ae')
        .replace(/[Öö]/g, 'oe')
        .replace(/[Üü]/g, 'ue')
        .replace(/ß/g, 'ss')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    const shouldLower = /[^\x00-\x7F]/.test(stem) || /[a-z]/.test(stem);
    const safeStem = shouldLower ? normalized.toLowerCase() : normalized;
    return `${safeStem || 'bild'}${ext}`;
}

export function mergeManifest(existing, incoming, generatedAt = new Date().toISOString()) {
    const byId = new Set((existing.assets ?? []).map((entry) => entry.asset.id));
    const assets = [...(existing.assets ?? [])];
    for (const entry of incoming) {
        if (byId.has(entry.asset.id)) continue;
        assets.push(entry);
        byId.add(entry.asset.id);
    }
    return {
        projectId: existing.projectId ?? PROJECT_ID,
        generatedAt,
        assets,
    };
}

function parseArgs(argv) {
    const args = { local: null, web: null, approve: null };
    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i] === '--local' && argv[i + 1]) {
            args.local = path.resolve(appRoot, argv[i + 1]);
            i += 1;
        } else if (argv[i] === '--web' && argv[i + 1]) {
            args.web = path.resolve(appRoot, argv[i + 1]);
            i += 1;
        } else if (argv[i] === '--approve' && argv[i + 1]) {
            args.approve = argv[i + 1];
            i += 1;
        }
    }
    if (!args.approve) throw new Error('Missing --approve ids.json|all');
    return args;
}

async function readJsonIfExists(filePath, fallback) {
    if (!filePath) return fallback;
    try {
        return JSON.parse(await readFile(filePath, 'utf8'));
    } catch {
        return fallback;
    }
}

async function readApprovals(approveArg) {
    if (approveArg === 'all') return 'all';
    return JSON.parse(await readFile(path.resolve(appRoot, approveArg), 'utf8'));
}

function unwrapCandidates(data) {
    if (Array.isArray(data)) return data;
    return data?.candidates ?? [];
}

function approvedCandidates(candidates, approvals) {
    if (approvals === 'all') return candidates.filter((candidate) => candidate.sourceKind !== 'web_reference' || candidate.canDownload === true);
    const ids = new Set(approvals);
    return candidates.filter((candidate) => ids.has(candidate.id));
}

function fileNameForCandidate(candidate) {
    const original = candidate.fileName ?? candidate.title ?? candidate.id ?? 'bild.jpg';
    const assetId = generateAssetId(original, candidate.capturedAt);
    return `${assetId}-${sanitizeFilename(original)}`;
}

async function copyLocalCandidate(candidate, fileName) {
    const target = path.join(IMAGE_ROOT, fileName);
    await copyFile(candidate.filePath, target);
    const fileInfo = await stat(target);
    return { fileSize: fileInfo.size, url: `/local-media/${MEDIA_SLUG}/images/${fileName}` };
}

async function downloadWebCandidate(candidate, fileName) {
    const downloadUrl = candidate.downloadUrl ?? candidate.sourceUrl;
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error(`Download failed for ${candidate.id}: ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const target = path.join(IMAGE_ROOT, fileName);
    await writeFile(target, bytes);
    return { fileSize: bytes.length, url: `/local-media/${MEDIA_SLUG}/images/${fileName}` };
}

function candidateToAsset(candidate, fileName, fileSize) {
    const now = new Date().toISOString();
    return {
        id: generateAssetId(candidate.fileName ?? candidate.title ?? candidate.id ?? 'bild.jpg', candidate.capturedAt),
        projectId: PROJECT_ID,
        siteId: SITE_ID,
        assetType: 'photo',
        zoneId: candidate.suggestedZoneId,
        title: candidate.suggestedTitle ?? candidate.title ?? fileName,
        description: candidate.spatialNotes,
        fileName,
        mimeType: candidate.mimeType ?? 'image/jpeg',
        fileSize: fileSize ?? candidate.fileSize ?? 0,
        sensitivityLevel: 'public',
        publicationStatus: 'needs_review',
        processingStatus: 'raw',
        tags: ['eiermann-campus', candidate.sourceKind ?? 'media-candidate'].filter(Boolean),
        gpsLat: candidate.gpsLat,
        gpsLon: candidate.gpsLon,
        gpsAlt: candidate.gpsAlt,
        gpsBearing: candidate.gpsBearing,
        capturedAt: candidate.capturedAt ?? UNKNOWN_CAPTURED_AT,
        createdAt: now,
        updatedAt: now,
        sourceId: candidate.sourceId ?? 'src-media-import-2026-05-19',
        sourceKind: candidate.sourceKind,
        verificationStatus: candidate.verificationStatus ?? 'inferred_geometry',
        datePrecision: candidate.datePrecision ?? 'decade',
        license: candidate.license,
        licenseUrl: candidate.licenseUrl,
        author: candidate.author,
        sourceUrl: candidate.sourceUrl,
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const approvals = await readApprovals(args.approve);
    const localCandidates = unwrapCandidates(await readJsonIfExists(args.local, []));
    const webCandidates = unwrapCandidates(await readJsonIfExists(args.web, []));
    const candidates = approvedCandidates([...localCandidates, ...webCandidates], approvals);

    await mkdir(IMAGE_ROOT, { recursive: true });

    const entries = [];
    for (const candidate of candidates) {
        const fileName = fileNameForCandidate(candidate);
        try {
            const media = candidate.sourceKind === 'web_reference'
                ? await downloadWebCandidate(candidate, fileName)
                : await copyLocalCandidate(candidate, fileName);
            entries.push({
                asset: candidateToAsset(candidate, fileName, media.fileSize),
                url: media.url,
            });
        } catch (err) {
            console.warn(`[generate-media-manifest] WARN: ${candidate.id} — ${err.message} (metadata-only)`);
            entries.push({
                asset: candidateToAsset(candidate, fileName, 0),
                url: null,
            });
        }
    }

    const existing = await readJsonIfExists(MANIFEST_PATH, { projectId: PROJECT_ID, generatedAt: null, assets: [] });
    const merged = mergeManifest(existing, entries);
    await writeFile(MANIFEST_PATH, `${JSON.stringify(merged, null, 4)}\n`);
    console.info(`[generate-media-manifest] approved=${candidates.length} merged=${merged.assets.length}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    await main();
}
