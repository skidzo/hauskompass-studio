import { readExifData, type ExifGpsData } from './exif';
import type { MediaOriginKind } from './types';

export interface StudioMediaSelectionItem {
  id: string;
  file: File;
  title: string;
  mimeType: string;
  isImage: boolean;
  previewUrl?: string;
  exifData: ExifGpsData | null;
  capturedAt?: string;
  origin: MediaOriginKind;
}

interface PrepareStudioMediaSelectionOptions {
  idPrefix?: string;
  includePreviewUrl?: boolean;
  inferOrigin?: (file: File) => MediaOriginKind;
}

export async function prepareStudioMediaSelection(
  files: FileList | File[],
  options: PrepareStudioMediaSelectionOptions = {},
): Promise<StudioMediaSelectionItem[]> {
  const {
    idPrefix = 'media',
    includePreviewUrl = false,
    inferOrigin = () => 'unknown',
  } = options;

  return Promise.all(Array.from(files).map(async (file) => {
    const exifData = await readExifData(file);
    return {
      id: createStudioMediaSelectionId(idPrefix),
      file,
      title: mediaTitleFromFileName(file.name),
      mimeType: file.type,
      isImage: file.type.startsWith('image/'),
      previewUrl: includePreviewUrl && file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      exifData,
      capturedAt: exifData?.capturedAt?.slice(0, 10),
      origin: inferOrigin(file),
    } satisfies StudioMediaSelectionItem;
  }));
}

export function releaseStudioMediaSelection(items: Pick<StudioMediaSelectionItem, 'previewUrl'>[]) {
  items.forEach((item) => {
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
  });
}

export function createStudioMediaSelectionId(prefix = 'media'): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rnd}`;
}

export function mediaTitleFromFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
}
