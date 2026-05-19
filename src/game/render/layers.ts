import { Container } from 'pixi.js';

export interface RenderLayers {
  world: Container;
  terrain: Container;
  buildings: Container;
  units: Container;
  effects: Container;
  fog: Container;
  overlays: Container;
  debug: Container;
}

export function createRenderLayers(): RenderLayers {
  const world = new Container({ label: 'world-root' });
  const terrain = new Container({ label: 'terrain-layer' });
  const buildings = new Container({ label: 'building-layer' });
  const units = new Container({ label: 'unit-layer' });
  const effects = new Container({ label: 'effect-layer' });
  const fog = new Container({ label: 'fog-layer' });
  const overlays = new Container({ label: 'overlay-layer' });
  const debug = new Container({ label: 'debug-layer' });

  world.addChild(terrain, buildings, units, effects, fog, overlays, debug);

  return { world, terrain, buildings, units, effects, fog, overlays, debug };
}
