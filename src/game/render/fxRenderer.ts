import { BitmapText, Container, Graphics, Sprite, TextStyle, type Texture } from 'pixi.js';
import type { GameEntity } from '../entities/components';
import { getCollisionRadius } from '../map/geometry';
import { getEntityDisplaySprite } from './entityRenderer';
import type { RenderLayers } from './layers';

// Game-feel layer: floating income numbers, hit flashes, impact sparks, death shockwaves,
// command pings and a short screen shake. Everything is derived by diffing simulation state each
// frame (the FX never write game state) and everything is pooled:
//  - one Container in the overlay layer (counts as a single render object),
//  - one Graphics for all particles, redrawn only while particles are alive,
//  - a fixed pool of BitmapText labels sharing one dynamic bitmap font (no per-label textures),
//  - a fixed particle array; when full, the oldest particle is recycled.

const MAX_PARTICLES = 64;
const MAX_LABELS = 24;
const LABEL_LIFETIME_SECONDS = 1.5;
const HIT_FLASH_SECONDS = 0.13;
const HIT_SPARK_INTERVAL_SECONDS = 0.2;
const HIT_FLASH_TINT = 0xff8a7a;
const MAX_SHAKE_PIXELS = 7;
const MAX_GHOSTS = 10;

type ParticleKind = 'spark' | 'ring' | 'ping' | 'glow';

interface Particle {
  active: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bornAt: number;
  life: number;
  size: number;
  color: number;
}

interface FloatingLabel {
  text: BitmapText;
  active: boolean;
  bornAt: number;
  x: number;
  y: number;
}

interface TrackedEntity {
  health: number;
  seenFrame: number;
  flashUntil: number;
  restoreTint?: number;
  lastSparkAt: number;
  // Last known look of the entity's sprite, so a death "ghost" can be shown after the renderer
  // has already pruned the real sprite.
  texture?: Texture;
  spriteX: number;
  spriteY: number;
  spriteWidth: number;
  spriteHeight: number;
  anchorX: number;
  anchorY: number;
  spriteTint: number;
}

type GhostKind = 'fall' | 'sink' | 'collapse' | 'wreck';

interface DeathGhost {
  sprite: Sprite;
  active: boolean;
  kind: GhostKind;
  bornAt: number;
  life: number;
  baseX: number;
  baseY: number;
  baseScaleX: number;
  baseScaleY: number;
  direction: number;
}

interface FxState {
  container: Container;
  particleGraphic: Graphics;
  particles: Particle[];
  labels: FloatingLabel[];
  ghostContainer: Container;
  ghosts: DeathGhost[];
  tracked: Map<string, TrackedEntity>;
  frame: number;
  initialized: boolean;
  lastResourceEvent?: object;
  lastMoveCommand?: object;
  lastCash: number;
  particlesDrawn: boolean;
  shakeStartedAt: number;
  shakeDuration: number;
  shakeStrength: number;
  shaking: boolean;
  seed: number;
}

export interface FxResourceEvent {
  entityId: string;
  kind: 'metalLoaded' | 'metalUnloaded' | 'fishLoaded' | 'fishSold';
  amount: number;
}

export interface FxFrameInput {
  layers: RenderLayers;
  /** Stage (parent of the world container) – used for screen shake so camera math stays untouched. */
  stage: Container;
  nowSeconds: number;
  entities: GameEntity[];
  isVisible: (entity: GameEntity) => boolean;
  playerCash: number;
  lastResourceEvent?: FxResourceEvent;
  lastMoveCommand?: { x: number; y: number };
}

const fxStates = new WeakMap<Container, FxState>();

const labelStyle = new TextStyle({
  fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
  fontSize: 20,
  fontWeight: 'bold',
  fill: 0xffffff,
  stroke: { color: 0x061014, width: 4 },
});

export function updateGameFx(input: FxFrameInput): void {
  const state = getFxState(input.layers);
  const now = input.nowSeconds;
  state.frame += 1;

  if (!state.initialized) {
    state.initialized = true;
    state.lastResourceEvent = input.lastResourceEvent;
    state.lastMoveCommand = input.lastMoveCommand;
    state.lastCash = input.playerCash;
  }

  trackHealth(state, input, now);
  detectResourceEvent(state, input, now);
  detectMoveCommand(state, input, now);
  state.lastCash = input.playerCash;

  updateLabels(state, now);
  updateGhosts(state, now);
  drawParticles(state, now);
  updateShake(state, input.stage, now);
}

function getFxState(layers: RenderLayers): FxState {
  const existing = fxStates.get(layers.overlays);
  if (existing) {
    if (existing.container.parent !== layers.overlays) layers.overlays.addChild(existing.container);
    if (existing.ghostContainer.parent !== layers.effects) layers.effects.addChildAt(existing.ghostContainer, 0);
    return existing;
  }
  // Death ghosts live at the bottom of the effect layer: under explosions/smoke, above the ground.
  const ghostContainer = new Container({ label: 'fx-death-ghosts' });
  ghostContainer.eventMode = 'none';
  const ghosts: DeathGhost[] = [];
  for (let index = 0; index < MAX_GHOSTS; index += 1) {
    const sprite = new Sprite();
    sprite.visible = false;
    ghostContainer.addChild(sprite);
    ghosts.push({ sprite, active: false, kind: 'fall', bornAt: 0, life: 1, baseX: 0, baseY: 0, baseScaleX: 1, baseScaleY: 1, direction: 1 });
  }
  layers.effects.addChildAt(ghostContainer, 0);
  const container = new Container({ label: 'fx-overlay' });
  container.eventMode = 'none';
  const particleGraphic = new Graphics({ label: 'fx-particles' });
  container.addChild(particleGraphic);
  const labels: FloatingLabel[] = [];
  for (let index = 0; index < MAX_LABELS; index += 1) {
    const text = new BitmapText({ text: '+0', style: labelStyle, anchor: 0.5 });
    text.visible = false;
    container.addChild(text);
    labels.push({ text, active: false, bornAt: 0, x: 0, y: 0 });
  }
  const particles: Particle[] = [];
  for (let index = 0; index < MAX_PARTICLES; index += 1) {
    particles.push({ active: false, kind: 'spark', x: 0, y: 0, vx: 0, vy: 0, bornAt: 0, life: 0, size: 0, color: 0 });
  }
  layers.overlays.addChild(container);
  const state: FxState = {
    container,
    particleGraphic,
    particles,
    labels,
    ghostContainer,
    ghosts,
    tracked: new Map(),
    frame: 0,
    initialized: false,
    lastCash: 0,
    particlesDrawn: false,
    shakeStartedAt: 0,
    shakeDuration: 0,
    shakeStrength: 0,
    shaking: false,
    seed: 1,
  };
  fxStates.set(layers.overlays, state);
  return state;
}

function random(state: FxState): number {
  // Small deterministic LCG: avoids Math.random noise in screenshots/tests, no allocation.
  state.seed = (state.seed * 1664525 + 1013904223) % 4294967296;
  return state.seed / 4294967296;
}

function trackHealth(state: FxState, input: FxFrameInput, now: number): void {
  for (const entity of input.entities) {
    const health = entity.economy?.health;
    if (health === undefined) continue;
    let tracked = state.tracked.get(entity.id);
    if (!tracked) {
      tracked = {
        health,
        seenFrame: state.frame,
        flashUntil: 0,
        lastSparkAt: -1,
        spriteX: 0,
        spriteY: 0,
        spriteWidth: 0,
        spriteHeight: 0,
        anchorX: 0.5,
        anchorY: 0.8,
        spriteTint: 0xffffff,
      };
      state.tracked.set(entity.id, tracked);
      continue;
    }
    tracked.seenFrame = state.frame;
    if (health > 0) {
      const liveSprite = getEntityDisplaySprite(input.layers, entity.id);
      if (liveSprite && !liveSprite.destroyed) {
        tracked.texture = liveSprite.texture;
        tracked.spriteX = liveSprite.x;
        tracked.spriteY = liveSprite.y;
        tracked.spriteWidth = liveSprite.width * Math.sign(liveSprite.scale.x || 1);
        tracked.spriteHeight = liveSprite.height;
        tracked.anchorX = liveSprite.anchor.x;
        tracked.anchorY = liveSprite.anchor.y;
        tracked.spriteTint = liveSprite.tint === HIT_FLASH_TINT ? tracked.restoreTint ?? 0xffffff : liveSprite.tint;
      }
    }
    const previous = tracked.health;
    tracked.health = health;
    if (health >= previous - 0.001 || !input.isVisible(entity) || entity.renderable.hidden) {
      continue;
    }
    const radius = getCollisionRadius(entity);
    const isBuilding = entity.renderable.layer === 'buildings';
    if (previous > 0 && health <= 0) {
      spawnDeathBurst(state, entity, radius, isBuilding, now);
      spawnDeathGhost(state, entity, tracked, isBuilding, now);
      continue;
    }
    if (tracked.flashUntil <= now) {
      const sprite = getEntityDisplaySprite(input.layers, entity.id);
      if (sprite && sprite.tint !== HIT_FLASH_TINT) tracked.restoreTint = sprite.tint;
    }
    tracked.flashUntil = now + HIT_FLASH_SECONDS;
    if (now - tracked.lastSparkAt >= HIT_SPARK_INTERVAL_SECONDS) {
      tracked.lastSparkAt = now;
      const hitX = entity.x + (random(state) - 0.5) * radius * 0.8;
      const hitY = entity.y - radius * (isBuilding ? 0.2 : 0.35) + (random(state) - 0.5) * radius * 0.5;
      spawnParticle(state, 'glow', hitX, hitY, 0, 0, now, 0.16, isBuilding ? 16 : 10, 0xffe2a8);
      for (let spark = 0; spark < 3; spark += 1) {
        const angle = random(state) * Math.PI * 2;
        const speed = 60 + random(state) * 90;
        spawnParticle(state, 'spark', hitX, hitY, Math.cos(angle) * speed, Math.sin(angle) * speed - 40, now, 0.32, 2.4, spark === 0 ? 0xfff1a8 : 0xffa860);
      }
    }
  }

  for (const [entityId, tracked] of state.tracked) {
    const sprite = tracked.restoreTint !== undefined ? getEntityDisplaySprite(input.layers, entityId) : undefined;
    if (tracked.flashUntil > now) {
      if (sprite) sprite.tint = HIT_FLASH_TINT;
    } else if (tracked.restoreTint !== undefined) {
      if (sprite && sprite.tint === HIT_FLASH_TINT) sprite.tint = tracked.restoreTint;
      tracked.restoreTint = undefined;
    }
    if (tracked.seenFrame !== state.frame) {
      state.tracked.delete(entityId);
    }
  }
}

function spawnDeathBurst(state: FxState, entity: GameEntity, radius: number, isBuilding: boolean, now: number): void {
  const centerY = entity.y - radius * (isBuilding ? 0.1 : 0.2);
  spawnParticle(state, 'glow', entity.x, centerY, 0, 0, now, isBuilding ? 0.45 : 0.28, radius * (isBuilding ? 1.2 : 1.1), 0xffd08a);
  spawnParticle(state, 'ring', entity.x, centerY, 0, 0, now, isBuilding ? 0.7 : 0.45, radius * (isBuilding ? 2.6 : 2), 0xfff1c7);
  if (isBuilding) {
    spawnParticle(state, 'ring', entity.x, centerY, 0, 0, now, 0.95, radius * 3.4, 0xff9a5a);
  }
  const sparkCount = isBuilding ? 12 : 6;
  for (let spark = 0; spark < sparkCount; spark += 1) {
    const angle = (spark / sparkCount) * Math.PI * 2 + random(state) * 0.5;
    const speed = (isBuilding ? 140 : 90) + random(state) * 110;
    spawnParticle(state, 'spark', entity.x, centerY, Math.cos(angle) * speed, Math.sin(angle) * speed * 0.7 - 60, now, 0.55 + random(state) * 0.3, isBuilding ? 3.4 : 2.6, spark % 3 === 0 ? 0xfff1a8 : spark % 3 === 1 ? 0xff9a5a : 0x9a9488);
  }
  const strength = isBuilding ? MAX_SHAKE_PIXELS : entity.kind === 'boat' || entity.kind === 'truck' ? 3 : 0;
  if (strength > 0 && (!state.shaking || strength >= currentShakeStrength(state, now))) {
    state.shakeStartedAt = now;
    state.shakeDuration = isBuilding ? 0.42 : 0.24;
    state.shakeStrength = strength;
    state.shaking = true;
  }
}

function spawnDeathGhost(state: FxState, entity: GameEntity, tracked: TrackedEntity, isBuilding: boolean, now: number): void {
  if (!tracked.texture || tracked.texture.destroyed || tracked.spriteHeight <= 0) return;
  let ghost = state.ghosts.find((candidate) => !candidate.active);
  if (!ghost) {
    ghost = state.ghosts[0];
    for (const candidate of state.ghosts) {
      if (candidate.bornAt < ghost.bornAt) ghost = candidate;
    }
  }
  const kind: GhostKind = isBuilding ? 'collapse' : entity.kind === 'boat' ? 'sink' : entity.kind === 'truck' ? 'wreck' : 'fall';
  const sprite = ghost.sprite;
  sprite.texture = tracked.texture;
  sprite.anchor.set(tracked.anchorX, tracked.anchorY);
  sprite.width = Math.abs(tracked.spriteWidth);
  sprite.height = tracked.spriteHeight;
  if (tracked.spriteWidth < 0) sprite.scale.x = -Math.abs(sprite.scale.x);
  sprite.position.set(tracked.spriteX, tracked.spriteY);
  sprite.rotation = 0;
  sprite.tint = tracked.spriteTint;
  sprite.alpha = 1;
  sprite.visible = true;
  ghost.active = true;
  ghost.kind = kind;
  ghost.bornAt = now;
  ghost.life = kind === 'collapse' ? 1.3 : kind === 'sink' ? 1.6 : kind === 'wreck' ? 1.4 : 1.0;
  ghost.baseX = tracked.spriteX;
  ghost.baseY = tracked.spriteY;
  ghost.baseScaleX = sprite.scale.x;
  ghost.baseScaleY = sprite.scale.y;
  ghost.direction = random(state) < 0.5 ? -1 : 1;
}

function updateGhosts(state: FxState, now: number): void {
  for (const ghost of state.ghosts) {
    if (!ghost.active) continue;
    const age = now - ghost.bornAt;
    const sprite = ghost.sprite;
    if (age >= ghost.life || age < 0 || sprite.texture.destroyed) {
      ghost.active = false;
      sprite.visible = false;
      continue;
    }
    const progress = age / ghost.life;
    const ease = 1 - (1 - progress) * (1 - progress);
    switch (ghost.kind) {
      case 'fall':
        // Topple sideways around the feet, then fade.
        sprite.rotation = ghost.direction * Math.min(1, ease * 1.6) * 1.35;
        sprite.alpha = progress < 0.55 ? 1 : 1 - (progress - 0.55) / 0.45;
        sprite.tint = 0x8a8078;
        break;
      case 'sink':
        // List to one side and slide under the surface.
        sprite.rotation = ghost.direction * ease * 0.32;
        sprite.position.set(ghost.baseX, ghost.baseY + ease * 16);
        sprite.scale.set(ghost.baseScaleX, ghost.baseScaleY * (1 - ease * 0.65));
        sprite.alpha = 1 - ease * 0.95;
        sprite.tint = 0x56707a;
        break;
      case 'wreck':
        sprite.tint = 0x3a3330;
        sprite.rotation = ghost.direction * ease * 0.12;
        sprite.alpha = progress < 0.5 ? 1 : 1 - (progress - 0.5) / 0.5;
        break;
      case 'collapse':
        // Squash into the ground while charring.
        sprite.scale.set(ghost.baseScaleX * (1 + ease * 0.06), ghost.baseScaleY * (1 - ease * 0.5));
        sprite.tint = progress < 0.15 ? 0xffc890 : 0x4a3f38;
        sprite.alpha = progress < 0.45 ? 1 : 1 - (progress - 0.45) / 0.55;
        break;
    }
  }
}

function detectResourceEvent(state: FxState, input: FxFrameInput, now: number): void {
  const event = input.lastResourceEvent;
  if (!event || event === state.lastResourceEvent) return;
  state.lastResourceEvent = event;
  const source = input.entities.find((entity) => entity.id === event.entityId);
  if (!source || !input.isVisible(source) || event.amount <= 0) return;
  const radius = getCollisionRadius(source);
  const headY = source.y - radius - (source.renderable.layer === 'buildings' ? 30 : 26);
  switch (event.kind) {
    case 'metalUnloaded':
      spawnLabel(state, source.x, headY, `+${Math.round(event.amount)} metal`, 0xe8edf0, now);
      return;
    case 'metalLoaded':
      spawnLabel(state, source.x, headY, `+${Math.round(event.amount)} ore`, 0xb7c2c6, now);
      return;
    case 'fishLoaded':
      spawnLabel(state, source.x, headY, `+${Math.round(event.amount)} fish`, 0x8fe4ff, now);
      return;
    case 'fishSold': {
      const cashGain = Math.round(input.playerCash - state.lastCash);
      spawnLabel(state, source.x, headY, cashGain > 0 ? `+$${cashGain}` : `${Math.round(event.amount)} sold`, 0xb8f07a, now);
      return;
    }
  }
}

function detectMoveCommand(state: FxState, input: FxFrameInput, now: number): void {
  const command = input.lastMoveCommand;
  if (!command || command === state.lastMoveCommand) {
    state.lastMoveCommand = command;
    return;
  }
  state.lastMoveCommand = command;
  spawnParticle(state, 'ping', command.x, command.y, 0, 0, now, 0.5, 34, 0xf6d48a);
}

function spawnParticle(
  state: FxState,
  kind: ParticleKind,
  x: number,
  y: number,
  vx: number,
  vy: number,
  now: number,
  life: number,
  size: number,
  color: number,
): void {
  let slot = state.particles.find((particle) => !particle.active);
  if (!slot) {
    slot = state.particles[0];
    for (const particle of state.particles) {
      if (particle.bornAt < slot.bornAt) slot = particle;
    }
  }
  slot.active = true;
  slot.kind = kind;
  slot.x = x;
  slot.y = y;
  slot.vx = vx;
  slot.vy = vy;
  slot.bornAt = now;
  slot.life = life;
  slot.size = size;
  slot.color = color;
}

function spawnLabel(state: FxState, x: number, y: number, text: string, color: number, now: number): void {
  let slot = state.labels.find((label) => !label.active);
  if (!slot) {
    slot = state.labels[0];
    for (const label of state.labels) {
      if (label.bornAt < slot.bornAt) slot = label;
    }
  }
  // Nudge labels that would stack exactly on top of a still-rising label from the same spot.
  let offsetY = 0;
  for (const label of state.labels) {
    if (label.active && Math.abs(label.x - x) < 30 && Math.abs(label.y - y) < 14 && now - label.bornAt < 0.35) offsetY -= 18;
  }
  slot.active = true;
  slot.bornAt = now;
  slot.x = x;
  slot.y = y + offsetY;
  slot.text.text = text;
  slot.text.tint = color;
  slot.text.visible = true;
  slot.text.alpha = 1;
}

function updateLabels(state: FxState, now: number): void {
  for (const label of state.labels) {
    if (!label.active) continue;
    const age = now - label.bornAt;
    if (age >= LABEL_LIFETIME_SECONDS || age < 0) {
      label.active = false;
      label.text.visible = false;
      continue;
    }
    const progress = age / LABEL_LIFETIME_SECONDS;
    const pop = age < 0.12 ? 1.3 - (age / 0.12) * 0.3 : 1;
    label.text.position.set(label.x, label.y - (1 - (1 - progress) * (1 - progress)) * 38);
    label.text.scale.set(pop);
    label.text.alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
  }
}

function drawParticles(state: FxState, now: number): void {
  let anyActive = false;
  for (const particle of state.particles) {
    if (particle.active && now - particle.bornAt >= particle.life) particle.active = false;
    if (particle.active) anyActive = true;
  }
  if (!anyActive) {
    if (state.particlesDrawn) {
      state.particleGraphic.clear();
      state.particlesDrawn = false;
    }
    return;
  }

  const graphic = state.particleGraphic;
  graphic.clear();
  state.particlesDrawn = true;
  for (const particle of state.particles) {
    if (!particle.active) continue;
    const age = Math.max(0, now - particle.bornAt);
    const progress = Math.min(1, age / particle.life);
    const fade = 1 - progress;
    switch (particle.kind) {
      case 'spark': {
        const drag = 1 - progress * 0.6;
        const x = particle.x + particle.vx * age * drag;
        const y = particle.y + particle.vy * age * drag + 140 * age * age;
        graphic.circle(x, y, Math.max(0.6, particle.size * fade)).fill({ color: particle.color, alpha: 0.95 * fade });
        break;
      }
      case 'glow':
        graphic.circle(particle.x, particle.y, particle.size * (0.6 + progress * 0.7)).fill({ color: particle.color, alpha: 0.55 * fade * fade });
        graphic.circle(particle.x, particle.y, particle.size * 0.35 * (1 - progress * 0.5)).fill({ color: 0xffffff, alpha: 0.7 * fade });
        break;
      case 'ring':
        graphic.circle(particle.x, particle.y, particle.size * (0.25 + (1 - fade * fade) * 0.75)).stroke({ color: particle.color, width: 2 + 4 * fade, alpha: 0.7 * fade });
        break;
      case 'ping': {
        const radiusX = particle.size * (1 - progress * 0.55);
        graphic.ellipse(particle.x, particle.y, radiusX, radiusX * 0.5).stroke({ color: 0x07110d, width: 4, alpha: 0.35 * fade });
        graphic.ellipse(particle.x, particle.y, radiusX, radiusX * 0.5).stroke({ color: particle.color, width: 2.5, alpha: 0.95 * fade });
        graphic.ellipse(particle.x, particle.y, radiusX * 0.45, radiusX * 0.22).fill({ color: particle.color, alpha: 0.25 * fade });
        break;
      }
    }
  }
}

function currentShakeStrength(state: FxState, now: number): number {
  if (!state.shaking || state.shakeDuration <= 0) return 0;
  const remaining = 1 - (now - state.shakeStartedAt) / state.shakeDuration;
  return remaining <= 0 ? 0 : state.shakeStrength * remaining * remaining;
}

function updateShake(state: FxState, stage: Container, now: number): void {
  if (!state.shaking) return;
  const strength = currentShakeStrength(state, now);
  if (strength <= 0.05) {
    state.shaking = false;
    stage.position.set(0, 0);
    return;
  }
  const t = (now - state.shakeStartedAt) * 60;
  stage.position.set(Math.sin(t * 1.7) * strength, Math.cos(t * 2.3) * strength * 0.7);
}
