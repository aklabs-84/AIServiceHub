
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    // Use 0 decimal places for Bytes, 2 for others
    const dm = i === 0 ? 0 : 2;

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function getProxiedImageUrl(url: string | null | undefined): string {
    if (!url) return '';
    const raw = url.trim();
    if (!raw) return '';

    const driveMatch = raw.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
    if (driveMatch?.[1]) {
        return `/api/image-proxy?url=${encodeURIComponent(`https://drive.google.com/uc?export=view&id=${driveMatch[1]}`)}`;
    }

    const driveIdParam = raw.match(/[?&]id=([^&]+)/i);
    if (raw.includes('drive.google.com') && driveIdParam?.[1]) {
        return `/api/image-proxy?url=${encodeURIComponent(`https://drive.google.com/uc?export=view&id=${driveIdParam[1]}`)}`;
    }

    // Already a proxy URL or local path
    if (raw.startsWith('/') || raw.includes('/api/image-proxy')) {
        return raw;
    }

    return raw;
}
