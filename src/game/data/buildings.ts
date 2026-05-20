export type BuildingPlanKind = 'house' | 'dock' | 'guardTower' | 'techLab' | 'barracks' | 'factory';

export interface BuildingPlanDefinition {
  label: string;
  width: number;
  height: number;
  cost: number;
  seconds: number;
  capacityBonus: number;
  health: number;
  tint: number;
}

export const buildingCatalog: Record<BuildingPlanKind, BuildingPlanDefinition> = {
  house: { label: 'House foundation', width: 140, height: 110, cost: 90, seconds: 4.5, capacityBonus: 8, health: 420, tint: 0x9f7e4d },
  dock: { label: 'Dock foundation', width: 220, height: 92, cost: 120, seconds: 6.5, capacityBonus: 0, health: 760, tint: 0x6c4f36 },
  guardTower: { label: 'Guard Tower foundation', width: 96, height: 96, cost: 150, seconds: 7.5, capacityBonus: 0, health: 520, tint: 0x6f7f68 },
  techLab: { label: 'Tech Lab foundation', width: 154, height: 116, cost: 190, seconds: 9.5, capacityBonus: 0, health: 640, tint: 0x4f7f86 },
  barracks: { label: 'Barracks foundation', width: 168, height: 120, cost: 180, seconds: 8.5, capacityBonus: 0, health: 700, tint: 0x8b6d4f },
  factory: { label: 'Command Center foundation', width: 315, height: 210, cost: 420, seconds: 22, capacityBonus: 0, health: 1500, tint: 0x4f8fc5 },
};
