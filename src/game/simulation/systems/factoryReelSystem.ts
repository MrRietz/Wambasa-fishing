import type { GameEntity } from '../../entities/components';

export type FactoryReelEvent =
  | { kind: 'reelProduced'; factoryId: string; autoSold: boolean; cashGained: number }
  | { kind: 'reelsSold'; factoryId: string; reelCount: number; cashGained: number };

export interface FactoryReelSystemInput {
  entities: GameEntity[];
  deltaSeconds: number;
  playerCash: { cash: number };
  faction?: GameEntity['faction'];
  reelBuildSeconds?: number;
  reelSellValue?: number;
  cncLevel?: number;
}

export interface FactoryReelSystemOutput {
  changed: boolean;
  events: FactoryReelEvent[];
}

export const REEL_BUILD_SECONDS = 11;
export const REEL_SELL_VALUE = 18;
const FACTORY_CREW_EFFICIENCY_STEP = 0.45;
const CNC_EFFICIENCY_STEP = 0.15;

export function updateFactoryReelSystem(input: FactoryReelSystemInput): FactoryReelSystemOutput {
  let changed = false;
  const events: FactoryReelEvent[] = [];
  const reelBuildSeconds = input.reelBuildSeconds ?? REEL_BUILD_SECONDS;
  const reelSellValue = input.reelSellValue ?? REEL_SELL_VALUE;
  const cncMultiplier = 1 + (input.cncLevel ?? 0) * CNC_EFFICIENCY_STEP;
  const faction = input.faction ?? 'player';

  for (const factory of input.entities.filter((entity) => (entity.kind === 'factory' || entity.kind === 'enemyFactory') && entity.faction === faction && entity.economy?.reelWorkshop)) {
    const workshop = factory.economy?.reelWorkshop;
    if (!workshop) {
      continue;
    }
    const activeCrew = input.entities.filter(
      (entity) => entity.kind === 'worker' && entity.faction === faction && entity.economy?.factoryDuty?.factoryId === factory.id && entity.economy.factoryDuty.phase === 'producing',
    ).length;
    if (activeCrew <= 0) {
      continue;
    }

    const crewEfficiency = getFactoryCrewEfficiency(activeCrew) * cncMultiplier;
    let reelProgressSeconds = workshop.reelProgressSeconds + input.deltaSeconds * crewEfficiency;
    let reelInventory = workshop.reelInventory;
    let producedAny = false;

    while (reelProgressSeconds >= reelBuildSeconds) {
      reelProgressSeconds -= reelBuildSeconds;
      producedAny = true;
      if (workshop.autoSell) {
        input.playerCash.cash += reelSellValue;
        events.push({ kind: 'reelProduced', factoryId: factory.id, autoSold: true, cashGained: reelSellValue });
      } else {
        reelInventory += 1;
        events.push({ kind: 'reelProduced', factoryId: factory.id, autoSold: false, cashGained: 0 });
      }
    }

    if (!producedAny) {
      factory.economy = { ...factory.economy, reelWorkshop: { ...workshop, reelProgressSeconds } };
      changed = true;
      continue;
    }

    factory.economy = {
      ...factory.economy,
      reelWorkshop: {
        ...workshop,
        reelProgressSeconds,
        reelInventory,
      },
    };
    changed = true;
  }

  return { changed, events };
}

export function sellFactoryReels(factory: GameEntity, playerCash: { cash: number }, reelSellValue = REEL_SELL_VALUE): FactoryReelEvent | null {
  const workshop = factory.economy?.reelWorkshop;
  if (!workshop || workshop.reelInventory <= 0) {
    return null;
  }
  const cashGained = workshop.reelInventory * reelSellValue;
  playerCash.cash += cashGained;
  factory.economy = {
    ...factory.economy,
    reelWorkshop: {
      ...workshop,
      reelInventory: 0,
    },
  };
  return { kind: 'reelsSold', factoryId: factory.id, reelCount: workshop.reelInventory, cashGained };
}

function getFactoryCrewEfficiency(activeCrew: number): number {
  if (activeCrew <= 0) {
    return 0;
  }
  return 1 + (activeCrew - 1) * FACTORY_CREW_EFFICIENCY_STEP;
}
