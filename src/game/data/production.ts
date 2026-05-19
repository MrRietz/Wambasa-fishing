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
  worker: { label: 'Worker', cost: 60, seconds: 3.6, crewCost: 1 },
  guard: { label: 'Guard', cost: 90, cashCost: 15, seconds: 4.2, crewCost: 1 },
  saboteur: { label: 'Saboteur', cost: 110, cashCost: 25, seconds: 4.8, crewCost: 1 },
  truck: { label: 'Metal Hauler', cost: 130, seconds: 5.2, crewCost: 2 },
  boat: { label: 'Fishing Boat', cost: 100, cashCost: 25, seconds: 5.8, crewCost: 2 },
  attackBoat: { label: 'Attack Boat', cost: 135, cashCost: 50, seconds: 6.6, crewCost: 3 },
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
