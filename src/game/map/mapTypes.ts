export type TerrainKind = 'land' | 'water' | 'shore' | 'road' | 'blocker';
export type ResourceKind = 'metal' | 'fish';
export type BlockerKind = 'forest' | 'rocks' | 'ridge' | 'cliff' | 'marsh';
export type TerrainDecorationKind = 'oceanCliff' | 'landRocks' | 'landRidge' | 'landCliff';
export type FishSpecies = 'cod' | 'herring' | 'mackerel' | 'sardine' | 'salmon' | 'tuna' | 'anchovy';

export interface RectData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleData {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export type FishingZoneTier = 'safe' | 'contested';

export interface FishingZoneData extends CircleData {
  label: string;
  tier: FishingZoneTier;
  cashPerFish: number;
  species?: FishSpecies[];
  shoreAccess?: boolean;
  maxFish?: number;
  regrowthPerSecond?: number;
  regrowthDelaySeconds?: number;
}

export interface FishingZoneState extends FishingZoneData {
  amount: number;
  maxFish: number;
  regrowthPerSecond: number;
  depletedCooldownSeconds: number;
}

export interface CoastalMapData {
  width: number;
  height: number;
  terrain: Array<RectData & { kind: TerrainKind }>;
  metalFields: CircleData[];
  fishingZones: FishingZoneData[];
  baseAreas: Array<RectData & { owner: 'player' | 'enemy' | 'neutral' }>;
  dockPoints: CircleData[];
  terrainDecorations: Array<RectData & { kind: TerrainDecorationKind }>;
  blockers: Array<RectData & { kind: BlockerKind }>;
  buildable: RectData[];
}

export interface ResourceField {
  id: string;
  kind: ResourceKind;
  x: number;
  y: number;
  radius: number;
  amount: number;
  maxAmount: number;
}
