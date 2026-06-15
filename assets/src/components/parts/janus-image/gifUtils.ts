// Detects whether an image source points at an animated GIF asset.
// Static formats (jpeg/png/webp/svg/...) return false so they keep rendering
// as a plain <img> with no extra controls.
export const isAnimatedGifSource = (src?: string | null): boolean => {
  if (!src || typeof src !== 'string') {
    return false;
  }

  const normalized = src.trim().toLowerCase();
  if (normalized.length === 0) {
    return false;
  }

  // data:image/gif;base64,... style sources
  if (normalized.startsWith('data:image/gif')) {
    return true;
  }

  // Strip query string and hash so things like "foo.gif?v=2#frag" still match.
  const pathOnly = normalized.split(/[?#]/)[0];

  return pathOnly.endsWith('.gif');
};
