/**
 * Thumbnail generator for ingested media assets.
 *
 * Generates a 200×200 thumbnail for image files via an off-screen <canvas>.
 * For non-image files, returns null — callers should show a type icon instead.
 *
 * Returns a data-URL (jpeg, quality 0.75) suitable for embedding in <img src>.
 * Mode-neutral: usable by Workshop and Renovation capture surfaces.
 */

const THUMB_SIZE = 200;

/**
 * Generate a thumbnail data-URL from an image File/Blob.
 * Returns null if the file is not a supported image type.
 */
export async function generateThumbnail(file: File): Promise<string | null> {
    if (!file.type.startsWith('image/')) return null;

    return new Promise<string | null>((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url);

            const canvas = document.createElement('canvas');
            const { width, height } = fitSquare(img.naturalWidth, img.naturalHeight, THUMB_SIZE);
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(null); return; }

            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.75));
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
        };

        img.src = url;
    });
}

/**
 * Scale width×height to fit within maxSize×maxSize, preserving aspect ratio.
 */
function fitSquare(w: number, h: number, maxSize: number): { width: number; height: number } {
    if (w <= maxSize && h <= maxSize) return { width: w, height: h };
    const ratio = Math.min(maxSize / w, maxSize / h);
    return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

/**
 * Return a human-readable file size string.
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
