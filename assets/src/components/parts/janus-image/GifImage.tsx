import React, { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { ParsedFrame, decompressFrames, parseGIF } from 'gifuct-js';
import { fetchGifBytes } from './gifFetch';

export interface GifImageProps {
  src: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  tagName?: string;
  // Optional AI-trigger wiring forwarded from the delivery <img>.
  onClick?: React.MouseEventHandler<HTMLElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLElement>;
  role?: string;
  tabIndex?: number;
}

interface DecodedGif {
  width: number;
  height: number;
  frames: ParsedFrame[];
}

type GifRenderMode = 'loading' | 'decoded' | 'fallback';

// Renders an animated GIF with an accessible play/pause toggle.
// When fetch/decode is blocked (e.g. external URLs without CORS), we fall
// back to a native <img>. A single drawImage() at pause time copies the
// first/poster frame per the HTML spec, so we continuously snapshot the
// visible <img> during playback and copy the latest snapshot when pausing.
const GifImage: React.FC<GifImageProps> = ({
  src,
  alt,
  className,
  style,
  tagName,
  onClick,
  onKeyDown,
  role,
  tabIndex,
}) => {
  const [mode, setMode] = useState<GifRenderMode>('loading');
  const [decoded, setDecoded] = useState<DecodedGif | null>(null);
  const [playing, setPlaying] = useState<boolean>(true);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const freezeCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const frameIndexRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const patchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const playingRef = useRef<boolean>(true);
  const snapshotCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapshotRafRef = useRef<number | null>(null);
  const hasSnapshotRef = useRef<boolean>(false);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  // Fetch + decode the GIF whenever the source changes.
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setMode('loading');
    setDecoded(null);
    setImgLoaded(false);
    setPlaying(true);
    frameIndexRef.current = 0;
    hasSnapshotRef.current = false;

    (async () => {
      try {
        const buffer = await fetchGifBytes(src, controller.signal);
        const gif = parseGIF(buffer);
        const frames = decompressFrames(gif, true);
        if (!active) {
          return;
        }
        if (!frames.length) {
          throw new Error('GIF contained no frames');
        }
        setDecoded({ width: gif.lsd.width, height: gif.lsd.height, frames });
        setMode('decoded');
      } catch (err) {
        if (active && (err as Error)?.name !== 'AbortError') {
          setMode('fallback');
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [src]);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearSnapshotRaf = useCallback(() => {
    if (snapshotRafRef.current != null) {
      cancelAnimationFrame(snapshotRafRef.current);
      snapshotRafRef.current = null;
    }
  }, []);

  const renderFrame = useCallback((gif: DecodedGif, index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const frame = gif.frames[index];
    const { width, height, top, left } = frame.dims;

    if (!patchCanvasRef.current) {
      patchCanvasRef.current = document.createElement('canvas');
    }
    const patchCanvas = patchCanvasRef.current;

    const previous = index > 0 ? gif.frames[index - 1] : undefined;
    if (previous && previous.disposalType === 2) {
      ctx.clearRect(
        previous.dims.left,
        previous.dims.top,
        previous.dims.width,
        previous.dims.height,
      );
    }

    if (!frame.patch) {
      return;
    }

    if (patchCanvas.width !== width || patchCanvas.height !== height) {
      patchCanvas.width = width;
      patchCanvas.height = height;
    }
    const patchCtx = patchCanvas.getContext('2d');
    if (!patchCtx) {
      return;
    }
    const imageData = patchCtx.createImageData(width, height);
    imageData.data.set(frame.patch);
    patchCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(patchCanvas, left, top);
  }, []);

  const scheduleNext = useCallback(
    (gif: DecodedGif) => {
      clearTimer();
      const frame = gif.frames[frameIndexRef.current];
      const delay = frame.delay && frame.delay > 0 ? frame.delay : 100;
      timerRef.current = setTimeout(() => {
        if (!playingRef.current) {
          return;
        }
        frameIndexRef.current = (frameIndexRef.current + 1) % gif.frames.length;
        renderFrame(gif, frameIndexRef.current);
        scheduleNext(gif);
      }, delay);
    },
    [clearTimer, renderFrame],
  );

  // Initialise the decoded canvas once when frames are ready.
  useEffect(() => {
    if (mode !== 'decoded' || !decoded) {
      return;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = decoded.width;
      canvas.height = decoded.height;
    }
    frameIndexRef.current = 0;
    renderFrame(decoded, 0);
  }, [mode, decoded, renderFrame]);

  // Drive or stop the decoded playback loop. When pausing we only clear the
  // timer and leave the canvas as-is so the current frame stays visible.
  useEffect(() => {
    if (mode !== 'decoded' || !decoded) {
      return;
    }
    if (!playing) {
      clearTimer();
      return;
    }
    scheduleNext(decoded);
    return () => {
      clearTimer();
    };
  }, [mode, decoded, playing, scheduleNext, clearTimer]);

  useEffect(
    () => () => {
      clearTimer();
      clearSnapshotRaf();
    },
    [clearTimer, clearSnapshotRaf],
  );

  // Snapshot the currently displayed <img> frame into an offscreen canvas.
  // drawImage() on a playing GIF captures the live frame in Chromium; a single
  // draw at pause time copies the poster/first frame per spec.
  const updateSnapshot = useCallback(() => {
    const img = imgRef.current;
    if (!img || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
      return;
    }

    if (!snapshotCanvasRef.current) {
      snapshotCanvasRef.current = document.createElement('canvas');
    }
    const snapshot = snapshotCanvasRef.current;
    if (snapshot.width !== img.naturalWidth || snapshot.height !== img.naturalHeight) {
      snapshot.width = img.naturalWidth;
      snapshot.height = img.naturalHeight;
    }
    const ctx = snapshot.getContext('2d');
    if (!ctx) {
      return;
    }
    try {
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
      hasSnapshotRef.current = true;
    } catch {
      // Cross-origin taint; keep the previous snapshot if any.
    }
  }, []);

  const applySnapshotToFreeze = useCallback(() => {
    const snapshot = snapshotCanvasRef.current;
    const freeze = freezeCanvasRef.current;
    if (!snapshot || !freeze || !hasSnapshotRef.current) {
      return;
    }
    freeze.width = snapshot.width;
    freeze.height = snapshot.height;
    const ctx = freeze.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.drawImage(snapshot, 0, 0);
  }, []);

  // Continuously snapshot the playing <img> so pause can use the latest frame.
  useEffect(() => {
    if (mode !== 'fallback' || !playing || !imgLoaded) {
      clearSnapshotRaf();
      return;
    }

    const tick = () => {
      updateSnapshot();
      snapshotRafRef.current = requestAnimationFrame(tick);
    };
    snapshotRafRef.current = requestAnimationFrame(tick);

    return () => {
      clearSnapshotRaf();
    };
  }, [mode, playing, imgLoaded, updateSnapshot, clearSnapshotRaf]);

  const toggle = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (playing) {
        if (mode === 'fallback') {
          updateSnapshot();
          applySnapshotToFreeze();
        }
        setPlaying(false);
      } else {
        setPlaying(true);
      }
    },
    [playing, mode, updateSnapshot, applySnapshotToFreeze],
  );

  const isPaused = !playing;
  const wrapperClassName = ['gif-image-wrapper', className, isPaused ? 'is-paused' : '']
    .filter(Boolean)
    .join(' ');

  const toggleButton = (
    <button
      type="button"
      className="gif-image-toggle"
      aria-label={playing ? 'Pause animation' : 'Play animation'}
      aria-pressed={isPaused}
      disabled={!imgLoaded && mode !== 'decoded'}
      onClick={toggle}
    >
      <span className="gif-image-toggle-icon" aria-hidden="true">
        {playing ? (
          <svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
            <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
            <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
            <path d="M8 5v14l11-7z" fill="currentColor" />
          </svg>
        )}
      </span>
    </button>
  );

  const handleImgLoad = () => setImgLoaded(true);

  if (mode === 'decoded' && decoded) {
    return (
      <span className={wrapperClassName} style={style}>
        <canvas
          ref={canvasRef}
          className="gif-image-frame"
          data-janus-type={tagName}
          role={role ?? 'img'}
          aria-label={alt}
          onClick={onClick}
          onKeyDown={onKeyDown}
          tabIndex={tabIndex}
        />
        {toggleButton}
      </span>
    );
  }

  return (
    <span className={wrapperClassName} style={style}>
      <img
        ref={imgRef}
        className="gif-image-animated"
        data-janus-type={tagName}
        draggable="false"
        alt={alt}
        src={src}
        onLoad={handleImgLoad}
        onClick={mode === 'fallback' ? onClick : undefined}
        onKeyDown={mode === 'fallback' ? onKeyDown : undefined}
        role={mode === 'fallback' ? role : undefined}
        tabIndex={mode === 'fallback' ? tabIndex : undefined}
      />
      {mode === 'fallback' && (
        <canvas ref={freezeCanvasRef} className="gif-image-freeze" aria-hidden="true" />
      )}
      {toggleButton}
    </span>
  );
};

export default GifImage;
