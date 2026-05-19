import type { DamageState, GameEntity, MatchOutcome } from '../../entities/components';

export interface WinConditionInput {
  entities: GameEntity[];
  playerCash: number;
  aiCash: number;
  playerMetal?: number;
  aiMetal?: number;
  elapsedSeconds?: number;
  playerProfitTarget: number;
  aiProfitTarget: number;
  economicVictoryLeadRequired?: number;
  economicVictoryGraceSeconds?: number;
  getDamageState: (entity: GameEntity) => DamageState | undefined;
}

export interface WinConditionResult {
  outcome: Exclude<MatchOutcome, 'running'>;
  reason: string;
}

export function evaluateWinCondition(input: WinConditionInput): WinConditionResult | undefined {
  const playerCommandCenterDestroyed = input.entities.some(
    (entity) => entity.kind === 'factory' && entity.faction === 'player' && input.getDamageState(entity) === 'destroyed',
  );
  const enemyCommandCenterDestroyed = input.entities.some(
    (entity) => entity.kind === 'enemyFactory' && entity.faction === 'enemy' && input.getDamageState(entity) === 'destroyed',
  );

  if (enemyCommandCenterDestroyed) {
    return { outcome: 'victory', reason: 'Enemy command center destroyed.' };
  }

  if (playerCommandCenterDestroyed) {
    return { outcome: 'defeat', reason: 'Factory Command Center destroyed.' };
  }

  const playerAssetsRemaining = hasRemainingAssets('player', input.entities, input.getDamageState);
  const enemyAssetsRemaining = hasRemainingAssets('enemy', input.entities, input.getDamageState);

  if (!enemyAssetsRemaining) {
    return { outcome: 'victory', reason: 'All rival units and buildings destroyed.' };
  }

  if (!playerAssetsRemaining) {
    return { outcome: 'defeat', reason: 'All friendly units and buildings lost.' };
  }

  const playerLead = input.playerCash - input.aiCash;
  const aiLead = input.aiCash - input.playerCash;
  const economicVictoryLeadRequired = input.economicVictoryLeadRequired ?? 1;
  const economicVictoryGraceSeconds = input.economicVictoryGraceSeconds ?? 0;
  const elapsedSeconds = input.elapsedSeconds ?? economicVictoryGraceSeconds;
  const economicVictoryUnlocked = elapsedSeconds >= economicVictoryGraceSeconds;

  if (
    economicVictoryUnlocked &&
    input.playerCash >= input.playerProfitTarget &&
    playerLead >= economicVictoryLeadRequired
  ) {
    return {
      outcome: 'victory',
      reason: `Economic victory secured: ${input.playerCash}/${input.playerProfitTarget} cash with a ${playerLead} cash lead after the long market race.`,
    };
  }

  if (
    economicVictoryUnlocked &&
    input.aiCash >= input.aiProfitTarget &&
    aiLead >= economicVictoryLeadRequired
  ) {
    return {
      outcome: 'defeat',
      reason: `Rival economic victory: enemy reached ${input.aiCash}/${input.aiProfitTarget} cash with a ${aiLead} cash lead in the market race.`,
    };
  }

  return undefined;
}

function hasRemainingAssets(
  faction: 'player' | 'enemy',
  entities: GameEntity[],
  getDamageState: (entity: GameEntity) => DamageState | undefined,
): boolean {
  return entities.some(
    (entity) =>
      entity.faction === faction &&
      !entity.renderable.hidden &&
      getDamageState(entity) !== 'destroyed' &&
      (entity.economy?.health ?? 1) > 0 &&
      (entity.renderable.layer === 'buildings' || entity.movement.speed > 0),
  );
}
