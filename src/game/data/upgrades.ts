export type TechUpgradeKind = 'cnc' | 'military' | 'boats' | 'reels';

export interface TechUpgradeDefinition {
  label: string;
  shortLabel: string;
  description: string;
  baseMetalCost: number;
  baseCashCost: number;
  metalStep: number;
  cashStep: number;
  maxLevel: number;
}

export interface TechUpgradeCost {
  metal: number;
  cash: number;
}

export const techUpgradeCatalog: Record<TechUpgradeKind, TechUpgradeDefinition> = {
  cnc: {
    label: 'CNC Machines',
    shortLabel: 'CNC',
    description: 'Factory reels finish faster.',
    baseMetalCost: 160,
    baseCashCost: 60,
    metalStep: 80,
    cashStep: 40,
    maxLevel: 3,
  },
  military: {
    label: 'Military Drill',
    shortLabel: 'MIL',
    description: 'Guards and attack boats get sturdier.',
    baseMetalCost: 200,
    baseCashCost: 80,
    metalStep: 90,
    cashStep: 45,
    maxLevel: 3,
  },
  boats: {
    label: 'Boat Upgrades',
    shortLabel: 'BOT',
    description: 'Boats gain speed and hull strength.',
    baseMetalCost: 180,
    baseCashCost: 70,
    metalStep: 85,
    cashStep: 45,
    maxLevel: 3,
  },
  reels: {
    label: 'Reel Tuning',
    shortLabel: 'REL',
    description: 'Reels sell for more and fish better.',
    baseMetalCost: 140,
    baseCashCost: 50,
    metalStep: 70,
    cashStep: 35,
    maxLevel: 3,
  },
};

export function getTechUpgradeCost(kind: TechUpgradeKind, currentLevel: number): TechUpgradeCost {
  const definition = techUpgradeCatalog[kind];
  return {
    metal: definition.baseMetalCost + definition.metalStep * currentLevel,
    cash: definition.baseCashCost + definition.cashStep * currentLevel,
  };
}

export function formatTechUpgradeCost(cost: TechUpgradeCost): string {
  return `${cost.metal} metal + ${cost.cash} cash`;
}
