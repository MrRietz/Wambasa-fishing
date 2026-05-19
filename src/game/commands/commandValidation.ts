import type { GameEntity } from '../entities/components';
import type { ProductionDefinition } from '../data/production';
import type { CommandResult } from './commandTypes';

export function validateProductionCommand(
  producer: GameEntity | null,
  stockpile: { metal: number; cash: number },
  definition: ProductionDefinition,
  missingProducerMessage: string,
  crew?: { used: number; capacity: number; reserved?: number },
): CommandResult | null {
  if (!producer) {
    return {
      ok: false,
      kind: 'produce',
      reason: 'not-factory-selected',
      message: missingProducerMessage,
    };
  }

  if (stockpile.metal < definition.cost || stockpile.cash < (definition.cashCost ?? 0)) {
    return {
      ok: false,
      kind: 'produce',
      reason: 'unaffordable',
      message: `Need ${formatMissingProductionCost(definition, stockpile)} to build ${definition.label}.`,
    };
  }

  const reserved = crew?.reserved ?? 0;
  const neededCrew = definition.crewCost ?? 0;
  if (crew && neededCrew > 0 && crew.used + reserved + neededCrew > crew.capacity) {
    const shortfall = crew.used + reserved + neededCrew - crew.capacity;
    return {
      ok: false,
      kind: 'produce',
      reason: 'unaffordable',
      message: `Need ${shortfall} more crew capacity to build ${definition.label}. Build Houses first.`,
    };
  }

  return null;
}

function formatMissingProductionCost(definition: ProductionDefinition, stockpile: { metal: number; cash: number }): string {
  const missingMetal = Math.max(0, definition.cost - stockpile.metal);
  const missingCash = Math.max(0, (definition.cashCost ?? 0) - stockpile.cash);
  if (missingMetal > 0 && missingCash > 0) {
    return `${missingMetal} more metal and ${missingCash} more cash`;
  }
  if (missingCash > 0) {
    return `${missingCash} cash`;
  }
  return `${missingMetal} metal`;
}
