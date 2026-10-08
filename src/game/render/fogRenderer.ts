import { BufferImageSource, Sprite, Texture } from 'pixi.js';
import type { RenderLayers } from './layers';
import type { VisibilityState } from '../visibility/fogOfWar';

// Fog is rendered as one low-resolution texture (one texel per visibility cell) that is
// stretched over the world with linear filtering. A 3x3 smoothing pass on the alpha grid plus
// bilinear upscaling turns the hard cell edges into soft mist gradients. The canvas, texture and
// sprite are created once per grid size and rewritten in place on every fog refresh. A raw RGBA
// buffer is uploaded directly (no 2D canvas), which avoids GPU readback stalls in Chromium.
const UNEXPLORED_ALPHA = 0.86;
const EXPLORED_ALPHA = 0.44;
const FOG_RED = 0x06;
const FOG_GREEN = 0x0c;
const FOG_BLUE = 0x13;

interface FogTextureState {
  columns: number;
  rows: number;
  cellSize: number;
  pixels: Uint8Array;
  source: BufferImageSource;
  rawAlpha: Float32Array;
  mistNoise: Float32Array;
  texture: Texture;
  sprite: Sprite;
}

const fogStates = new WeakMap<RenderLayers['fog'], FogTextureState>();

export function renderFogOfWar(layers: RenderLayers, visibility: VisibilityState): void {
  const state = getFogTextureState(layers, visibility);
  if (!state) return;
  const { columns, rows, rawAlpha, mistNoise } = state;

  for (let index = 0; index < rawAlpha.length; index += 1) {
    rawAlpha[index] =
      visibility.visible[index] === 1 ? 0 : visibility.explored[index] === 1 ? EXPLORED_ALPHA : UNEXPLORED_ALPHA + mistNoise[index];
  }

  const pixels = state.pixels;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let total = 0;
      let weight = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        const sampleRow = row + dy;
        if (sampleRow < 0 || sampleRow >= rows) continue;
        for (let dx = -1; dx <= 1; dx += 1) {
          const sampleColumn = column + dx;
          if (sampleColumn < 0 || sampleColumn >= columns) continue;
          const sampleWeight = dx === 0 && dy === 0 ? 4 : dx === 0 || dy === 0 ? 2 : 1;
          total += rawAlpha[sampleRow * columns + sampleColumn] * sampleWeight;
          weight += sampleWeight;
        }
      }
      const index = row * columns + column;
      // Visible cells keep most of their clarity so units at the vision edge stay readable.
      const smoothed = total / weight;
      const alpha = rawAlpha[index] === 0 ? smoothed * 0.55 : smoothed;
      const offset = index * 4;
      const clampedAlpha = Math.min(1, Math.max(0, alpha));
      // Premultiplied RGBA.
      pixels[offset] = Math.round(FOG_RED * clampedAlpha);
      pixels[offset + 1] = Math.round(FOG_GREEN * clampedAlpha);
      pixels[offset + 2] = Math.round(FOG_BLUE * clampedAlpha);
      pixels[offset + 3] = Math.round(clampedAlpha * 255);
    }
  }

  state.source.update();
}

function getFogTextureState(layers: RenderLayers, visibility: VisibilityState): FogTextureState | null {
  const existing = fogStates.get(layers.fog);
  if (existing && existing.columns === visibility.columns && existing.rows === visibility.rows && existing.cellSize === visibility.cellSize) {
    return existing;
  }
  if (existing) {
    layers.fog.removeChild(existing.sprite);
    existing.sprite.destroy();
    existing.texture.destroy(true);
    fogStates.delete(layers.fog);
  }
  const pixels = new Uint8Array(visibility.columns * visibility.rows * 4);
  const source = new BufferImageSource({
    resource: pixels,
    width: visibility.columns,
    height: visibility.rows,
    format: 'rgba8unorm',
    alphaMode: 'premultiplied-alpha',
    scaleMode: 'linear',
  });
  const texture = new Texture({ source });
  const sprite = new Sprite({ texture, label: 'fog-soft-overlay' });
  sprite.position.set(0, 0);
  sprite.width = visibility.columns * visibility.cellSize;
  sprite.height = visibility.rows * visibility.cellSize;
  layers.fog.addChild(sprite);

  const cellCount = visibility.columns * visibility.rows;
  const mistNoise = new Float32Array(cellCount);
  for (let index = 0; index < cellCount; index += 1) {
    // Deterministic low-amplitude variation so unexplored fog reads as mist, not a flat slab.
    const hash = Math.sin(index * 12.9898 + (index % visibility.columns) * 78.233) * 43758.5453;
    mistNoise[index] = ((hash - Math.floor(hash)) - 0.5) * 0.08;
  }

  const state: FogTextureState = {
    columns: visibility.columns,
    rows: visibility.rows,
    cellSize: visibility.cellSize,
    pixels,
    source,
    rawAlpha: new Float32Array(cellCount),
    mistNoise,
    texture,
    sprite,
  };
  fogStates.set(layers.fog, state);
  return state;
}
