// Extract a Torus media path (/media/...) from an absolute or relative URL.
const extractMediaPath = (url: string): string | null => {
  const match = url.match(/\/media\/[^\s?#]+/i);
  return match ? match[0] : null;
};

const isCrossOriginUrl = (src: string): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const resolved = new URL(src, window.location.origin);
    return resolved.origin !== window.location.origin;
  } catch {
    return false;
  }
};

const isSameOriginFetch = (url: string): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  if (url.startsWith('/')) {
    return true;
  }
  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
};

// Build an ordered list of URLs to try when fetching GIF bytes for decoding.
// Cross-origin sources (external GIF URLs, dev MinIO on another port) are fetched
// through the Torus same-origin proxy first so gifuct-js can decode frames.
export const buildGifFetchCandidates = (src: string): string[] => {
  const candidates: string[] = [];

  if (typeof window !== 'undefined' && isCrossOriginUrl(src)) {
    candidates.push(`${window.location.origin}/api/v1/gif-proxy?url=${encodeURIComponent(src)}`);
  }

  candidates.push(src);

  const mediaPath = extractMediaPath(src);
  if (mediaPath && typeof window !== 'undefined') {
    const origin = window.location.origin;
    candidates.push(`${origin}/buckets/torus-media${mediaPath}`);
    candidates.push(`${origin}/super_media${mediaPath}`);
  }

  return [...new Set(candidates)];
};

export const fetchGifBytes = async (src: string, signal?: AbortSignal): Promise<ArrayBuffer> => {
  const candidates = buildGifFetchCandidates(src);
  let lastError: unknown;

  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        signal,
        mode: 'cors',
        credentials: isSameOriginFetch(url) ? 'include' : 'omit',
      });
      if (!response.ok) {
        lastError = new Error(`Failed to fetch GIF: ${response.status}`);
        continue;
      }
      return await response.arrayBuffer();
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error('Failed to fetch GIF');
};
