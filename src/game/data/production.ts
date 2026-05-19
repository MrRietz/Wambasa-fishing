import type { GameEntity } from '../entities/components';

export type ProductionKind = 'worker' | 'guard' | 'saboteur' | 'truck' | 'boat' | 'attackBoat';

export interface ProductionDefinition {
  label: string;
  cost: number;
  cashCost?: number;
  seconds: number;
  crewCost?: number;
}

export const productionCatalog: Record<ProductionKind, ProductionDefinition> = {
  worker: { label: 'Worker', cost: 80, seconds: 1.2, crewCost: 1 },
  guard: { label: 'Guard', cost: 120, cashCost: 20, seconds: 1.4, crewCost: 1 },
  saboteur: { label: 'Saboteur', cost: 150, cashCost: 40, seconds: 1.5, crewCost: 1 },
  truck: { label: 'Metal Hauler', cost: 180, seconds: 1.6, crewCost: 2 },
  boat: { label: 'Fishing Boat', cost: 140, cashCost: 40, seconds: 1.5, crewCost: 2 },
  attackBoat: { label: 'Attack Boat', cost: 180, cashCost: 80, seconds: 1.8, crewCost: 3 },
};

export function formatProductionCost(definition: ProductionDefinition): string {
  const baseCost = definition.cashCost && definition.cashCost > 0
    ? `${definition.cost} metal + ${definition.cashCost} cash`
    : `${definition.cost} metal`;
  return definition.crewCost && definition.crewCost > 0 ? `${baseCost} + ${definition.crewCost} crew` : baseCost;
}

export function getEntityCrewCost(entity: GameEntity): number {
  if (entity.kind === 'worker') return productionCatalog.worker.crewCost ?? 0;
  if (entity.kind === 'guard') return productionCatalog.guard.crewCost ?? 0;
  if (entity.kind === 'saboteur') return productionCatalog.saboteur.crewCost ?? 0;
  if (entity.kind === 'truck') return productionCatalog.truck.crewCost ?? 0;
  if (entity.kind === 'boat') {
    return entity.economy?.combatRole === 'attack'
      ? productionCatalog.attackBoat.crewCost ?? 0
      : productionCatalog.boat.crewCost ?? 0;
  }
  return 0;
}
