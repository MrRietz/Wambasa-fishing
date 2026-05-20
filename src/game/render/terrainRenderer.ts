import { Container, Graphics, Sprite } from 'pixi.js';
import { getFishSchoolTexture, getMetalFieldTexture, getTerrainBackdropTexture, getTerrainBlockerTexture, getTerrainObjectTexture, getTerrainPlateTexture } from '../art/unitSpriteAssets';
import { clamp } from '../core/math';
import type { CoastalMapData, FishSpecies, FishingZoneState, ResourceField, TerrainKind } from '../map/mapTypes';
import type { RenderLayers } from './layers';

export interface TerrainRenderInput {
  layers: RenderLayers;
  mapData: CoastalMapData;
  fishingZones: FishingZoneState[];
  resourceFields: ResourceField[];
  elapsedSeconds?: number;
  renderEntities: () => void;
  renderWorldOverlays: () => void;
}

interface AnimatedTerrainSprite {
  sprite: Sprite;
  baseX: number;
  baseY: number;
  driftX: number;
  driftY: number;
  amplitudeX: number;
  amplitudeY: number;
  phase: number;
}

interface TerrainAnimationState {
  waterSprites: AnimatedTerrainSprite[];
  shorelineSprites: AnimatedTerrainSprite[];
  fishSprites: AnimatedFishSprite[];
}

interface AnimatedFishSprite {
  sprite: Sprite;
  zone: FishingZoneState;
  fishIndex: number;
  species: FishSpecies;
  orbitRadiusX: number;
  orbitRadiusY: number;
  speed: number;
  phase: number;
  yaw: number;
  displayWidth: number;
  displayHeight: number;
  frameOffset: number;
}

const terrainAnimationStates = new WeakMap<Container, TerrainAnimationState>();

export function renderTerrainMap(input: TerrainRenderInput): void {
  const { layers, mapData, resourceFields, fishingZones } = input;
  for (const child of layers.terrain.removeChildren()) {
    child.destroy({ children: true });
  }
  const animationState: TerrainAnimationState = {
    waterSprites: [],
    shorelineSprites: [],
    fishSprites: [],
  };
  const terrainPropSprites = new Container();

  const terrainBackdropTexture = getTerrainBackdropTexture();
  if (terrainBackdropTexture) {
    const backdrop = new Sprite(terrainBackdropTexture);
    backdrop.position.set(0, 0);
    backdrop.width = mapData.width;
    backdrop.height = mapData.height;
    backdrop.alpha = 0.72;
    backdrop.tint = 0xffffff;
    layers.terrain.addChild(backdrop);
  }

  addTerrainPlateLayer({
    layers,
    texture: getTerrainPlateTexture('water'),
    regions: mapData.terrain.filter((tile) => tile.kind === 'water'),
    alpha: 0.9,
    tint: 0xffffff,
    motion: {
      target: animationState.waterSprites,
      driftX: 18,
      driftY: 9,
      amplitudeX: 16,
      amplitudeY: 7,
      overscanTiles: 1,
    },
  });
  addTerrainPlateLayer({
    layers,
    texture: getTerrainPlateTexture('shoreline'),
    regions: mapData.terrain.filter((tile) => tile.kind === 'shore'),
    alpha: 0.76,
    tint: 0xffffff,
    motion: {
      target: animationState.shorelineSprites,
      driftX: 8,
      driftY: 3,
      amplitudeX: 7,
      amplitudeY: 3,
      overscanTiles: 1,
    },
  });
  addTerrainPlateLayer({
    layers,
    texture: getTerrainPlateTexture('land'),
    regions: mapData.terrain.filter((tile) => tile.kind === 'land'),
    alpha: 0.72,
    tint: 0xffffff,
  });
  addTerrainPlateLayer({
    layers,
    texture: getTerrainPlateTexture('road'),
    regions: mapData.terrain.filter((tile) => tile.kind === 'road'),
    alpha: 0.92,
    tint: 0xffffff,
    roundedRadius: 24,
  });
  const dockPointTexture = getTerrainObjectTexture('dockPoint');
  for (const dockPoint of mapData.dockPoints) {
    if (dockPointTexture) {
      const sprite = new Sprite(dockPointTexture);
      sprite.anchor.set(0.5, 0.86);
      sprite.position.set(dockPoint.x, dockPoint.y + dockPoint.radius * 1.54);
      setSpriteSizeContain(sprite, dockPoint.radius * 5.6, dockPoint.radius * 4.4);
      sprite.alpha = 0.96;
      layers.terrain.addChild(sprite);
    }
  }
  for (const decoration of mapData.terrainDecorations ?? []) {
    const texture = getTerrainObjectTexture(decoration.kind);
    if (texture) {
      const sprite = new Sprite(texture);
      const useContain = decoration.kind === 'landRocks' || decoration.kind === 'landRidge' || decoration.kind === 'landCliff';
      sprite.anchor.set(0.5, decoration.kind === 'oceanCliff' ? 0.88 : 0.86);
      sprite.position.set(decoration.x + decoration.width / 2, decoration.y + decoration.height * (decoration.kind === 'oceanCliff' ? 0.94 : 0.92));
      if (useContain) {
        setSpriteSizeContain(sprite, decoration.width * 1.24, decoration.height * 1.2);
      } else {
        setSpriteSizeCover(sprite, decoration.width, decoration.height);
      }
      sprite.alpha = decoration.kind === 'oceanCliff' ? 0.92 : 0.98;
      sprite.tint = terrainDecorationTint(decoration.kind);
      terrainPropSprites.addChild(sprite);
    }
  }
  const metalFieldTexture = getMetalFieldTexture();
  if (metalFieldTexture) {
    for (const field of resourceFields) {
      const depletion = getResourceFieldStockRatio(field);
      if (field.amount <= 0) {
        continue;
      }
      const marker = new Sprite(metalFieldTexture);
      marker.anchor.set(0.5);
      marker.position.set(field.x, field.y);
      marker.width = field.radius * 2.45;
      marker.height = field.radius * 2.15;
      marker.alpha = 0.68 + depletion * 0.2;
      marker.tint = depletion < 0.45 ? 0xd7ddd9 : 0xffffff;
      layers.terrain.addChild(marker);
    }
  }

  addAnimatedFishingSchools(layers.terrain, fishingZones, animationState);

  for (const blocker of mapData.blockers) {
    const blockerTexture = getTerrainBlockerTexture(blocker.kind);
    if (blockerTexture) {
      const sprite = new Sprite(blockerTexture);
      sprite.anchor.set(0.5, 0.78);
      sprite.position.set(blocker.x + blocker.width / 2, blocker.y + blocker.height * 0.82);
      if (blocker.kind === 'rocks') {
        setSpriteSizeContain(sprite, blocker.width * 1.18, blocker.height * 1.16);
      } else {
        setSpriteSizeCover(sprite, blocker.width * 1.12, blocker.height * 1.18);
      }
      sprite.tint = terrainBlockerTint(blocker.kind);
      sprite.alpha = blocker.kind === 'marsh' ? 0.92 : 0.96;
      layers.terrain.addChild(sprite);
    }
  }
  layers.terrain.addChild(terrainPropSprites);

  terrainAnimationStates.set(layers.terrain, animationState);
  updateTerrainAnimation(layers, input.elapsedSeconds ?? 0);

  input.renderEntities();
  input.renderWorldOverlays();
}

function shouldUseTerrainBlockerTexture(blocker: CoastalMapData['blockers'][number]): boolean {
  if (blocker.kind === 'forest' || blocker.kind === 'marsh' || blocker.kind === 'rocks') {
    return true;
  }
  if (blocker.kind === 'ridge') {
    const aspect = Math.max(blocker.width, blocker.height) / Math.max(1, Math.min(blocker.width, blocker.height));
    const oversizedWall = blocker.width > 320 || blocker.height > 320;
    return aspect <= 2.1 && !oversizedWall;
  }
  return false;
}

function shouldUseTerrainDecorationTexture(kind: CoastalMapData['terrainDecorations'][number]['kind']): boolean {
  return kind === 'oceanCliff' || kind === 'landRocks' || kind === 'landRidge' || kind === 'landCliff';
}

function terrainBlockerTint(kind: CoastalMapData['blockers'][number]['kind']): number {
  switch (kind) {
    case 'cliff':
      return 0xcfb489;
    case 'ridge':
    case 'rocks':
      return 0xffffff;
    case 'marsh':
      return 0x8fb07d;
    case 'forest':
    default:
      return 0xffffff;
  }
}

function terrainDecorationTint(kind: CoastalMapData['terrainDecorations'][number]['kind']): number {
  switch (kind) {
    case 'landRocks':
    case 'landRidge':
    case 'landCliff':
      return 0xffffff;
    case 'oceanCliff':
    default:
      return 0xffffff;
  }
}

export function updateTerrainAnimation(layers: RenderLayers, elapsedSeconds: number): void {
  const state = terrainAnimationStates.get(layers.terrain);
  if (!state) return;
  animateTerrainSprites(state.waterSprites, elapsedSeconds, 1);
  animateTerrainSprites(state.shorelineSprites, elapsedSeconds, 0.65);
  animateFishSprites(state.fishSprites, elapsedSeconds);
}

function getResourceFieldStockRatio(field: ResourceField): number {
  return clamp(field.amount / Math.max(1, field.maxAmount), 0.18, 1);
}

function drawDepletedMetalField(graphic: Graphics, field: ResourceField): void {
  graphic.circle(field.x, field.y, field.radius * 0.62).fill({ color: 0x4e514b, alpha: 0.32 });
  graphic.circle(field.x - field.radius * 0.16, field.y - field.radius * 0.1, field.radius * 0.2).fill({ color: 0x6c6d67, alpha: 0.34 });
  graphic.circle(field.x + field.radius * 0.2, field.y + field.radius * 0.08, field.radius * 0.16).fill({ color: 0x5a5d57, alpha: 0.28 });
  graphic.circle(field.x, field.y, field.radius * 0.74).stroke({ color: 0x97978e, width: 2, alpha: 0.18 });
  graphic.moveTo(field.x - field.radius * 0.3, field.y - field.radius * 0.14);
  graphic.lineTo(field.x + field.radius * 0.34, field.y + field.radius * 0.18);
  graphic.moveTo(field.x - field.radius * 0.08, field.y + field.radius * 0.32);
  graphic.lineTo(field.x + field.radius * 0.18, field.y - field.radius * 0.28);
  graphic.stroke({ color: 0xc9c0ae, width: 2, alpha: 0.22 });
}

function drawMetalFieldBed(graphic: Graphics, field: ResourceField, depletion: number): void {
  const bedWidth = field.radius * 2.55;
  const bedHeight = field.radius * 1.8;
  graphic.ellipse(field.x, field.y + field.radius * 0.08, bedWidth * 0.48, bedHeight * 0.42).fill({ color: 0x2d312c, alpha: 0.22 });
  graphic.ellipse(field.x, field.y + field.radius * 0.02, bedWidth * 0.42, bedHeight * 0.34).fill({ color: 0x5a635d, alpha: 0.22 + depletion * 0.08 });
  graphic.ellipse(field.x - field.radius * 0.18, field.y - field.radius * 0.12, field.radius * 0.38, field.radius * 0.22).fill({ color: 0xaeb8be, alpha: 0.16 + depletion * 0.08 });
  graphic.ellipse(field.x + field.radius * 0.16, field.y + field.radius * 0.06, field.radius * 0.34, field.radius * 0.2).fill({ color: 0xc5cfd3, alpha: 0.14 + depletion * 0.08 });
  graphic.ellipse(field.x + field.radius * 0.02, field.y - field.radius * 0.2, field.radius * 0.26, field.radius * 0.16).fill({ color: 0xd9e2e4, alpha: 0.1 + depletion * 0.06 });
  graphic.ellipse(field.x, field.y + field.radius * 0.02, bedWidth * 0.45, bedHeight * 0.37).stroke({ color: 0xe0e7e0, width: 2, alpha: 0.08 + depletion * 0.06 });
}

export function terrainFill(kind: TerrainKind): number {
  switch (kind) {
    case 'water':
      return 0x1e5361;
    case 'shore':
      return 0x8a704b;
    case 'road':
      return 0x5f5744;
    case 'blocker':
      return 0x233329;
    case 'land':
    default:
      return 0x31463c;
  }
}

function addTerrainPlateLayer(input: {
  layers: RenderLayers;
  texture: ReturnType<typeof getTerrainPlateTexture>;
  regions: Array<{ x: number; y: number; width: number; height: number }>;
  alpha: number;
  tint: number;
  roundedRadius?: number;
  motion?: {
    target: AnimatedTerrainSprite[];
    driftX: number;
    driftY: number;
    amplitudeX: number;
    amplitudeY: number;
    overscanTiles: number;
  };
}): void {
  if (!input.texture) return;
  const layer = new Container();
  const tileWidth = input.texture.width;
  const tileHeight = input.texture.height;

  for (const region of input.regions) {
    const fill = new Container();
    const mask = new Graphics();
    if ((input.roundedRadius ?? 0) > 0) {
      mask.roundRect(region.x, region.y, region.width, region.height, input.roundedRadius ?? 0).fill(0xffffff);
    } else {
      mask.rect(region.x, region.y, region.width, region.height).fill(0xffffff);
    }

    const overscanTiles = input.motion?.overscanTiles ?? 0;
    for (let y = region.y - tileHeight * overscanTiles; y < region.y + region.height + tileHeight * overscanTiles; y += tileHeight) {
      for (let x = region.x - tileWidth * overscanTiles; x < region.x + region.width + tileWidth * overscanTiles; x += tileWidth) {
        const sprite = new Sprite(input.texture);
        sprite.position.set(x, y);
        sprite.alpha = input.alpha;
        sprite.tint = input.tint;
        fill.addChild(sprite);
        if (input.motion) {
          const gridX = Math.round((x - region.x) / tileWidth);
          const gridY = Math.round((y - region.y) / tileHeight);
          input.motion.target.push({
            sprite,
            baseX: x,
            baseY: y,
            driftX: input.motion.driftX * (1 + (gridY % 3) * 0.08),
            driftY: input.motion.driftY * (1 + (gridX % 2) * 0.12),
            amplitudeX: input.motion.amplitudeX * (1 + (gridX % 2) * 0.18),
            amplitudeY: input.motion.amplitudeY * (1 + (gridY % 2) * 0.16),
            phase: (gridX * 0.73) + (gridY * 0.41),
          });
        }
      }
    }

    fill.mask = mask;
    layer.addChild(fill);
    layer.addChild(mask);
  }

  input.layers.terrain.addChild(layer);
}

function animateTerrainSprites(sprites: AnimatedTerrainSprite[], elapsedSeconds: number, speedScale: number): void {
  const sharedOffsetX = Math.sin(elapsedSeconds * 0.18 * speedScale) * 6;
  const sharedOffsetY = Math.cos(elapsedSeconds * 0.13 * speedScale) * 3;
  for (const entry of sprites) {
    const driftPhaseX = elapsedSeconds * 0.16 * speedScale + entry.phase;
    const driftPhaseY = elapsedSeconds * 0.11 * speedScale + entry.phase * 0.82;
    entry.sprite.x =
      entry.baseX +
      sharedOffsetX +
      Math.sin(driftPhaseX) * entry.amplitudeX +
      Math.cos(driftPhaseY) * entry.driftX * 0.22;
    entry.sprite.y =
      entry.baseY +
      sharedOffsetY +
      Math.cos(driftPhaseY) * entry.amplitudeY +
      Math.sin(driftPhaseX) * entry.driftY * 0.18;
  }
}

function addAnimatedFishingSchools(layer: Container, fishingZones: FishingZoneState[], animationState: TerrainAnimationState): void {
  fishingZones.forEach((zone, zoneIndex) => {
    const maxFishSprites = zone.shoreAccess ? 2 : 3;
    for (let fishIndex = 0; fishIndex < maxFishSprites; fishIndex += 1) {
      const species = zone.species?.[fishIndex % (zone.species.length || 1)] ?? defaultSpeciesForZone(zoneIndex, fishIndex);
      const texture = getFishSchoolTexture(species, 0);
      if (!texture) {
        continue;
      }
      const fish = new Sprite(texture);
      fish.anchor.set(0.5);
      fish.alpha = 0;
      fish.tint = 0xffffff;
      layer.addChild(fish);
      const baseWidth = zone.shoreAccess ? 34 + fishIndex * 4 : 42 + fishIndex * 5;
      const aspect = texture.height > 0 ? texture.width / texture.height : 1.3;
      const displayHeight = baseWidth / aspect;
      fish.width = baseWidth;
      fish.height = displayHeight;
      animationState.fishSprites.push({
        sprite: fish,
        zone,
        fishIndex,
        species,
        orbitRadiusX: zone.radius * (zone.shoreAccess ? 0.1 + fishIndex * 0.1 : 0.16 + fishIndex * 0.12),
        orbitRadiusY: zone.radius * (zone.shoreAccess ? 0.05 + fishIndex * 0.04 : 0.08 + fishIndex * 0.05),
        speed: getFishSchoolSpeed(species) * (1 + fishIndex * 0.07),
        phase: zoneIndex * 0.74 + fishIndex * 0.58,
        yaw: ((fishIndex % 2) * Math.PI) / 5,
        displayWidth: baseWidth,
        displayHeight,
        frameOffset: (zoneIndex + fishIndex) % 3,
      });
    }
  });
}

function animateFishSprites(fishSprites: AnimatedFishSprite[], elapsedSeconds: number): void {
  for (const entry of fishSprites) {
    const { zone } = entry;
    const active = zone.amount > 0 && zone.depletedCooldownSeconds <= 0;
    const abundance = clamp(zone.amount / zone.maxFish, 0, 1);
    const maxVisible = zone.shoreAccess ? 2 : 3;
    const visibleFishCount = active ? Math.max(1, Math.round(maxVisible * abundance)) : 0;
    entry.sprite.visible = active && entry.fishIndex < visibleFishCount;
    if (!entry.sprite.visible) {
      continue;
    }

    const schoolTime = elapsedSeconds * entry.speed + entry.phase;
    const centerX = zone.x + Math.cos(schoolTime + entry.yaw) * entry.orbitRadiusX;
    const rawY = zone.y + Math.sin((schoolTime * 1.1) - entry.yaw) * entry.orbitRadiusY * 0.68;
    const yBand = Math.max(zone.radius * (zone.shoreAccess ? 0.22 : 0.34), zone.shoreAccess ? 20 : 32);
    const centerY = clamp(rawY, zone.y - yBand, zone.y + yBand);
    const sway = Math.sin((schoolTime * 2.6) + entry.phase) * 0.1;
    const heading = Math.sin((schoolTime * 0.9) + entry.phase);
    const scalePulse = 0.96 + Math.sin((schoolTime * 1.35) + entry.phase) * 0.04;
    const frame = Math.floor(elapsedSeconds * (zone.shoreAccess ? 3.8 : 4.4) + entry.frameOffset) % 3;
    const texture = getFishSchoolTexture(entry.species, frame);
    if (texture) {
      entry.sprite.texture = texture;
    }
    entry.sprite.position.set(centerX, centerY);
    entry.sprite.rotation = sway * 0.22;
    entry.sprite.scale.set(
      (heading >= 0 ? 1 : -1) * (entry.displayWidth * scalePulse) / Math.max(1, entry.sprite.texture.width),
      (entry.displayHeight * scalePulse) / Math.max(1, entry.sprite.texture.height),
    );
    entry.sprite.alpha = 0.84 + abundance * 0.12;
  }
}

function defaultSpeciesForZone(zoneIndex: number, fishIndex: number): FishSpecies {
  const species: FishSpecies[] = ['cod', 'herring', 'mackerel', 'sardine', 'salmon', 'tuna', 'anchovy'];
  return species[(zoneIndex + fishIndex) % species.length];
}

function getFishSchoolSpeed(species: FishSpecies): number {
  switch (species) {
    case 'herring':
      return 1.22;
    case 'mackerel':
      return 1.08;
    case 'sardine':
      return 1.34;
    case 'salmon':
      return 0.98;
    case 'tuna':
      return 0.9;
    case 'anchovy':
      return 1.42;
    case 'cod':
    default:
      return 1.02;
  }
}

function setSpriteSizeContain(sprite: Sprite, targetWidth: number, targetHeight: number): void {
  const textureWidth = Math.max(1, sprite.texture.width);
  const textureHeight = Math.max(1, sprite.texture.height);
  const scale = Math.min(targetWidth / textureWidth, targetHeight / textureHeight);
  sprite.width = textureWidth * scale;
  sprite.height = textureHeight * scale;
}

function setSpriteSizeCover(sprite: Sprite, targetWidth: number, targetHeight: number): void {
  const textureWidth = Math.max(1, sprite.texture.width);
  const textureHeight = Math.max(1, sprite.texture.height);
  const scale = Math.max(targetWidth / textureWidth, targetHeight / textureHeight);
  sprite.width = textureWidth * scale;
  sprite.height = textureHeight * scale;
}

function drawTerrainBlocker(
  graphic: Graphics,
  blocker: CoastalMapData['blockers'][number],
  mapData: CoastalMapData,
): void {
  switch (blocker.kind) {
    case 'forest':
      drawForestBlocker(graphic, blocker);
      return;
    case 'rocks':
      drawRockBlocker(graphic, blocker);
      return;
    case 'ridge':
      drawRidgeBlocker(graphic, blocker, mapData);
      return;
    case 'marsh':
      drawMarshBlocker(graphic, blocker);
      return;
    case 'cliff':
    default:
      drawCliffBlocker(graphic, blocker);
      return;
  }
}

function drawForestBlocker(graphic: Graphics, blocker: CoastalMapData['blockers'][number]): void {
  graphic.roundRect(blocker.x, blocker.y, blocker.width, blocker.height, 22).fill({ color: 0x24372d, alpha: 0.38 });
  const columns = Math.max(3, Math.floor(blocker.width / 62));
  const rows = Math.max(2, Math.floor(blocker.height / 70));
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const x = blocker.x + 28 + col * ((blocker.width - 56) / Math.max(1, columns - 1));
      const y = blocker.y + 28 + row * ((blocker.height - 56) / Math.max(1, rows - 1));
      graphic.circle(x, y, 18 + ((row + col) % 3) * 4).fill({ color: 0x334e3e, alpha: 0.92 });
      graphic.circle(x - 10, y + 6, 12).fill({ color: 0x456651, alpha: 0.82 });
      graphic.rect(x - 4, y + 14, 8, 18).fill({ color: 0x4a3525, alpha: 0.72 });
    }
  }
}

function drawRockBlocker(graphic: Graphics, blocker: CoastalMapData['blockers'][number]): void {
  graphic.roundRect(blocker.x, blocker.y, blocker.width, blocker.height, 18).fill({ color: 0x2d352f, alpha: 0.32 });
  const stones = Math.max(3, Math.floor(blocker.width / 70));
  for (let index = 0; index < stones; index += 1) {
    const x = blocker.x + 26 + index * ((blocker.width - 52) / Math.max(1, stones - 1));
    const y = blocker.y + blocker.height * (0.35 + (index % 3) * 0.14);
    const radiusX = 22 + (index % 2) * 10;
    const radiusY = 16 + (index % 3) * 6;
    graphic.ellipse(x, y, radiusX, radiusY).fill({ color: 0x5c6761, alpha: 0.94 });
    graphic.ellipse(x - 8, y - 4, radiusX * 0.44, radiusY * 0.34).fill({ color: 0x8d9a93, alpha: 0.46 });
  }
}

function drawRidgeBlocker(
  graphic: Graphics,
  blocker: CoastalMapData['blockers'][number],
  mapData?: CoastalMapData,
): void {
  if (mapData && isWallLikeRidge(blocker)) {
    drawRidgeWallBlocker(graphic, blocker, resolveAdjacentWaterSide(mapData, blocker));
    return;
  }
  graphic.roundRect(blocker.x, blocker.y, blocker.width, blocker.height, 18).fill({ color: 0x314137, alpha: 0.28 });
  graphic.poly([
    blocker.x,
    blocker.y + blocker.height,
    blocker.x + blocker.width * 0.18,
    blocker.y + blocker.height * 0.3,
    blocker.x + blocker.width * 0.42,
    blocker.y + blocker.height * 0.56,
    blocker.x + blocker.width * 0.64,
    blocker.y + blocker.height * 0.2,
    blocker.x + blocker.width * 0.84,
    blocker.y + blocker.height * 0.48,
    blocker.x + blocker.width,
    blocker.y + blocker.height * 0.16,
    blocker.x + blocker.width,
    blocker.y + blocker.height,
  ]).fill({ color: 0x617260, alpha: 0.96 });
  graphic.poly([
    blocker.x + blocker.width * 0.1,
    blocker.y + blocker.height,
    blocker.x + blocker.width * 0.3,
    blocker.y + blocker.height * 0.44,
    blocker.x + blocker.width * 0.5,
    blocker.y + blocker.height * 0.64,
    blocker.x + blocker.width * 0.72,
    blocker.y + blocker.height * 0.28,
    blocker.x + blocker.width * 0.9,
    blocker.y + blocker.height,
  ]).fill({ color: 0x8e9985, alpha: 0.34 });
}

function isWallLikeRidge(blocker: CoastalMapData['blockers'][number]): boolean {
  const longSide = Math.max(blocker.width, blocker.height);
  const shortSide = Math.max(1, Math.min(blocker.width, blocker.height));
  return longSide / shortSide >= 2.8 && longSide >= 520;
}

type WaterSide = 'north' | 'south' | 'east' | 'west' | null;

function resolveAdjacentWaterSide(mapData: CoastalMapData, blocker: CoastalMapData['blockers'][number]): WaterSide {
  const sampleOffset = 42;
  const samplePoints = {
    north: { x: blocker.x + blocker.width / 2, y: blocker.y - sampleOffset },
    south: { x: blocker.x + blocker.width / 2, y: blocker.y + blocker.height + sampleOffset },
    east: { x: blocker.x + blocker.width + sampleOffset, y: blocker.y + blocker.height / 2 },
    west: { x: blocker.x - sampleOffset, y: blocker.y + blocker.height / 2 },
  } satisfies Record<Exclude<WaterSide, null>, { x: number; y: number }>;

  let bestSide: WaterSide = null;
  let bestScore = -1;
  for (const [side, point] of Object.entries(samplePoints) as Array<[Exclude<WaterSide, null>, { x: number; y: number }]>) {
    const score = mapData.terrain.reduce((total, tile) => {
      const inside =
        point.x >= tile.x &&
        point.x <= tile.x + tile.width &&
        point.y >= tile.y &&
        point.y <= tile.y + tile.height;
      if (!inside) return total;
      if (tile.kind === 'water') return total + 3;
      if (tile.kind === 'shore') return total + 1;
      return total;
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      bestSide = side;
    }
  }
  return bestScore > 0 ? bestSide : null;
}

function drawRidgeWallBlocker(
  graphic: Graphics,
  blocker: CoastalMapData['blockers'][number],
  waterSide: WaterSide,
): void {
  graphic.roundRect(blocker.x, blocker.y, blocker.width, blocker.height, 18).fill({ color: 0x2c3a32, alpha: 0.18 });

  switch (waterSide) {
    case 'east':
      graphic.roundRect(blocker.x, blocker.y, blocker.width * 0.82, blocker.height, 18).fill({ color: 0x64745f, alpha: 0.92 });
      graphic.poly([
        blocker.x + blocker.width * 0.68, blocker.y,
        blocker.x + blocker.width * 0.86, blocker.y + blocker.height * 0.08,
        blocker.x + blocker.width * 0.74, blocker.y + blocker.height * 0.22,
        blocker.x + blocker.width * 0.9, blocker.y + blocker.height * 0.36,
        blocker.x + blocker.width * 0.72, blocker.y + blocker.height * 0.5,
        blocker.x + blocker.width * 0.88, blocker.y + blocker.height * 0.68,
        blocker.x + blocker.width * 0.7, blocker.y + blocker.height * 0.82,
        blocker.x + blocker.width * 0.84, blocker.y + blocker.height,
        blocker.x + blocker.width * 0.42, blocker.y + blocker.height,
        blocker.x + blocker.width * 0.5, blocker.y + blocker.height * 0.78,
        blocker.x + blocker.width * 0.34, blocker.y + blocker.height * 0.54,
        blocker.x + blocker.width * 0.46, blocker.y + blocker.height * 0.28,
        blocker.x + blocker.width * 0.28, blocker.y + blocker.height * 0.06,
      ]).fill({ color: 0x7e8d78, alpha: 0.96 });
      graphic.rect(blocker.x + blocker.width * 0.8, blocker.y + 20, blocker.width * 0.12, blocker.height - 40).fill({ color: 0x9da88f, alpha: 0.28 });
      graphic.rect(blocker.x + blocker.width * 0.9, blocker.y + 10, blocker.width * 0.05, blocker.height - 20).fill({ color: 0x403b31, alpha: 0.34 });
      break;
    case 'west':
      graphic.roundRect(blocker.x + blocker.width * 0.18, blocker.y, blocker.width * 0.82, blocker.height, 18).fill({ color: 0x64745f, alpha: 0.92 });
      graphic.poly([
        blocker.x + blocker.width * 0.32, blocker.y,
        blocker.x + blocker.width * 0.14, blocker.y + blocker.height * 0.08,
        blocker.x + blocker.width * 0.26, blocker.y + blocker.height * 0.22,
        blocker.x + blocker.width * 0.1, blocker.y + blocker.height * 0.36,
        blocker.x + blocker.width * 0.28, blocker.y + blocker.height * 0.5,
        blocker.x + blocker.width * 0.12, blocker.y + blocker.height * 0.68,
        blocker.x + blocker.width * 0.3, blocker.y + blocker.height * 0.82,
        blocker.x + blocker.width * 0.16, blocker.y + blocker.height,
        blocker.x + blocker.width * 0.58, blocker.y + blocker.height,
        blocker.x + blocker.width * 0.5, blocker.y + blocker.height * 0.78,
        blocker.x + blocker.width * 0.66, blocker.y + blocker.height * 0.54,
        blocker.x + blocker.width * 0.54, blocker.y + blocker.height * 0.28,
        blocker.x + blocker.width * 0.72, blocker.y + blocker.height * 0.06,
      ]).fill({ color: 0x7e8d78, alpha: 0.96 });
      graphic.rect(blocker.x + blocker.width * 0.08, blocker.y + 20, blocker.width * 0.12, blocker.height - 40).fill({ color: 0x9da88f, alpha: 0.28 });
      graphic.rect(blocker.x + blocker.width * 0.05, blocker.y + 10, blocker.width * 0.05, blocker.height - 20).fill({ color: 0x403b31, alpha: 0.34 });
      break;
    case 'south':
      graphic.roundRect(blocker.x, blocker.y, blocker.width, blocker.height * 0.82, 18).fill({ color: 0x64745f, alpha: 0.92 });
      graphic.poly([
        blocker.x, blocker.y + blocker.height * 0.68,
        blocker.x + blocker.width * 0.08, blocker.y + blocker.height * 0.86,
        blocker.x + blocker.width * 0.22, blocker.y + blocker.height * 0.74,
        blocker.x + blocker.width * 0.36, blocker.y + blocker.height * 0.9,
        blocker.x + blocker.width * 0.5, blocker.y + blocker.height * 0.72,
        blocker.x + blocker.width * 0.68, blocker.y + blocker.height * 0.88,
        blocker.x + blocker.width * 0.82, blocker.y + blocker.height * 0.7,
        blocker.x + blocker.width, blocker.y + blocker.height * 0.84,
        blocker.x + blocker.width, blocker.y + blocker.height * 0.42,
        blocker.x + blocker.width * 0.76, blocker.y + blocker.height * 0.5,
        blocker.x + blocker.width * 0.52, blocker.y + blocker.height * 0.34,
        blocker.x + blocker.width * 0.24, blocker.y + blocker.height * 0.46,
        blocker.x, blocker.y + blocker.height * 0.3,
      ]).fill({ color: 0x7e8d78, alpha: 0.96 });
      graphic.rect(blocker.x + 20, blocker.y + blocker.height * 0.8, blocker.width - 40, blocker.height * 0.12).fill({ color: 0x9da88f, alpha: 0.28 });
      graphic.rect(blocker.x + 10, blocker.y + blocker.height * 0.9, blocker.width - 20, blocker.height * 0.05).fill({ color: 0x403b31, alpha: 0.34 });
      break;
    case 'north':
    case null:
    default:
      graphic.roundRect(blocker.x, blocker.y + blocker.height * 0.18, blocker.width, blocker.height * 0.82, 18).fill({ color: 0x64745f, alpha: 0.92 });
      graphic.poly([
        blocker.x, blocker.y + blocker.height * 0.32,
        blocker.x + blocker.width * 0.08, blocker.y + blocker.height * 0.14,
        blocker.x + blocker.width * 0.22, blocker.y + blocker.height * 0.26,
        blocker.x + blocker.width * 0.36, blocker.y + blocker.height * 0.1,
        blocker.x + blocker.width * 0.5, blocker.y + blocker.height * 0.28,
        blocker.x + blocker.width * 0.68, blocker.y + blocker.height * 0.12,
        blocker.x + blocker.width * 0.82, blocker.y + blocker.height * 0.3,
        blocker.x + blocker.width, blocker.y + blocker.height * 0.16,
        blocker.x + blocker.width, blocker.y + blocker.height * 0.58,
        blocker.x + blocker.width * 0.76, blocker.y + blocker.height * 0.5,
        blocker.x + blocker.width * 0.52, blocker.y + blocker.height * 0.66,
        blocker.x + blocker.width * 0.24, blocker.y + blocker.height * 0.54,
        blocker.x, blocker.y + blocker.height * 0.7,
      ]).fill({ color: 0x7e8d78, alpha: 0.96 });
      graphic.rect(blocker.x + 20, blocker.y + blocker.height * 0.08, blocker.width - 40, blocker.height * 0.12).fill({ color: 0x9da88f, alpha: 0.28 });
      graphic.rect(blocker.x + 10, blocker.y + blocker.height * 0.05, blocker.width - 20, blocker.height * 0.05).fill({ color: 0x403b31, alpha: 0.34 });
      break;
  }
}

function drawCliffBlocker(graphic: Graphics, blocker: CoastalMapData['blockers'][number]): void {
  graphic.roundRect(blocker.x, blocker.y, blocker.width, blocker.height, 18).fill({ color: 0x312d25, alpha: 0.36 });
  graphic.poly([
    blocker.x,
    blocker.y + blocker.height,
    blocker.x,
    blocker.y + blocker.height * 0.16,
    blocker.x + blocker.width * 0.2,
    blocker.y + blocker.height * 0.04,
    blocker.x + blocker.width * 0.36,
    blocker.y + blocker.height * 0.22,
    blocker.x + blocker.width * 0.58,
    blocker.y + blocker.height * 0.08,
    blocker.x + blocker.width * 0.78,
    blocker.y + blocker.height * 0.28,
    blocker.x + blocker.width,
    blocker.y + blocker.height * 0.12,
    blocker.x + blocker.width,
    blocker.y + blocker.height,
  ]).fill({ color: 0x645847, alpha: 0.98 });
  graphic.rect(blocker.x + 16, blocker.y + blocker.height * 0.56, blocker.width - 32, 10).fill({ color: 0xa49173, alpha: 0.28 });
  graphic.rect(blocker.x + 22, blocker.y + blocker.height * 0.72, blocker.width - 44, 8).fill({ color: 0x4b4234, alpha: 0.34 });
}

function drawMarshBlocker(graphic: Graphics, blocker: CoastalMapData['blockers'][number]): void {
  graphic.roundRect(blocker.x, blocker.y, blocker.width, blocker.height, 22).fill({ color: 0x233329, alpha: 0.48 });
  graphic.ellipse(blocker.x + blocker.width * 0.32, blocker.y + blocker.height * 0.56, blocker.width * 0.26, blocker.height * 0.2).fill({ color: 0x556b4b, alpha: 0.52 });
  graphic.ellipse(blocker.x + blocker.width * 0.66, blocker.y + blocker.height * 0.48, blocker.width * 0.24, blocker.height * 0.18).fill({ color: 0x415844, alpha: 0.58 });
  for (let index = 0; index < 7; index += 1) {
    const x = blocker.x + 28 + index * ((blocker.width - 56) / 6);
    graphic.rect(x, blocker.y + blocker.height * 0.18, 4, blocker.height * 0.5).fill({ color: 0x8a9b73, alpha: 0.58 });
  }
}

function drawTerrainDecoration(graphic: Graphics, decoration: CoastalMapData['terrainDecorations'][number]): void {
  if (decoration.kind === 'oceanCliff' || decoration.kind === 'landCliff') {
    drawCliffBlocker(graphic, { ...decoration, kind: 'cliff' });
    return;
  }
  if (decoration.kind === 'landRidge') {
    drawRidgeBlocker(graphic, { ...decoration, kind: 'ridge' });
    return;
  }
  drawRockBlocker(graphic, { ...decoration, kind: 'rocks' });
}
