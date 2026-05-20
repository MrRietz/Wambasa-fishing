import { Assets, Texture } from 'pixi.js';
import type { AnimationAction, AnimationDirection, CardinalAnimationDirection, DamageState, EntityKind } from '../entities/components';
import type { BlockerKind, FishSpecies, TerrainDecorationKind } from '../map/mapTypes';
import { getUnitAnimationFrameCount, isHumanoidAnimationUnit, unitAnimationManifest, type HumanoidUnitKind } from './unitAnimationManifest';

const textures = new Map<string, Texture>();
const STARTUP_TEXTURE_CONCURRENCY = 8;
const DEFERRED_TEXTURE_CONCURRENCY = 6;
type VehicleSpriteKind = 'truck' | 'boat' | 'attackBoat';
type BuildingSpriteKind = 'factory' | 'dock' | 'house' | 'guardTower' | 'techLab' | 'barracks';
export type EffectSpriteKind = 'constructionDust' | 'repairSparks' | 'harvestSparks' | 'fishSplash' | 'cannonMuzzleFlash' | 'sabotageBurst' | 'smokePlume';
type TerrainPlateKind = 'water' | 'shoreline' | 'land' | 'road';
type TerrainBlockerSpriteKind = BlockerKind;
type TerrainObjectSpriteKind = 'dockPoint' | TerrainDecorationKind;
type FishSchoolSpriteKind = 'coastal' | 'silver' | 'blue' | 'salmon';
export interface SpriteFacingPresentation {
  textureDirection: AnimationDirection;
  flipX: boolean;
}
const cardinalDirections: CardinalAnimationDirection[] = ['east', 'south', 'west', 'north'];
const truckSpriteDirections: AnimationDirection[] = ['east', 'southEast', 'south', 'southWest', 'west', 'northWest', 'north', 'northEast'];
const truckEightDirectionActions = new Set<AnimationAction>(['move', 'harvest', 'unload']);
const terrainBackdropPath = '/assets/processed/g8-production/terrain-backdrop-v1.png';
const terrainPlatePaths: Record<TerrainPlateKind, string> = {
  water: '/assets/processed/g9-terrain/terrain-water-plate-v1.png',
  shoreline: '/assets/processed/g9-terrain/terrain-shoreline-plate-v1.png',
  land: '/assets/processed/g9-terrain/terrain-land-plate-v1.png',
  road: '/assets/processed/g9-terrain/terrain-road-plate-v1.png',
};
const terrainBlockerPaths: Record<TerrainBlockerSpriteKind, string> = {
  forest: '/assets/runtime/g8-production/terrain-props/forest-v1.png',
  rocks: '/assets/runtime/g8-production/terrain-props/rocks-v1.png',
  ridge: '/assets/runtime/g8-production/terrain-props/ridge-v1.png',
  cliff: '/assets/runtime/g8-production/terrain-props/cliff-v1.png',
  marsh: '/assets/runtime/g8-production/terrain-props/marsh-v1.png',
};
const fishingZoneMarkerPath = '/assets/runtime/g8-production/resources/fishing-zone-marker-v2.png';
const metalFieldPath = '/assets/runtime/g8-production/resources/metal-field-v1.png';
const fishSchoolPaths: Record<FishSchoolSpriteKind, string[]> = {
  coastal: [
    '/assets/runtime/g8-production/resources/fish-schools/coastal-school-v2-f0.png',
    '/assets/runtime/g8-production/resources/fish-schools/coastal-school-v2-f1.png',
    '/assets/runtime/g8-production/resources/fish-schools/coastal-school-v2-f2.png',
  ],
  silver: [
    '/assets/runtime/g8-production/resources/fish-schools/silver-school-v2-f0.png',
    '/assets/runtime/g8-production/resources/fish-schools/silver-school-v2-f1.png',
    '/assets/runtime/g8-production/resources/fish-schools/silver-school-v2-f2.png',
  ],
  blue: [
    '/assets/runtime/g8-production/resources/fish-schools/blue-school-v2-f0.png',
    '/assets/runtime/g8-production/resources/fish-schools/blue-school-v2-f1.png',
    '/assets/runtime/g8-production/resources/fish-schools/blue-school-v2-f2.png',
  ],
  salmon: [
    '/assets/runtime/g8-production/resources/fish-schools/salmon-school-v2-f0.png',
    '/assets/runtime/g8-production/resources/fish-schools/salmon-school-v2-f1.png',
    '/assets/runtime/g8-production/resources/fish-schools/salmon-school-v2-f2.png',
  ],
};
const terrainObjectPaths: Record<TerrainObjectSpriteKind, string> = {
  dockPoint: '/assets/runtime/g8-production/terrain-props/dock-point-v1.png',
  oceanCliff: '/assets/runtime/g8-production/terrain-props/cliff-v1.png',
  landRocks: '/assets/runtime/g8-production/terrain-props/rocks-v1.png',
  landRidge: '/assets/runtime/g8-production/terrain-props/ridge-v1.png',
  landCliff: '/assets/runtime/g8-production/terrain-props/cliff-v1.png',
};
const effectSpritePaths: Record<EffectSpriteKind, string> = {
  constructionDust: '/assets/runtime/g8-production/effects/construction-dust-v1.png',
  repairSparks: '/assets/runtime/g8-production/effects/repair-sparks-v1.png',
  harvestSparks: '/assets/runtime/g8-production/effects/harvest-sparks-v1.png',
  fishSplash: '/assets/runtime/g8-production/effects/fish-splash-v1.png',
  cannonMuzzleFlash: '/assets/runtime/g8-production/effects/cannon-muzzle-flash-v1.png',
  sabotageBurst: '/assets/runtime/g8-production/effects/sabotage-burst-v1.png',
  smokePlume: '/assets/runtime/g8-production/effects/smoke-plume-v1.png',
};
const optionalSpritePaths = new Set<string>([
  terrainBackdropPath,
  ...Object.values(terrainPlatePaths),
  ...Object.values(terrainBlockerPaths),
  ...Object.values(terrainObjectPaths),
  ...Object.values(effectSpritePaths),
  fishingZoneMarkerPath,
  metalFieldPath,
  ...Object.values(fishSchoolPaths).flat(),
]);

const vehicleSpriteDefinitions: Record<VehicleSpriteKind, Partial<Record<AnimationAction, { frameCount: number }>>> = {
  truck: {
    move: { frameCount: 8 },
    harvest: { frameCount: 1 },
    unload: { frameCount: 1 },
    damaged: { frameCount: 2 },
    destroyed: { frameCount: 2 },
  },
  boat: {
    move: { frameCount: 4 },
    fish: { frameCount: 5 },
    unload: { frameCount: 4 },
    damaged: { frameCount: 2 },
    destroyed: { frameCount: 2 },
  },
  attackBoat: {
    move: { frameCount: 4 },
    attack: { frameCount: 4 },
    damaged: { frameCount: 2 },
    destroyed: { frameCount: 2 },
  },
};
const optionalTruckSpritePaths = Object.entries(vehicleSpriteDefinitions.truck).flatMap(([action, animation]) =>
  getVehicleSpriteDirections('truck', action as AnimationAction)
    .filter((direction) => !cardinalDirections.includes(direction as CardinalAnimationDirection))
    .flatMap((direction) =>
      Array.from({ length: animation?.frameCount ?? 0 }, (_, frame) =>
        getVehicleSpritePath('truck', action as AnimationAction, direction, frame),
      ),
    ),
);
for (const path of optionalTruckSpritePaths) {
  optionalSpritePaths.add(path);
}
const optionalAttackBoatSpritePaths = Object.entries(vehicleSpriteDefinitions.attackBoat).flatMap(([action, animation]) =>
  getVehicleSpriteDirections('attackBoat', action as AnimationAction).flatMap((direction) =>
    Array.from({ length: animation?.frameCount ?? 0 }, (_, frame) =>
      getVehicleSpritePath('attackBoat', action as AnimationAction, direction, frame),
    ),
  ),
);
for (const path of optionalAttackBoatSpritePaths) {
  optionalSpritePaths.add(path);
}

const buildingSpritePaths: Record<BuildingSpriteKind, Record<'healthy' | 'damaged' | 'destroyed', string>> = {
  factory: {
    healthy: '/assets/runtime/g8-production/buildings/factory-command-center-v1.png',
    damaged: '/assets/runtime/g8-production/buildings/factory-command-center-damaged-v1.png',
    destroyed: '/assets/runtime/g8-production/buildings/factory-command-center-destroyed-v1.png',
  },
  dock: {
    healthy: '/assets/runtime/g8-production/buildings/dock-v1.png',
    damaged: '/assets/runtime/g8-production/buildings/dock-damaged-v1.png',
    destroyed: '/assets/runtime/g8-production/buildings/dock-destroyed-v1.png',
  },
  house: {
    healthy: '/assets/runtime/g8-production/buildings/house-v1.png',
    damaged: '/assets/runtime/g8-production/buildings/house-damaged-v1.png',
    destroyed: '/assets/runtime/g8-production/buildings/house-destroyed-v1.png',
  },
  guardTower: {
    healthy: '/assets/runtime/g8-production/buildings/guard-tower-v1.png',
    damaged: '/assets/runtime/g8-production/buildings/guard-tower-damaged-v1.png',
    destroyed: '/assets/runtime/g8-production/buildings/guard-tower-destroyed-v1.png',
  },
  techLab: {
    healthy: '/assets/runtime/g8-production/buildings/tech-lab-v1.png',
    damaged: '/assets/runtime/g8-production/buildings/tech-lab-damaged-v1.png',
    destroyed: '/assets/runtime/g8-production/buildings/tech-lab-destroyed-v1.png',
  },
  barracks: {
    healthy: '/assets/runtime/g8-production/buildings/barracks-v1.png',
    damaged: '/assets/runtime/g8-production/buildings/barracks-damaged-v1.png',
    destroyed: '/assets/runtime/g8-production/buildings/barracks-destroyed-v1.png',
  },
};

export interface UnitSpriteTextureLoadResult {
  startupPathCount: number;
  deferredPathCount: number;
  deferred: Promise<void>;
}

export async function loadUnitSpriteTextures(): Promise<UnitSpriteTextureLoadResult> {
  const startupPaths = listStartupSpritePaths();
  const deferredPaths = listUnitSpritePaths().filter((path) => !startupPaths.includes(path));
  textures.clear();
  await loadTexturePaths(startupPaths, STARTUP_TEXTURE_CONCURRENCY);
  const deferred = loadTexturePaths(deferredPaths, DEFERRED_TEXTURE_CONCURRENCY, true);
  return {
    startupPathCount: startupPaths.length,
    deferredPathCount: deferredPaths.length,
    deferred,
  };
}

export function getUnitSpriteTexture(
  kind: EntityKind,
  action: AnimationAction,
  direction: AnimationDirection,
  frame: number,
  combatRole?: string,
): Texture | undefined {
  if (isVehicleSpriteKind(kind)) {
    const vehicleKind = resolveVehicleSpriteKind(kind, combatRole);
    const spriteAction = resolveVehicleSpriteAction(vehicleKind, action);
    const presentation = resolveSpriteFacingPresentation(kind, direction);
    const candidateDirections = resolveVehicleTextureDirections(vehicleKind, presentation.textureDirection);
    const texture = getVehicleSpriteTextureForDirections(vehicleKind, spriteAction, candidateDirections, frame);
    if (texture) {
      return texture;
    }
    if (spriteAction !== 'move') {
      const moveTexture = getVehicleSpriteTextureForDirections(vehicleKind, 'move', candidateDirections, frame);
      if (moveTexture) {
        return moveTexture;
      }
    }
    if (vehicleKind === 'attackBoat') {
      const fallbackAction = resolveVehicleSpriteAction('boat', action);
      const fallbackTexture = getVehicleSpriteTextureForDirections('boat', fallbackAction, resolveVehicleTextureDirections('boat', presentation.textureDirection), frame);
      if (fallbackTexture) {
        return fallbackTexture;
      }
      if (fallbackAction !== 'move') {
        return getVehicleSpriteTextureForDirections('boat', 'move', resolveVehicleTextureDirections('boat', presentation.textureDirection), frame);
      }
    }
    return undefined;
  }
  if (!isHumanoidAnimationUnit(kind)) return undefined;
  const spriteAction = resolveHumanoidSpriteAction(kind, action);
  const frameCount = getUnitAnimationFrameCount(kind, spriteAction) ?? getUnitAnimationFrameCount(kind, 'idle') ?? 1;
  const normalizedFrame = ((frame % frameCount) + frameCount) % frameCount;
  const presentation = resolveSpriteFacingPresentation(kind, direction);
  return textures.get(getUnitSpritePath(kind, spriteAction, cardinalizeDirection(presentation.textureDirection), normalizedFrame));
}

export function getBuildingSpriteTexture(kind: EntityKind, damageState?: DamageState): Texture | undefined {
  const buildingKind = resolveBuildingSpriteKind(kind);
  if (!buildingKind) return undefined;
  const stateKey = damageState === 'destroyed' ? 'destroyed' : damageState === 'damaged' || damageState === 'critical' ? 'damaged' : 'healthy';
  return textures.get(buildingSpritePaths[buildingKind][stateKey]);
}

export function getFishingZoneMarkerTexture(): Texture | undefined {
  return textures.get(fishingZoneMarkerPath);
}

export function getMetalFieldTexture(): Texture | undefined {
  return textures.get(metalFieldPath);
}

export function getFishSchoolTexture(species: FishSpecies, frame = 0): Texture | undefined {
  const frames = fishSchoolPaths[resolveFishSchoolSpriteKind(species)];
  const normalizedFrame = ((frame % frames.length) + frames.length) % frames.length;
  return textures.get(frames[normalizedFrame]);
}

export function getTerrainBackdropTexture(): Texture | undefined {
  return textures.get(terrainBackdropPath);
}

export function getTerrainPlateTexture(kind: TerrainPlateKind): Texture | undefined {
  const path = terrainPlatePaths[kind];
  return path ? textures.get(path) : undefined;
}

export function getEffectSpriteTexture(kind: EffectSpriteKind): Texture | undefined {
  return textures.get(effectSpritePaths[kind]);
}

export function getTerrainBlockerTexture(kind: TerrainBlockerSpriteKind): Texture | undefined {
  return textures.get(terrainBlockerPaths[kind]);
}

export function getTerrainObjectTexture(kind: TerrainObjectSpriteKind): Texture | undefined {
  const path = terrainObjectPaths[kind];
  return path ? textures.get(path) : undefined;
}

export function hasLoadedTruckEightDirectionSprites(): boolean {
  return truckSpriteDirections
    .filter((direction) => !cardinalDirections.includes(direction as CardinalAnimationDirection))
    .every((direction) => textures.has(getVehicleSpritePath('truck', 'move', direction, 0)));
}

export function resolveSpriteFacingPresentation(kind: EntityKind, direction: AnimationDirection): SpriteFacingPresentation {
  if (kind === 'truck') {
    if (direction === 'east') {
      return { textureDirection: 'west', flipX: true };
    }
    return { textureDirection: direction, flipX: false };
  }
  const cardinalDirection = cardinalizeDirection(direction);
  if (cardinalDirection === 'west' && isHumanoidAnimationUnit(kind)) {
    return { textureDirection: 'east', flipX: true };
  }
  return {
    textureDirection: isHumanoidAnimationUnit(kind) ? resolveHumanoidSpriteDirection(kind, cardinalDirection) : direction,
    flipX: false,
  };
}

export function listUnitSpritePaths(): string[] {
  const humanoidPaths = Object.entries(unitAnimationManifest.units).flatMap(([unit, definition]) =>
    Object.entries(definition.actions).flatMap(([action, animation]) =>
      unitAnimationManifest.directions.flatMap((direction) =>
        Array.from({ length: animation.frameCount }, (_, frame) =>
          getUnitSpritePath(unit as HumanoidUnitKind, action as AnimationAction, direction, frame),
        ),
      ),
    ),
  );
  const vehiclePaths = Object.entries(vehicleSpriteDefinitions).flatMap(([kind, definition]) =>
    Object.entries(definition).flatMap(([action, animation]) =>
      getVehicleSpriteDirections(kind as VehicleSpriteKind, action as AnimationAction).flatMap((direction) =>
        Array.from({ length: animation?.frameCount ?? 0 }, (_, frame) =>
          getVehicleSpritePath(kind as VehicleSpriteKind, action as AnimationAction, direction, frame),
        ),
      ),
    ),
  );
  const buildingPaths = Object.values(buildingSpritePaths).flatMap((variants) => Object.values(variants));
  return uniquePaths([
    ...humanoidPaths,
    ...vehiclePaths,
    ...buildingPaths,
    ...Object.values(effectSpritePaths),
    terrainBackdropPath,
    ...Object.values(terrainPlatePaths).filter(Boolean),
    ...Object.values(terrainBlockerPaths),
    ...Object.values(terrainObjectPaths).filter(Boolean),
    fishingZoneMarkerPath,
    metalFieldPath,
    ...Object.values(fishSchoolPaths).flat(),
  ]);
}

function listStartupSpritePaths(): string[] {
  const workerPaths = ['idle', 'move'].flatMap((action) =>
    unitAnimationManifest.directions.flatMap((direction) =>
      Array.from({ length: getUnitAnimationFrameCount('worker', action as AnimationAction) ?? 0 }, (_, frame) =>
        getUnitSpritePath('worker', action as AnimationAction, direction, frame),
      ),
    ),
  );
  const truckPaths = ['move', 'harvest', 'unload'].flatMap((action) =>
    getVehicleSpriteDirections('truck', action as AnimationAction).flatMap((direction) =>
      Array.from({ length: vehicleSpriteDefinitions.truck[action as AnimationAction]?.frameCount ?? 0 }, (_, frame) =>
        getVehicleSpritePath('truck', action as AnimationAction, direction, frame),
      ),
    ),
  );

  return uniquePaths([
    ...Object.values(terrainPlatePaths),
    buildingSpritePaths.factory.healthy,
    ...workerPaths,
    ...truckPaths,
    fishingZoneMarkerPath,
    metalFieldPath,
    ...Object.values(fishSchoolPaths).map((frames) => frames[0]),
  ]);
}

async function loadTexturePaths(paths: string[], concurrency: number, tolerateMissing = false): Promise<void> {
  const queue = [...paths];
  const workerCount = Math.max(1, Math.min(concurrency, queue.length));
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (queue.length > 0) {
        const path = queue.shift();
        if (!path || textures.has(path)) {
          continue;
        }
        try {
          const texture = await Assets.load<Texture>(resolvePublicAssetPath(path));
          textures.set(path, texture);
        } catch (error) {
          if (!tolerateMissing && !optionalSpritePaths.has(path)) {
            throw error;
          }
          if (!optionalSpritePaths.has(path)) {
            console.warn(`Runtime sprite skipped: ${path}`, error);
          }
        }
      }
    }),
  );
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.filter(Boolean))];
}

function getUnitSpritePath(kind: HumanoidUnitKind, action: AnimationAction, direction: CardinalAnimationDirection, frame: number): string {
  const extension = unitAnimationManifest.units[kind].format ?? 'svg';
  return `/assets/runtime/units/${kind}/${action}/${direction}/${String(frame).padStart(2, '0')}.${extension}`;
}

function resolveHumanoidSpriteDirection(kind: HumanoidUnitKind, direction: CardinalAnimationDirection): CardinalAnimationDirection {
  if (kind === 'guard') {
    if (direction === 'east') return 'west';
    if (direction === 'west') return 'east';
  }
  return direction;
}

function isVehicleSpriteKind(kind: EntityKind): kind is Extract<EntityKind, 'truck' | 'boat'> {
  return kind === 'truck' || kind === 'boat';
}

function resolveVehicleSpriteKind(kind: Extract<EntityKind, 'truck' | 'boat'>, combatRole?: string): VehicleSpriteKind {
  return kind === 'boat' && combatRole === 'attack' ? 'attackBoat' : kind;
}

function resolveVehicleSpriteAction(kind: VehicleSpriteKind, action: AnimationAction): AnimationAction {
  if (vehicleSpriteDefinitions[kind][action]) return action;
  return 'move';
}

function resolveHumanoidSpriteAction(kind: HumanoidUnitKind, action: AnimationAction): AnimationAction {
  if (getUnitAnimationFrameCount(kind, action)) {
    return action;
  }
  if (action === 'damaged' || action === 'destroyed') {
    return 'idle';
  }
  return 'idle';
}

function getVehicleSpriteDirections(kind: VehicleSpriteKind, action?: AnimationAction): AnimationDirection[] {
  return kind === 'truck' && (!action || truckEightDirectionActions.has(action)) ? truckSpriteDirections : cardinalDirections;
}

function cardinalizeDirection(direction: AnimationDirection): CardinalAnimationDirection {
  switch (direction) {
    case 'northEast':
      return 'east';
    case 'southEast':
      return 'east';
    case 'southWest':
      return 'west';
    case 'northWest':
      return 'west';
    default:
      return direction;
  }
}

function resolveVehicleTextureDirections(kind: VehicleSpriteKind, direction: AnimationDirection): AnimationDirection[] {
  if (kind === 'truck') {
    const fallbackDirection = cardinalFallbackDirection(direction);
    return fallbackDirection === direction ? [direction] : [direction, fallbackDirection];
  }
  return [cardinalizeDirection(direction)];
}

function getVehicleSpriteTextureForDirections(
  kind: VehicleSpriteKind,
  action: AnimationAction,
  candidateDirections: AnimationDirection[],
  frame: number,
): Texture | undefined {
  const frameCount = vehicleSpriteDefinitions[kind][action]?.frameCount ?? 1;
  const normalizedFrame = ((frame % frameCount) + frameCount) % frameCount;
  for (const candidateDirection of candidateDirections) {
    const texture = textures.get(getVehicleSpritePath(kind, action, candidateDirection, normalizedFrame));
    if (texture) {
      return texture;
    }
  }
  return undefined;
}

function cardinalFallbackDirection(direction: AnimationDirection): CardinalAnimationDirection {
  switch (direction) {
    case 'northEast':
      return 'east';
    case 'southEast':
      return 'south';
    case 'southWest':
      return 'south';
    case 'northWest':
      return 'north';
    default:
      return direction;
  }
}

function getVehicleSpritePath(kind: VehicleSpriteKind, action: AnimationAction, direction: AnimationDirection, frame: number): string {
  return `/assets/runtime/units/${kind}/${action}/${direction}/${String(frame).padStart(2, '0')}.png`;
}

function resolvePublicAssetPath(path: string): string {
  if (!path.startsWith('/')) return path;
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${path.slice(1)}`;
}

function resolveBuildingSpriteKind(kind: EntityKind): BuildingSpriteKind | undefined {
  if (kind === 'enemyFactory') return 'factory';
  if (kind === 'factory' || kind === 'dock' || kind === 'house' || kind === 'guardTower' || kind === 'techLab' || kind === 'barracks') return kind;
  return undefined;
}

function resolveFishSchoolSpriteKind(species: FishSpecies): FishSchoolSpriteKind {
  switch (species) {
    case 'cod':
    case 'anchovy':
      return 'coastal';
    case 'herring':
    case 'sardine':
      return 'silver';
    case 'mackerel':
    case 'tuna':
      return 'blue';
    case 'salmon':
    default:
      return 'salmon';
  }
}
