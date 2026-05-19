import { Graphics } from 'pixi.js';
import type { RenderLayers } from './layers';
import type { VisibilityState } from '../visibility/fogOfWar';

export function renderFogOfWar(layers: RenderLayers, visibility: VisibilityState): void {
  const unexploredFog = getFogGraphics(layers, 'fog-unexplored-overlay');
  const exploredFog = getFogGraphics(layers, 'fog-explored-overlay');
  unexploredFog.clear();
  exploredFog.clear();

  for (let row = 0; row < visibility.rows; row += 1) {
    for (let column = 0; column < visibility.columns; column += 1) {
      const index = row * visibility.columns + column;
      if (visibility.visible[index] === 1) {
        continue;
      }
      const target = visibility.explored[index] === 1 ? exploredFog : unexploredFog;
      target.rect(column * visibility.cellSize, row * visibility.cellSize, visibility.cellSize, visibility.cellSize);
    }
  }

  unexploredFog.fill({ color: 0x05080c, alpha: 0.84 });
  exploredFog.fill({ color: 0x05080c, alpha: 0.46 });
}

function getFogGraphics(layers: RenderLayers, label: string): Graphics {
  const existing = layers.fog.children.find((child): child is Graphics => child instanceof Graphics && child.label === label);
  if (existing) {
    return existing;
  }

  const graphics = new Graphics({ label });
  layers.fog.addChild(graphics);
  return graphics;
}
