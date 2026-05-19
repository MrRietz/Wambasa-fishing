import type { DamageState, GameEntity } from '../../entities/components';

export type SabotageSystemEvent =
  | { kind: 'recovered'; targetId: string; targetName: string; disabledSeconds: number }
  | { kind: 'disabled'; saboteurId: string; saboteurName: string; targetId: string; targetName: string; disabledSeconds: number };

export interface SabotageSystemInput {
  entities: GameEntity[];
  deltaSeconds: number;
  getDamageState: (entity: GameEntity) => DamageState | undefined;
}

export interface SabotageSystemOutput {
  changed: boolean;
  events: SabotageSystemEvent[];
}

export function updateSabotageSystem(input: SabotageSystemInput): SabotageSystemOutput {
  let changed = false;
  const events: SabotageSystemEvent[] = [];

  for (const entity of input.entities) {
    const disabledSeconds = entity.economy?.disabledSeconds;
    if (disabledSeconds === undefined || disabledSeconds <= 0) {
      continue;
    }

    const nextSeconds = Math.max(0, disabledSeconds - input.deltaSeconds);
    entity.economy = { ...entity.economy, disabledSeconds: nextSeconds };
    changed = true;
    if (disabledSeconds > 0 && nextSeconds === 0) {
      events.push({ kind: 'recovered', targetId: entity.id, targetName: entity.name, disabledSeconds: 0 });
    }
  }

  for (const saboteur of input.entities.filter((entity) => entity.faction === 'player' && entity.economy?.sabotage?.phase === 'sabotaging')) {
    const sabotage = saboteur.economy?.sabotage;
    const target = sabotage ? input.entities.find((entity) => entity.id === sabotage.targetId) : undefined;
    if (!sabotage || !target || target.faction !== 'enemy' || target.renderable.layer !== 'buildings' || input.getDamageState(target) === 'destroyed') {
      saboteur.economy = { ...saboteur.economy, sabotage: undefined };
      changed = true;
      continue;
    }

    target.economy = { ...target.economy, disabledSeconds: sabotage.disableSeconds };
    saboteur.economy = { ...saboteur.economy, sabotage: undefined };
    saboteur.movement.state = 'idle';
    events.push({
      kind: 'disabled',
      saboteurId: saboteur.id,
      saboteurName: saboteur.name,
      targetId: target.id,
      targetName: target.name,
      disabledSeconds: sabotage.disableSeconds,
    });
    changed = true;
  }

  return { changed, events };
}
