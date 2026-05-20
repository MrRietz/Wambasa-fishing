import { Container, Graphics, Sprite } from 'pixi.js';
import { getUnitAnimationDefinition, isHumanoidAnimationUnit, resolveUnitAnimationPose } from '../art/unitAnimationManifest';
import { getBuildingSpriteTexture, getEffectSpriteTexture, getUnitSpriteTexture, resolveSpriteFacingPresentation } from '../art/unitSpriteAssets';
import { clamp } from '../core/math';
import { getCollisionRadius } from '../map/geometry';
import type { AnimationDirection, DamageState, GameEntity } from '../entities/components';
import type { RenderLayers } from './layers';
import { getRenderPolishState } from './renderPolishState';

export interface EntityRenderContext {
  entities: GameEntity[];
  getDamageState: (entity: GameEntity) => DamageState | undefined;
  getMaxHealth: (entity: GameEntity) => number;
}

export function renderEntityLayers(layers: RenderLayers, context: EntityRenderContext): void {
  renderBuildings(layers, context);
  renderUnits(layers, context);
  renderEffects(layers, context);
}

export function renderBuildings(layers: RenderLayers, context: EntityRenderContext): void {
  clearLayerChildren(layers.buildings);
  for (const entity of context.entities) {
    if (entity.renderable.hidden || entity.renderable.layer !== 'buildings' || context.getDamageState(entity) === 'destroyed') {
      continue;
    }
    const sprite = createBuildingSprite(entity);
    if (sprite) {
      layers.buildings.addChild(sprite);
      const overlay = new Graphics({ label: `entity-${entity.id}-overlay` });
      drawBuildingSpriteOverlay(overlay, entity, context);
      layers.buildings.addChild(overlay);
    }
  }
}

export function renderUnits(layers: RenderLayers, context: EntityRenderContext): void {
  clearLayerChildren(layers.units);
  for (const entity of context.entities) {
    if (entity.renderable.hidden || entity.renderable.layer !== 'units' || context.getDamageState(entity) === 'destroyed') {
      continue;
    }
    const sprite = createUnitSprite(entity);
    if (sprite) {
      layers.units.addChild(sprite);
      const overlay = new Graphics({ label: `entity-${entity.id}-overlay` });
      drawUnitSpriteOverlay(overlay, entity, context);
      layers.units.addChild(overlay);
    }
  }
}

export function renderEffects(layers: RenderLayers, context: EntityRenderContext): void {
  clearLayerChildren(layers.effects);
  for (const entity of context.entities) {
    if (entity.renderable.hidden) {
      continue;
    }
    for (const sprite of createEffectSprites(entity, context)) {
      layers.effects.addChild(sprite);
    }
  }
  const overlay = new Graphics({ label: 'combat-indicators' });
  drawCombatIndicators(overlay, context);
  layers.effects.addChild(overlay);
}

function clearLayerChildren(layer: Container): void {
  for (const child of layer.removeChildren()) {
    child.destroy({ children: true });
  }
}

const buildingSpritePresentation: Partial<Record<GameEntity['kind'], {
  anchorY: number;
  yOffsetMultiplier: number;
  widthScale: number;
  heightScale: number;
  tintBlend: number;
}>> = {
  factory: {
    anchorY: 0.83,
    yOffsetMultiplier: 0.38,
    widthScale: 1.44,
    heightScale: 1.74,
    tintBlend: 0.04,
  },
  dock: {
    anchorY: 0.82,
    yOffsetMultiplier: 0.32,
    widthScale: 1.22,
    heightScale: 1.56,
    tintBlend: 0.03,
  },
  house: {
    anchorY: 0.84,
    yOffsetMultiplier: 0.4,
    widthScale: 1.3,
    heightScale: 1.68,
    tintBlend: 0.04,
  },
  guardTower: {
    anchorY: 0.86,
    yOffsetMultiplier: 0.45,
    widthScale: 1.7,
    heightScale: 2.55,
    tintBlend: 0.05,
  },
  techLab: {
    anchorY: 0.86,
    yOffsetMultiplier: 0.45,
    widthScale: 1.55,
    heightScale: 1.85,
    tintBlend: 0.05,
  },
  barracks: {
    anchorY: 0.86,
    yOffsetMultiplier: 0.45,
    widthScale: 1.55,
    heightScale: 1.85,
    tintBlend: 0.05,
  },
};

function createUnitSprite(entity: GameEntity): Sprite | undefined {
  const direction = entity.animation.direction ?? 'south';
  const texture = getUnitSpriteTexture(entity.kind, entity.animation.state, direction, entity.animation.frame, entity.economy?.combatRole);
  if (!texture) return undefined;
  const sprite = new Sprite({ texture, label: `entity-${entity.id}` });
  sprite.anchor.set(0.5, 0.82);
  sprite.x = entity.x;
  sprite.y = entity.y + getCollisionRadius(entity) * 0.82;
  if (entity.collider.kind === 'rect') {
    sprite.width = entity.collider.width * (entity.kind === 'boat' ? 1.42 : 1.34);
    sprite.height = entity.collider.height * (entity.kind === 'boat' ? 1.72 : 1.58);
  } else {
    sprite.width = 64;
    sprite.height = 64;
  }
  const presentation = resolveSpriteFacingPresentation(entity.kind, direction);
  if (presentation.flipX) {
    sprite.scale.x = -Math.abs(sprite.scale.x);
  }
  sprite.tint = blendColors(entity.renderable.tint, factionPrimaryColor(entity), 0.04);
  return sprite;
}

function createBuildingSprite(entity: GameEntity): Sprite | undefined {
  if (entity.collider.kind !== 'rect') return undefined;
  const texture = getBuildingSpriteTexture(entity.kind, entity.economy?.damageState);
  if (!texture) return undefined;
  const sprite = new Sprite({ texture, label: `entity-${entity.id}` });
  const construction = entity.economy?.construction;
  const presentation = buildingSpritePresentation[entity.kind] ?? buildingSpritePresentation.techLab!;
  sprite.anchor.set(0.5, presentation.anchorY);
  sprite.x = entity.x;
  sprite.y = entity.y + entity.collider.height * presentation.yOffsetMultiplier;
  sprite.width = entity.collider.width * presentation.widthScale;
  sprite.height = entity.collider.height * presentation.heightScale;
  sprite.rotation = entity.rotation;
  sprite.tint = blendColors(entity.renderable.tint, factionPrimaryColor(entity), presentation.tintBlend);
  if (construction && !construction.complete) {
    const progress = clamp(construction.progressSeconds / construction.totalSeconds, 0, 1);
    sprite.alpha = 0.46 + progress * 0.36;
    sprite.tint = blendColors(sprite.tint, 0x8b7654, 0.22);
  }
  return sprite;
}

function drawUnitSpriteOverlay(graphic: Graphics, entity: GameEntity, context: EntityRenderContext): void {
  const direction = entity.animation.direction ?? 'south';
  const factionColor = factionPrimaryColor(entity);
  const factionHighlight = factionHighlightColor(entity);
  drawUnitActionEffect(graphic, entity, resolveActionFacingVector(entity, context, direction));
  if (entity.collider.kind === 'circle') {
    graphic.ellipse(entity.x, entity.y + entity.collider.radius * 0.76, entity.collider.radius * 1.1, entity.collider.radius * 0.36).fill({
      color: factionColor,
      alpha: 0.28,
    });
    graphic.circle(entity.x, entity.y + entity.collider.radius * 0.18, entity.collider.radius * 0.94).stroke({ color: factionHighlight, width: 2.5, alpha: 0.38 });
    drawDamageOverlay(graphic, entity, entity.x - entity.collider.radius, entity.y - entity.collider.radius, entity.collider.radius * 2, entity.collider.radius * 2, context);
    return;
  }
  const left = entity.x - entity.collider.width / 2;
  const top = entity.y - entity.collider.height / 2;
  const cargo = entity.economy?.cargo;
  if (cargo && cargo.amount > 0) {
    const ratio = clamp(cargo.amount / cargo.capacity, 0, 1);
    graphic.rect(left + 8, top - 12, entity.collider.width - 16, 5).fill({ color: 0x160f0d, alpha: 0.72 });
    graphic.rect(left + 8, top - 12, (entity.collider.width - 16) * ratio, 5).fill(entity.kind === 'boat' ? 0xbdeaf2 : 0xd7dde0);
  }
  graphic.ellipse(entity.x - entity.collider.width * 0.12, entity.y + entity.collider.height * 0.28, entity.collider.width * 0.44, 8).fill({
    color: factionColor,
    alpha: 0.24,
  });
  drawDamageOverlay(graphic, entity, left, top, entity.collider.width, entity.collider.height, context);
}

function drawBuildingSpriteOverlay(graphic: Graphics, entity: GameEntity, context: EntityRenderContext): void {
  if (entity.collider.kind !== 'rect') return;
  const left = entity.x - entity.collider.width / 2;
  const top = entity.y - entity.collider.height / 2;
  const factionColor = factionPrimaryColor(entity);
  const factionHighlight = factionHighlightColor(entity);
  graphic.roundRect(left + 12, top + 10, Math.max(44, entity.collider.width * 0.32), 12, 6).fill({ color: factionColor, alpha: 0.9 });
  graphic.roundRect(left + 12, top + 10, Math.max(44, entity.collider.width * 0.32), 12, 6).stroke({ color: factionHighlight, width: 2.5, alpha: 0.96 });
  graphic.circle(left + entity.collider.width - 18, top + 18, 7).fill({ color: factionHighlight, alpha: 0.98 });
  if ((entity.economy?.disabledSeconds ?? 0) > 0) {
    const phase = getRenderPolishState(entity, context.getDamageState).disabledPhase;
    graphic.roundRect(left - 8, top - 8, entity.collider.width + 16, entity.collider.height + 16, 20).stroke({ color: 0xffd166, width: 4 + (phase % 2), alpha: 0.68 + phase * 0.035 });
  }
  if (entity.kind === 'guardTower' && entity.economy?.attack) {
    const target = context.entities.find((candidate) => candidate.id === entity.economy?.attack?.targetId);
    if (target) {
      graphic.moveTo(entity.x, top - 48).lineTo(target.x, target.y);
      graphic.stroke({ color: 0xffd166, width: 4, alpha: 0.58 });
    }
  }
  drawBuildingAnimation(graphic, entity, left, top, entity.collider.width, entity.collider.height, getRenderPolishState(entity, context.getDamageState));
  drawDamageOverlay(graphic, entity, left, top, entity.collider.width, entity.collider.height, context);
}

function drawBuildingEntity(graphic: Graphics, entity: GameEntity, context: EntityRenderContext): void {
  if (entity.collider.kind !== 'rect') {
    return;
  }
  const left = entity.x - entity.collider.width / 2;
  const top = entity.y - entity.collider.height / 2;
  const factionColor = factionPrimaryColor(entity);
  const strokeColor = factionHighlightColor(entity);
  const construction = entity.economy?.construction;
  const damageState = context.getDamageState(entity);
  const polish = getRenderPolishState(entity, context.getDamageState);
  const fillTint =
    damageState === 'destroyed'
      ? 0x24201d
      : damageState === 'critical'
        ? 0x5f332e
        : construction && !construction.complete
          ? 0x6f634f
          : entity.renderable.tint;
  graphic.roundRect(left, top, entity.collider.width, entity.collider.height, 18).fill(fillTint);
  graphic.roundRect(left, top, entity.collider.width, entity.collider.height, 18).stroke({
    color: damageState === 'destroyed' ? 0x2d2723 : strokeColor,
    width: 5,
    alpha: damageState === 'destroyed' ? 0.72 : 0.92,
  });

  if (entity.kind === 'dock') {
    graphic.rect(left + 30, top + entity.collider.height - 20, entity.collider.width - 60, 36).fill(0x533c2b);
    graphic.rect(left + 16, top + 12, entity.collider.width - 32, 18).fill(0xb58a55);
    graphic.rect(left + 38, top + 38, entity.collider.width - 76, 14).fill(0x493827);
  }

  if (entity.kind === 'factory') {
    graphic.rect(left + 24, top + 26, entity.collider.width - 48, 24).fill(0xf6d48a);
    graphic.roundRect(left + entity.collider.width - 78, top - 36, 48, 50, 8).fill(0x574730);
  }

  if (entity.kind === 'house') {
    graphic.roundRect(left + 18, top + 22, entity.collider.width - 36, entity.collider.height - 34, 12).fill(
      construction && !construction.complete ? 0x806f54 : 0xb9965f,
    );
    graphic
      .moveTo(left + 12, top + 34)
      .lineTo(entity.x, top - 18)
      .lineTo(left + entity.collider.width - 12, top + 34)
      .lineTo(left + 12, top + 34)
      .fill(construction && !construction.complete ? 0x8b5f42 : 0x7c4730);
    graphic.rect(entity.x - 16, top + entity.collider.height - 34, 32, 34).fill(0x33251b);
  }

  if (entity.kind === 'guardTower') {
    const towerTint = construction && !construction.complete ? 0x65705c : 0x829171;
    graphic.roundRect(entity.x - 28, top + 18, 56, entity.collider.height - 18, 10).fill(towerTint);
    graphic.roundRect(entity.x - 42, top - 18, 84, 42, 12).fill(construction && !construction.complete ? 0x756a55 : 0x4d5c4a);
    graphic.rect(entity.x - 7, top - 42, 14, 28).fill(0x2d372f);
    graphic.circle(entity.x, top - 48, 9).fill(0xf6d48a);
    graphic.roundRect(left + 12, top + entity.collider.height - 18, entity.collider.width - 24, 12, 4).fill(0x3b463c);
    const target = entity.economy?.attack ? context.entities.find((candidate) => candidate.id === entity.economy?.attack?.targetId) : undefined;
    if (target) {
      graphic.moveTo(entity.x, top - 48).lineTo(target.x, target.y);
      graphic.stroke({ color: 0xffd166, width: 4, alpha: 0.58 });
    }
  }

  if (entity.kind === 'techLab') {
    graphic.roundRect(left + 20, top + 18, entity.collider.width - 40, entity.collider.height - 26, 14).fill(construction && !construction.complete ? 0x5b6d70 : 0x7bb7bd);
    graphic.roundRect(left + 34, top + 30, entity.collider.width - 68, 18, 8).fill(0xe7f7ff);
    graphic.circle(entity.x, top + 18, 16).fill(0xffd166);
    graphic.moveTo(entity.x - 26, top + 18).lineTo(entity.x + 26, top + 18).stroke({ color: 0x24404a, width: 5, alpha: 0.8 });
    graphic.moveTo(entity.x, top - 8).lineTo(entity.x, top + 44).stroke({ color: 0x24404a, width: 5, alpha: 0.8 });
  }

  if (entity.kind === 'barracks') {
    const bodyTint = construction && !construction.complete ? 0x7b664f : 0xa5875c;
    graphic.roundRect(left + 16, top + 24, entity.collider.width - 32, entity.collider.height - 30, 16).fill(bodyTint);
    graphic.roundRect(left + 28, top + 34, entity.collider.width - 56, 16, 8).fill(0xe8d8ab);
    graphic.roundRect(left + 28, top + 58, entity.collider.width - 56, 14, 7).fill(0x5a4632);
    graphic.rect(entity.x - 14, top - 12, 28, 28).fill(0x3e3024);
    graphic.moveTo(entity.x, top - 20).lineTo(entity.x, top + 22).stroke({ color: 0xe7f7ff, width: 4, alpha: 0.8 });
    graphic.moveTo(entity.x - 18, top - 2).lineTo(entity.x + 18, top - 2).stroke({ color: 0xe7f7ff, width: 4, alpha: 0.8 });
  }

  if (construction && !construction.complete) {
    const ratio = clamp(construction.progressSeconds / construction.totalSeconds, 0, 1);
    graphic.rect(left, top + entity.collider.height + 10, entity.collider.width, 10).fill({ color: 0x1b211c, alpha: 0.82 });
    graphic.rect(left, top + entity.collider.height + 10, entity.collider.width * ratio, 10).fill(0x87e0a5);
  }

  if ((entity.economy?.disabledSeconds ?? 0) > 0) {
    graphic.roundRect(left - 8, top - 8, entity.collider.width + 16, entity.collider.height + 16, 20).stroke({ color: 0xffd166, width: 4, alpha: 0.88 });
    graphic.moveTo(left + 18, top + 16).lineTo(left + 44, top - 12).lineTo(left + 36, top + 12).lineTo(left + 64, top - 18);
    graphic.stroke({ color: 0xfff1a8, width: 5, alpha: 0.9 });
    graphic.circle(left + entity.collider.width - 28, top + 18, 10).fill({ color: 0xff6d4a, alpha: 0.86 });
  }

  drawBuildingAnimation(graphic, entity, left, top, entity.collider.width, entity.collider.height, polish);
  drawDamageOverlay(graphic, entity, left, top, entity.collider.width, entity.collider.height, context);
}

function drawUnitEntity(graphic: Graphics, entity: GameEntity, context: EntityRenderContext): void {
  if (entity.collider.kind === 'circle') {
    const damageState = context.getDamageState(entity);
    const direction = entity.animation.direction ?? 'south';
    const frame = entity.animation.frame;
    const facing = resolveActionFacingVector(entity, context, direction);
    const side = { x: -facing.y, y: facing.x };
    const animationKind = isHumanoidAnimationUnit(entity.kind) ? entity.kind : 'worker';
    const definition = getUnitAnimationDefinition(animationKind);
    const pose = resolveUnitAnimationPose(animationKind, entity.animation.state, cardinalizeHumanoidDirection(direction), frame);
    const factionTint = factionPrimaryColor(entity);
    const bodyColor = damageState === 'destroyed' ? 0x24201d : blendColors(colorToHex(definition?.palette.body ?? '#5f8f66'), entity.renderable.tint, 0.34);
    const vestColor = damageState === 'destroyed' ? 0x3b332c : blendColors(colorToHex(definition?.palette.vest ?? '#f2cf78'), factionTint, 0.28);
    const skinColor = damageState === 'destroyed' ? 0x3b332c : colorToHex(definition?.palette.skin ?? '#f6d48a');
    const toolColor = damageState === 'destroyed' ? 0x3b332c : colorToHex(definition?.palette.tool ?? '#bfc8c8');
    const footSpread = entity.collider.radius * 0.42;
    const bodyX = entity.x;
    const bodyY = entity.y + pose.bodyYOffset;
    const headX = bodyX + facing.x * entity.collider.radius * 0.24 + side.x * pose.headXOffset;
    const headY = bodyY - entity.collider.radius * 0.18 + facing.y * entity.collider.radius * 0.12 + pose.headYOffset;

    graphic.ellipse(entity.x, entity.y + entity.collider.radius * 0.72, entity.collider.radius * 0.92, entity.collider.radius * 0.34).fill({
      color: 0x050909,
      alpha: 0.28,
    });
    graphic
      .moveTo(bodyX + side.x * footSpread + facing.x * pose.leftFoot, entity.y + entity.collider.radius * 0.75 + side.y * footSpread + facing.y * pose.leftFoot)
      .lineTo(bodyX + side.x * footSpread * 0.38, bodyY + entity.collider.radius * 0.16 + side.y * footSpread * 0.38)
      .moveTo(bodyX - side.x * footSpread + facing.x * pose.rightFoot, entity.y + entity.collider.radius * 0.75 - side.y * footSpread + facing.y * pose.rightFoot)
      .lineTo(bodyX - side.x * footSpread * 0.38, bodyY + entity.collider.radius * 0.16 - side.y * footSpread * 0.38)
      .stroke({ color: damageState === 'destroyed' ? 0x3b332c : 0x1c241f, width: 5, alpha: 0.85 });
    graphic.ellipse(entity.x, entity.y + entity.collider.radius * 0.76, entity.collider.radius * 1.08, entity.collider.radius * 0.34).fill({
      color: factionTint,
      alpha: 0.18,
    });
    graphic.circle(bodyX, bodyY, entity.collider.radius).fill(bodyColor);
    graphic.circle(bodyX, bodyY, entity.collider.radius + 2).stroke({ color: factionHighlightColor(entity), width: 2, alpha: 0.7 });
    graphic.roundRect(bodyX - entity.collider.radius * 0.54, bodyY - entity.collider.radius * 0.26, entity.collider.radius * 1.08, entity.collider.radius * 0.44, 7).fill(vestColor);
    graphic.circle(headX, headY, entity.collider.radius * 0.35).fill(skinColor);
    graphic
      .moveTo(bodyX + side.x * entity.collider.radius * 0.28, bodyY - entity.collider.radius * 0.04 + side.y * entity.collider.radius * 0.28)
      .lineTo(bodyX + facing.x * (entity.collider.radius * 0.55 + pose.leftArmReach) + side.x * entity.collider.radius * 0.35, bodyY + facing.y * (entity.collider.radius * 0.55 + pose.leftArmReach) + side.y * entity.collider.radius * 0.35)
      .moveTo(bodyX - side.x * entity.collider.radius * 0.28, bodyY - entity.collider.radius * 0.04 - side.y * entity.collider.radius * 0.28)
      .lineTo(bodyX + facing.x * (entity.collider.radius * 0.55 + pose.rightArmReach) - side.x * entity.collider.radius * 0.35, bodyY + facing.y * (entity.collider.radius * 0.55 + pose.rightArmReach) - side.y * entity.collider.radius * 0.35)
      .stroke({ color: skinColor, width: 4, alpha: 0.9 });
    if (pose.toolReach > 0) {
      graphic.moveTo(bodyX + facing.x * entity.collider.radius * 0.45, bodyY + facing.y * entity.collider.radius * 0.45).lineTo(bodyX + facing.x * (entity.collider.radius + pose.toolReach), bodyY + facing.y * (entity.collider.radius + pose.toolReach));
      graphic.stroke({ color: toolColor, width: 5, alpha: 0.9 });
    }
    drawUnitActionEffect(graphic, entity, facing);
    drawDamageOverlay(graphic, entity, entity.x - entity.collider.radius, entity.y - entity.collider.radius, entity.collider.radius * 2, entity.collider.radius * 2, context);
    return;
  }

  const left = entity.x - entity.collider.width / 2;
  const top = entity.y - entity.collider.height / 2;
  const frame = entity.animation.frame;
  const polish = getRenderPolishState(entity, context.getDamageState);
  if (entity.kind === 'boat') {
    const wakeAlpha = polish.hasWake ? 0.34 + polish.wakePhase * 0.06 : 0.18;
    graphic.ellipse(entity.x, entity.y + entity.collider.height * 0.22, entity.collider.width * 0.62, entity.collider.height * 0.4).fill({
      color: 0x07161b,
      alpha: 0.26,
    });
    graphic.ellipse(entity.x - entity.collider.width * 0.48, entity.y + entity.collider.height * 0.34, entity.collider.width * 0.36, 7 + polish.wakePhase * 2).fill({
      color: 0xbdeaf2,
      alpha: wakeAlpha,
    });
    if (polish.hasWake) {
      graphic.ellipse(entity.x - entity.collider.width * 0.68, entity.y + entity.collider.height * 0.18, entity.collider.width * 0.22, 4 + polish.wakePhase).fill({
        color: 0xeef7f3,
        alpha: 0.22 + polish.wakePhase * 0.035,
      });
    }
    graphic.roundRect(left, top + 10, entity.collider.width, entity.collider.height - 16, 18).fill(context.getDamageState(entity) === 'destroyed' ? 0x24201d : entity.renderable.tint);
    graphic.roundRect(left + 16, top - 6, entity.collider.width - 32, 20, 8).fill(0xf6d48a);
    graphic.moveTo(entity.x - 8, top - 12).lineTo(entity.x + 26, top - 38).lineTo(entity.x + 20, top - 6).fill(0xeef7f3);
    graphic.roundRect(left, top + 10, entity.collider.width, entity.collider.height - 16, 18).stroke({ color: factionHighlightColor(entity), width: 3, alpha: 0.82 });
    drawUnitActionEffect(graphic, entity, resolveActionFacingVector(entity, context, entity.animation.direction ?? 'east'));
    drawDamageOverlay(graphic, entity, left, top, entity.collider.width, entity.collider.height, context);
    return;
  }
  graphic.roundRect(left, top, entity.collider.width, entity.collider.height, 10).fill(context.getDamageState(entity) === 'destroyed' ? 0x24201d : entity.renderable.tint);
  graphic.roundRect(left + 8, top - 8, entity.collider.width * 0.45, 16, 7).fill(0x8f6a2e);
  const wheelFlash = polish.hasWheelMotion ? polish.wheelPhase % 2 === 0 : false;
  graphic.circle(left + 14, top + entity.collider.height + 2, 8 + (polish.hasWheelMotion ? polish.wheelPhase % 3 : 0)).fill(wheelFlash ? 0x3d473f : 0x1d241f);
  graphic.circle(left + entity.collider.width - 14, top + entity.collider.height + 2, 8 + (polish.hasWheelMotion ? (polish.wheelPhase + 1) % 3 : 0)).fill(wheelFlash ? 0x1d241f : 0x3d473f);
  if (polish.hasWheelMotion) {
    graphic.rect(left + 9, top + entity.collider.height - 2, 12, 3).fill({ color: 0xd7dde0, alpha: 0.42 });
    graphic.rect(left + entity.collider.width - 20, top + entity.collider.height - 2, 12, 3).fill({ color: 0xd7dde0, alpha: 0.42 });
  }
  const cargo = entity.economy?.cargo;
  if (cargo && cargo.amount > 0) {
    const cargoRatio = clamp(cargo.amount / cargo.capacity, 0, 1);
    graphic.rect(left + 20, top + 8, entity.collider.width - 40, 12).fill(0xb6c0c7);
    graphic.rect(left + 20, top + 8, (entity.collider.width - 40) * cargoRatio, 12).fill(0xe3edf0);
  }
  drawUnitActionEffect(graphic, entity, resolveActionFacingVector(entity, context, entity.animation.direction ?? 'east'));
  drawDamageOverlay(graphic, entity, left, top, entity.collider.width, entity.collider.height, context);
}

function drawBuildingAnimation(
  graphic: Graphics,
  entity: GameEntity,
  left: number,
  top: number,
  width: number,
  height: number,
  polish: ReturnType<typeof getRenderPolishState>,
): void {
  const frame = entity.animation.frame;
  if (polish.hasProductionActivity) {
    graphic.rect(left + 18, top + 16 + (polish.activityPhase % 2) * 6, width - 36, 6).fill({ color: 0xfff1a8, alpha: 0.46 });
    graphic.circle(left + width - 38, top + 28, 7 + (polish.activityPhase % 2) * 3).fill({ color: 0xffd166, alpha: 0.48 });
    graphic.rect(left + 28, top + height - 28, (width - 56) * (1 - polish.activityPhase / 6), 5).fill({ color: 0x87e0a5, alpha: 0.38 });
  }
  if (polish.hasReelWorkshopActivity) {
    const progress = polish.reelWorkshopProgress ?? 0;
    const pulse = 0.48 + (polish.activityPhase % 3) * 0.08;
    graphic.roundRect(left + width * 0.12, top + height * 0.62, width * 0.76, 12, 6).fill({ color: 0x160f0d, alpha: 0.66 });
    graphic.roundRect(left + width * 0.12, top + height * 0.62, Math.max(14, width * 0.76 * progress), 12, 6).fill({ color: 0x87e0ff, alpha: 0.72 });
    graphic.circle(left + width * 0.72, top + height * 0.36, 7 + (polish.activityPhase % 3) * 2).fill({ color: 0x8fd8ff, alpha: pulse });
    graphic.circle(left + width * 0.78, top + height * 0.32, 4 + (polish.activityPhase % 2) * 2).fill({ color: 0xfff1a8, alpha: 0.46 });
  }
  if (entity.animation.state === 'attack') {
    graphic.circle(left + width * 0.5, top - 22, 11 + (frame % 4) * 2).stroke({ color: 0xffd166, width: 4, alpha: 0.74 });
    graphic.circle(left + width * 0.5, top - 22, 22 + (frame % 4) * 5).stroke({ color: 0xff6d4a, width: 2, alpha: 0.22 });
  }
  if (polish.hasConstructionActivity) {
    const progress = polish.constructionProgress ?? 0;
    graphic.rect(left + 12, top + height - 24, Math.max(12, (width - 24) * progress), 8).fill(0x87e0a5);
    graphic.circle(left + width - 24, top + 18 + (frame % 3) * 5, 5).fill({ color: 0xffe08a, alpha: 0.88 });
    graphic.moveTo(left + 18 + (frame % 5) * 9, top + height - 34).lineTo(left + 34 + (frame % 5) * 9, top + height - 48);
    graphic.stroke({ color: 0xf6d48a, width: 4, alpha: 0.78 });
    graphic.roundRect(left + width * 0.16, top + height * 0.45, width * 0.68 * progress, 9, 4).fill({ color: 0xfff1a8, alpha: 0.42 });
  }
  if (polish.hasDamageSmoke) {
    graphic.rect(left + 18 + (frame % 3) * 9, top + 12, 10, height - 24).fill({ color: 0x1b1614, alpha: 0.32 });
    graphic.circle(left + width * 0.66, top - 18 - (frame % 2) * 8, 8 + frame * 2).fill({ color: 0x42413c, alpha: 0.26 });
  }
}

function drawUnitActionEffect(graphic: Graphics, entity: GameEntity, facing: { x: number; y: number }): void {
  const frame = entity.animation.frame;
  const originX = entity.x + facing.x * getCollisionRadius(entity) * 0.72;
  const originY = entity.y + facing.y * getCollisionRadius(entity) * 0.72;
  const muzzleColor = entity.faction === 'enemy' ? 0xff8c6a : 0xffd166;
  const flashColor = entity.faction === 'enemy' ? 0xffd0b5 : 0xfff1a8;
  const tracerColor = entity.faction === 'enemy' ? 0xd85a4d : 0x8fd8ff;

  if (entity.animation.state === 'attack') {
    const range = entity.kind === 'boat' ? 12 + frame * 1.6 : 16 + frame * 1.5;
    graphic.circle(originX, originY, 4 + (frame % 2) * 1.5).fill({ color: flashColor, alpha: 0.88 });
    graphic.circle(originX, originY, 7 + (frame % 3) * 1.8).stroke({ color: muzzleColor, width: 2.5, alpha: 0.68 });
    graphic.moveTo(originX, originY).lineTo(originX + facing.x * range, originY + facing.y * range);
    graphic.stroke({ color: tracerColor, width: entity.kind === 'boat' ? 3 : 2.5, alpha: 0.56 });
    graphic.circle(originX + facing.x * (range + 4), originY + facing.y * (range + 4), 2 + (frame % 2)).fill({ color: flashColor, alpha: 0.56 });
  }
  if (entity.animation.state === 'sabotage') {
    graphic.circle(originX, originY, 6 + (frame % 4) * 2).stroke({ color: 0xb481ff, width: 3, alpha: 0.78 });
    graphic.circle(originX + facing.x * 10, originY + facing.y * 10, 3 + (frame % 2)).fill({ color: 0xfff1a8, alpha: 0.72 });
    graphic.moveTo(originX - 10, originY + 8).lineTo(originX + 10, originY - 8).stroke({ color: 0x87e0ff, width: 2, alpha: 0.5 });
  }
  if (entity.animation.state === 'repair' || entity.animation.state === 'build') {
    graphic.circle(originX + (frame % 2) * 4, originY - (frame % 3) * 3, 4).fill({ color: 0xfff1a8, alpha: 0.86 });
    graphic.moveTo(originX - 8, originY + 8).lineTo(originX + 8, originY - 8).stroke({ color: 0x87e0a5, width: 3, alpha: 0.62 });
    graphic.rect(originX - 12, originY + 12, 24 * ((frame % 5) / 4), 4).fill({ color: 0x87e0a5, alpha: 0.72 });
  }
  if (entity.animation.state === 'harvest') {
    graphic.circle(originX + (frame % 2) * 4, originY - (frame % 3) * 3, 4).fill({ color: 0xfff1a8, alpha: 0.86 });
    graphic.circle(originX + facing.x * 16, originY + facing.y * 12, 5 + (frame % 3)).fill({ color: 0xd7dde0, alpha: 0.58 });
    graphic.circle(originX + facing.x * 24, originY + facing.y * 16, 3).fill({ color: 0xffd166, alpha: 0.78 });
  }
  if (entity.kind === 'truck' && entity.animation.state === 'harvest') {
    graphic.rect(entity.x - 18, entity.y - 18 - (frame % 3) * 2, 36, 7).fill({ color: 0xd7dde0, alpha: 0.72 });
    graphic.circle(entity.x + 24 + (frame % 2) * 4, entity.y - 12, 4).fill({ color: 0xffe08a, alpha: 0.78 });
  }
  if (entity.kind === 'truck' && entity.animation.state === 'move') {
    graphic.rect(entity.x - 28 - (frame % 3) * 4, entity.y + 18, 18, 4).fill({ color: 0x1b1614, alpha: 0.32 });
    graphic.rect(entity.x + 8 - (frame % 3) * 4, entity.y + 18, 18, 4).fill({ color: 0x1b1614, alpha: 0.26 });
  }
  if (entity.animation.state === 'fish') {
    graphic.moveTo(originX, originY).lineTo(originX + 16, originY + 28 + (frame % 3) * 4);
    graphic.stroke({ color: 0xeef7f3, width: 3, alpha: 0.82 });
    if (entity.kind === 'boat') {
      graphic.circle(originX + 22, originY + 24 + (frame % 2) * 5, 4).fill({ color: 0xbdeaf2, alpha: 0.72 });
      graphic.circle(originX + 34, originY + 34 - (frame % 3) * 3, 3).fill({ color: 0xbdeaf2, alpha: 0.58 });
      graphic.ellipse(entity.x - 34, entity.y + 24 + (frame % 2) * 3, 28, 5).fill({ color: 0xeef7f3, alpha: 0.22 });
    }
  }
  if (entity.kind === 'boat' && entity.animation.state === 'move') {
    graphic.ellipse(entity.x - 30 - (frame % 3) * 5, entity.y + 24, 28, 5).fill({ color: 0xbdeaf2, alpha: 0.28 });
    graphic.ellipse(entity.x - 52 - (frame % 4) * 3, entity.y + 16, 18, 3).fill({ color: 0xeef7f3, alpha: 0.18 });
  }
}

function drawDamageOverlay(
  graphic: Graphics,
  entity: GameEntity,
  left: number,
  top: number,
  width: number,
  height: number,
  context: EntityRenderContext,
): void {
  const damageState = context.getDamageState(entity);
  if (!damageState || damageState === 'healthy') {
    return;
  }

  const health = Math.max(0, entity.economy?.health ?? 0);
  const ratio = clamp(health / context.getMaxHealth(entity), 0, 1);
  graphic.rect(left, top - 12, width, 7).fill({ color: 0x160f0d, alpha: 0.82 });
  graphic.rect(left, top - 12, width * ratio, 7).fill(damageState === 'critical' || damageState === 'destroyed' ? 0xff6d4a : 0xffd166);

  if (damageState === 'damaged' || damageState === 'critical') {
    graphic.circle(left + width * 0.72, top - 22, damageState === 'critical' ? 11 : 7).fill({ color: 0x2a2926, alpha: 0.58 });
    graphic.circle(left + width * 0.8, top - 34, damageState === 'critical' ? 7 : 4).fill({ color: 0x4a4a43, alpha: 0.42 });
    if (damageState === 'critical') {
      graphic.roundRect(left - 6, top - 6, width + 12, height + 12, 12).stroke({ color: 0xff6d4a, width: 3, alpha: 0.42 });
    }
  }

  if (damageState === 'destroyed') {
    graphic.moveTo(left + 12, top + 12).lineTo(left + width - 12, top + height - 12);
    graphic.moveTo(left + width - 12, top + 12).lineTo(left + 12, top + height - 12);
    graphic.stroke({ color: 0x0c0908, width: 6, alpha: 0.65 });
    graphic.rect(left, top, width, height).fill({ color: 0x000000, alpha: 0.38 });
    graphic.circle(left + width * 0.68, top - 22, 14).fill({ color: 0x2a2926, alpha: 0.5 });
    if (entity.kind === 'boat') {
      graphic.ellipse(left + width / 2, top + height + 4, width * 0.72, 10).fill({ color: 0x88d5e8, alpha: 0.36 });
    }
  }
}

function createEffectSprites(entity: GameEntity, context: EntityRenderContext): Sprite[] {
  const polish = getRenderPolishState(entity, context.getDamageState);
  const damageState = context.getDamageState(entity);
  const destruction = entity.economy?.destruction;
  const sprites: Sprite[] = [];

  if (damageState === 'destroyed' && destruction) {
    return createDestructionEffectSprites(entity, destruction);
  }

  if (polish.hasConstructionActivity) {
    const texture = getEffectSpriteTexture('constructionDust');
    if (texture && entity.collider.kind === 'rect') {
      sprites.push(
        makeEffectSprite(texture, entity.x, entity.y + entity.collider.height * 0.48, entity.collider.width * 0.92, entity.collider.height * 0.74, 0xffe0a4, 0.46),
      );
    }
  }

  if (entity.animation.state === 'repair' || entity.economy?.dockRepair) {
    const texture = getEffectSpriteTexture('repairSparks');
    if (texture) {
      const radius = getCollisionRadius(entity);
      sprites.push(makeEffectSprite(texture, entity.x + radius * 0.25, entity.y - radius * 0.1, radius * 1.25, radius * 1.25, 0xffefad, 0.72));
    }
  }

  if (entity.animation.state === 'harvest') {
    const texture = getEffectSpriteTexture('harvestSparks');
    if (texture) {
      const radius = getCollisionRadius(entity);
      sprites.push(makeEffectSprite(texture, entity.x + radius * 0.45, entity.y - radius * 0.22, radius * 1.12, radius * 1.12, 0xece7dd, 0.62));
    }
  }

  if (entity.animation.state === 'fish') {
    const texture = getEffectSpriteTexture('fishSplash');
    if (texture) {
      const radius = getCollisionRadius(entity);
      sprites.push(makeEffectSprite(texture, entity.x + radius * 0.66, entity.y + radius * 0.64, radius * 1.28, radius * 1.28, 0xc3f6ff, 0.68));
    }
  }

  if (entity.animation.state === 'attack') {
    const texture = getEffectSpriteTexture('cannonMuzzleFlash');
    if (texture) {
      const facing = resolveActionFacingVector(entity, context, entity.animation.direction ?? 'east');
      const radius = getCollisionRadius(entity);
      sprites.push(
        makeRotatedEffectSprite(texture, entity.x + facing.x * radius * 1.08, entity.y + facing.y * radius * 0.54, radius * 1.34, radius * 1.34, 0xffe6a3, 0.82, Math.atan2(facing.y, facing.x)),
      );
    }
  }

  if (entity.animation.state === 'sabotage' || (entity.economy?.disabledSeconds ?? 0) > 0) {
    const texture = getEffectSpriteTexture('sabotageBurst');
    if (texture) {
      const radius = getCollisionRadius(entity);
      sprites.push(makeEffectSprite(texture, entity.x, entity.y - radius * 0.22, radius * 1.52, radius * 1.52, 0xbec6ff, 0.62));
    }
  }

  if (polish.hasDamageSmoke || damageState === 'destroyed') {
    const texture = getEffectSpriteTexture('smokePlume');
    if (texture) {
      const width = entity.collider.kind === 'rect' ? entity.collider.width : entity.collider.radius * 2;
      const height = entity.collider.kind === 'rect' ? entity.collider.height : entity.collider.radius * 2;
      sprites.push(makeEffectSprite(texture, entity.x + width * 0.16, entity.y - height * 0.52, width * 0.84, height * 1.12, 0xf0e7d4, damageState === 'destroyed' ? 0.44 : 0.28));
    }
  }

  return sprites;
}

function createDestructionEffectSprites(
  entity: GameEntity,
  destruction: NonNullable<NonNullable<GameEntity['economy']>['destruction']>,
): Sprite[] {
  const sprites: Sprite[] = [];
  const radius = getCollisionRadius(entity);
  const width = entity.collider.kind === 'rect' ? entity.collider.width : radius * 2;
  const height = entity.collider.kind === 'rect' ? entity.collider.height : radius * 2;
  const progress = 1 - clamp(destruction.remainingSeconds / destruction.totalSeconds, 0, 1);
  const burstTexture = getEffectSpriteTexture('cannonMuzzleFlash');
  const smokeTexture = getEffectSpriteTexture('smokePlume');
  const debrisTexture = getEffectSpriteTexture('sabotageBurst');

  if (burstTexture) {
    const burstAlpha = destruction.phase === 'exploding' ? Math.max(0, 0.96 - progress * 1.1) : Math.max(0, 0.64 - progress * 1.8);
    if (burstAlpha > 0.02) {
      sprites.push(
        makeEffectSprite(
          burstTexture,
          entity.x,
          entity.y - height * 0.18,
          width * (destruction.phase === 'exploding' ? 1.2 + progress * 1.4 : 0.85 + progress * 0.4),
          height * (destruction.phase === 'exploding' ? 1.25 + progress * 1.5 : 0.85 + progress * 0.45),
          entity.renderable.layer === 'buildings' ? 0xffc27a : 0xffdba8,
          burstAlpha,
        ),
      );
    }
  }

  if (debrisTexture) {
    const debrisAlpha = destruction.phase === 'exploding' ? Math.max(0, 0.7 - progress * 0.62) : Math.max(0, 0.52 - progress * 0.9);
    if (debrisAlpha > 0.02) {
      sprites.push(
        makeRotatedEffectSprite(
          debrisTexture,
          entity.x + width * 0.1,
          entity.y - height * 0.1,
          width * (destruction.phase === 'exploding' ? 1.18 + progress * 0.55 : 0.92),
          height * (destruction.phase === 'exploding' ? 1.1 + progress * 0.5 : 0.92),
          entity.renderable.layer === 'buildings' ? 0xff8f70 : 0xffd3bf,
          debrisAlpha,
          progress * Math.PI * 1.35,
        ),
      );
    }
  }

  if (smokeTexture) {
    const smokeAlpha = destruction.phase === 'exploding' ? 0.52 - progress * 0.16 : 0.36 - progress * 0.22;
    if (smokeAlpha > 0.02) {
      sprites.push(
        makeRotatedEffectSprite(
          smokeTexture,
          entity.x + width * 0.14,
          entity.y - height * (destruction.phase === 'exploding' ? 0.54 + progress * 0.12 : 0.42),
          width * (destruction.phase === 'exploding' ? 0.96 + progress * 0.58 : 0.72 + progress * 0.28),
          height * (destruction.phase === 'exploding' ? 1.42 + progress * 0.74 : 1.02 + progress * 0.28),
          0xf0e7d4,
          smokeAlpha,
          -progress * Math.PI * 0.35,
        ),
      );
      sprites.push(
        makeRotatedEffectSprite(
          smokeTexture,
          entity.x - width * 0.08,
          entity.y - height * (destruction.phase === 'exploding' ? 0.34 + progress * 0.08 : 0.26),
          width * (destruction.phase === 'exploding' ? 0.72 + progress * 0.44 : 0.58 + progress * 0.22),
          height * (destruction.phase === 'exploding' ? 1.02 + progress * 0.52 : 0.8 + progress * 0.22),
          0xc8c3bb,
          smokeAlpha * 0.78,
          progress * Math.PI * 0.22,
        ),
      );
    }
  }

  return sprites;
}

function makeEffectSprite(texture: Sprite['texture'], x: number, y: number, width: number, height: number, tint: number, alpha: number): Sprite {
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5);
  sprite.position.set(x, y);
  sprite.width = width;
  sprite.height = height;
  sprite.tint = tint;
  sprite.alpha = alpha;
  return sprite;
}

function makeRotatedEffectSprite(
  texture: Sprite['texture'],
  x: number,
  y: number,
  width: number,
  height: number,
  tint: number,
  alpha: number,
  rotation: number,
): Sprite {
  const sprite = makeEffectSprite(texture, x, y, width, height, tint, alpha);
  sprite.rotation = rotation;
  return sprite;
}

function animationFacingVector(direction: AnimationDirection): { x: number; y: number } {
  switch (direction) {
    case 'north':
      return { x: 0, y: -1 };
    case 'northEast':
      return normalizeFacingVector(1, -1);
    case 'south':
      return { x: 0, y: 1 };
    case 'southEast':
      return normalizeFacingVector(1, 1);
    case 'southWest':
      return normalizeFacingVector(-1, 1);
    case 'west':
      return { x: -1, y: 0 };
    case 'northWest':
      return normalizeFacingVector(-1, -1);
    case 'east':
    default:
      return { x: 1, y: 0 };
  }
}

function normalizeFacingVector(x: number, y: number): { x: number; y: number } {
  const length = Math.hypot(x, y);
  return { x: x / length, y: y / length };
}

function cardinalizeHumanoidDirection(direction: AnimationDirection): 'east' | 'south' | 'west' | 'north' {
  switch (direction) {
    case 'northEast':
      return 'east';
    case 'southEast':
      return 'south';
    case 'southWest':
      return 'west';
    case 'northWest':
      return 'north';
    default:
      return direction;
  }
}

function resolveActionFacingVector(
  entity: GameEntity,
  context: EntityRenderContext,
  fallbackDirection: AnimationDirection,
): { x: number; y: number } {
  const targetId = entity.economy?.attack?.targetId ?? entity.economy?.sabotage?.targetId ?? entity.economy?.repair?.targetId;
  if (targetId) {
    const target = context.entities.find((candidate) => candidate.id === targetId);
    if (target) {
      const dx = target.x - entity.x;
      const dy = target.y - entity.y;
      const length = Math.hypot(dx, dy);
      if (length > 0.001) {
        return { x: dx / length, y: dy / length };
      }
    }
  }
  return animationFacingVector(fallbackDirection);
}

function drawCombatIndicators(graphic: Graphics, context: EntityRenderContext): void {
  for (const entity of context.entities) {
    const attack = entity.economy?.attack;
    const targetId = attack?.targetId;
    if (!attack || !targetId || context.getDamageState(entity) === 'destroyed') {
      continue;
    }
    if (attack.phase !== 'attacking') {
      continue;
    }
    const target = context.entities.find((candidate) => candidate.id === targetId);
    if (!target || context.getDamageState(target) === 'destroyed' || target.renderable.hidden) {
      continue;
    }

    const facing = resolveActionFacingVector(entity, context, entity.animation.direction ?? 'east');
    const sourceRadius = getCollisionRadius(entity);
    const targetRadius = getCollisionRadius(target);
    const sourceX = entity.x + facing.x * sourceRadius * 0.88;
    const sourceY = entity.y + facing.y * sourceRadius * 0.56;
    const dx = target.x - sourceX;
    const dy = target.y - sourceY;
    const distance = Math.hypot(dx, dy);
    if (distance <= 0.001) {
      continue;
    }
    const edgeDistance = Math.max(0, distance - targetRadius * 0.78);
    if (edgeDistance > attack.range + 8) {
      continue;
    }

    const directionX = dx / distance;
    const directionY = dy / distance;
    const impactX = target.x - directionX * targetRadius * 0.78;
    const impactY = target.y - directionY * targetRadius * 0.78;
    const pulse = 0.65 + (entity.animation.frame % 3) * 0.12;
    const tracerColor = entity.faction === 'enemy' ? 0xff8c6a : 0x8fd8ff;
    const ringColor = entity.faction === 'enemy' ? 0xffd7ce : 0xffefad;

    graphic.moveTo(sourceX, sourceY).lineTo(impactX, impactY);
    graphic.stroke({ color: tracerColor, width: entity.kind === 'boat' ? 3.5 : 2.5, alpha: 0.34 + pulse * 0.16 });
    graphic.circle(impactX, impactY, 4 + pulse * 2.2).fill({ color: ringColor, alpha: 0.34 + pulse * 0.18 });
    graphic.circle(target.x, target.y - targetRadius * 0.14, targetRadius * (0.7 + pulse * 0.08)).stroke({
      color: ringColor,
      width: 2.5,
      alpha: 0.38 + pulse * 0.16,
    });
  }
}

function colorToHex(color: string): number {
  const normalized = color.startsWith('#') ? color.slice(1) : color;
  return Number.parseInt(normalized, 16);
}

function factionPrimaryColor(entity: GameEntity): number {
  switch (entity.faction) {
    case 'enemy':
      return 0xd86b62;
    case 'neutral':
      return 0xc3c5ae;
    case 'player':
    default:
      return 0x58b8ff;
  }
}

function factionHighlightColor(entity: GameEntity): number {
  switch (entity.faction) {
    case 'enemy':
      return 0xffd7ce;
    case 'neutral':
      return 0xf1ead2;
    case 'player':
    default:
      return 0xe7f7ff;
  }
}

function blendColors(base: number, overlay: number, ratio: number): number {
  const clampedRatio = clamp(ratio, 0, 1);
  const inverseRatio = 1 - clampedRatio;
  const red = Math.round(((base >> 16) & 0xff) * inverseRatio + ((overlay >> 16) & 0xff) * clampedRatio);
  const green = Math.round(((base >> 8) & 0xff) * inverseRatio + ((overlay >> 8) & 0xff) * clampedRatio);
  const blue = Math.round((base & 0xff) * inverseRatio + (overlay & 0xff) * clampedRatio);
  return (red << 16) | (green << 8) | blue;
}
