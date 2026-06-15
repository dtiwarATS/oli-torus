// Minimal ambient typings for gifuct-js (the package ships without types).
declare module 'gifuct-js' {
  export interface GifFrameDims {
    top: number;
    left: number;
    width: number;
    height: number;
  }

  export interface ParsedFrame {
    dims: GifFrameDims;
    patch?: Uint8ClampedArray;
    delay: number;
    disposalType: number;
    transparentIndex?: number;
    colorTable?: number[][];
    pixels?: number[];
  }

  export interface ParsedGif {
    lsd: {
      width: number;
      height: number;
      [key: string]: unknown;
    };
    frames: unknown[];
    [key: string]: unknown;
  }

  export function parseGIF(data: ArrayBuffer | Uint8Array): ParsedGif;

  export function decompressFrames(gif: ParsedGif, buildImagePatches: boolean): ParsedFrame[];
}
