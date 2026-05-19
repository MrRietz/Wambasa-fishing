import { expect, type Page, test } from '@playwright/test';

const PLAYER_FACTORY = { x: 767, y: 825 };
const PLAYER_BARRACKS = { x: 1075, y: 842 };
const PLAYER_DOCK = { x: 1370, y: 468 };
const SAFE_FISHING_ZONE = { x: 1585, y: 285 };
const CONTESTED_FISHING_ZONE = { x: 2380, y: 345 };
const PLAYER_GUARD = { x: 1480, y: 705 };
const ENEMY_FACTORY = { x: 2760, y: 690 };
const ENEMY_SHED = { x: 2610, y: 685 };
const ENEMY_WORKER = { x: 2525, y: 790 };
const ENEMY_GUARD = { x: 2505, y: 760 };
const ENEMY_SKIFF = { x: 2705, y: 438 };

type RtsDebugState = {
  paused: boolean;
  alerts: Array<{ id: number; message: string; severity: 'info' | 'success' | 'warning' | 'error'; focusWorld?: { x: number; y: number } }>;
  combatPreview: {
    active: boolean;
    hoveredEntityId?: string;
    hoveredTargetValid: boolean;
    selectedAttackerIds: string[];
    rangeCircleCount: number;
  };
  objectives: {
    currentId?: 'select' | 'harvest' | 'dock' | 'boat' | 'fish' | 'defense' | 'win';
    items: Array<{
      id: 'select' | 'harvest' | 'dock' | 'boat' | 'fish' | 'defense' | 'win';
      title: string;
      description: string;
      complete: boolean;
      current: boolean;
    }>;
  };
  camera: { x: number; y: number; zoom: number };
  layerLabels: string[];
  overlayLabels: string[];
  selectedEntityIds: string[];
  entities: Array<{
    id: string;
    name: string;
    kind: string;
    faction: string;
    commandable: boolean;
    movementState: string;
    x: number;
    y: number;
    moveTarget?: { x: number; y: number };
    pathLength: number;
    collisionRadius: number;
    animationState: 'idle' | 'move' | 'harvest' | 'build' | 'fish' | 'unload' | 'attack' | 'sabotage' | 'repair' | 'damaged' | 'destroyed';
    animationDirection: 'east' | 'south' | 'west' | 'north' | 'northEast' | 'southEast' | 'southWest' | 'northWest';
    animationFrame: number;
    animationProfile: 'humanoid' | 'truck' | 'boat' | 'building';
    animationFrameCount: number;
    renderPolish: {
      hasWheelMotion: boolean;
      hasCargoLoad: boolean;
      hasWake: boolean;
      hasProductionActivity: boolean;
      hasConstructionActivity: boolean;
      hasDamageSmoke: boolean;
      hasDisabledPulse: boolean;
      hasAttackCharge: boolean;
      hasFishingRipple: boolean;
      hasCriticalGlow: boolean;
      constructionProgress?: number;
      wheelPhase: number;
      wakePhase: number;
      activityPhase: number;
      disabledPhase: number;
      attackPhase: number;
    };
    health?: number;
    damageState?: 'healthy' | 'damaged' | 'critical' | 'destroyed';
    cargo?: { kind: 'metal' | 'fish'; amount: number; capacity: number };
    combatRole?: 'fishing' | 'attack';
    harvesting?: { fieldId?: string; phase: 'to-field' | 'loading' | 'returning' | 'manual-returning'; remainingSeconds?: number };
    fishing?: { zoneId: string; phase: 'to-zone' | 'fishing' };
    factoryDuty?: { factoryId: string; phase: 'to-factory' | 'producing' };
    unloadingFish?: { targetId: string; phase: 'to-dock' | 'to-bank' };
    dockRepair?: { dockId: string; phase: 'to-dock' | 'repairing'; repairPerSecond: number; cashPerSecond: number };
    autoFishZoneId?: string;
    attack?: {
      targetId: string;
      phase: 'to-target' | 'attacking';
      damagePerSecond: number;
      range: number;
      leash?: { x: number; y: number; range: number };
    };
    guardOrder?: { mode: 'hold' | 'attackMove'; destination?: { x: number; y: number }; acquireRange: number };
    sabotage?: { targetId: string; phase: 'to-target' | 'sabotaging'; disableSeconds: number; range: number };
    repair?: { targetId: string; phase: 'to-target' | 'repairing'; repairPerSecond: number; range: number };
    disabledSeconds?: number;
    productionQueue?: Array<{ id: string; product: 'worker' | 'guard' | 'saboteur' | 'truck' | 'boat' | 'attackBoat'; remainingSeconds: number; totalSeconds: number; cost: number }>;
    construction?: {
      building: 'house' | 'dock' | 'guardTower' | 'techLab' | 'barracks' | 'factory';
      progressSeconds: number;
      totalSeconds: number;
      complete: boolean;
      builderId?: string;
      capacityBonus: number;
    };
    buildJob?: { siteId: string; phase: 'to-site' | 'building' };
  }>;
  lastMoveCommand?: { x: number; y: number; entityIds: string[]; pathLength: number };
  lastCommandResult?: {
    ok: boolean;
    kind: 'move' | 'harvestMetal' | 'metalUnload' | 'fish' | 'attack' | 'sabotage' | 'repair' | 'produce' | 'placement' | 'stop' | 'hold' | 'attackMove';
    reason?: string;
    message: string;
    pathLength?: number;
    targetId?: string;
    product?: 'worker' | 'guard' | 'saboteur' | 'truck' | 'boat' | 'attackBoat';
    building?: 'house' | 'dock' | 'guardTower' | 'techLab' | 'barracks' | 'factory';
  };
  lastCombatEvent?: {
    attackerId: string;
    targetId: string;
    kind: 'attacking' | 'damaged' | 'destroyed';
    targetHealth?: number;
  };
  lastSabotageEvent?: {
    saboteurId: string;
    targetId: string;
    kind: 'queued' | 'disabled' | 'recovered';
    disabledSeconds?: number;
  };
  lastRepairEvent?: {
    workerId: string;
    targetId: string;
    kind: 'queued' | 'repairing' | 'repaired';
    targetHealth?: number;
  };
  collision: {
    minimumMobileUnitDistance: number;
    mobileUnitCount: number;
  };
  resources: {
    metal: number;
    cash: number;
    fields: Array<{ id: string; amount: number; x: number; y: number; radius: number }>;
  };
  ai: {
    metal: number;
    cash: number;
    baseArea?: { id: string; owner: string; x: number; y: number; width: number; height: number };
    unitIds: string[];
    commandCenterId?: string;
    lastAction?: string;
    lastProductionEvent?: {
      kind: 'queued' | 'spawned';
      product: 'worker' | 'guard' | 'saboteur' | 'truck' | 'boat' | 'attackBoat';
      entityId?: string;
      stockpile: number;
    };
    lastResourceEvent?: {
      entityId: string;
      kind: 'metalUnloaded' | 'fishSold';
      amount: number;
      metal: number;
      cash: number;
    };
    lastRaidEvent?: {
      kind: 'queued' | 'attacking' | 'damaged' | 'destroyed';
      attackerId: string;
      targetId: string;
      targetHealth?: number;
    };
    lastDefenseEvent?: {
      kind: 'responding' | 'towerBuilt';
      defenderId: string;
      threatId: string;
      threatCount: number;
    };
  };
  lastResourceEvent?: {
    entityId: string;
    kind: 'metalLoaded' | 'metalUnloaded' | 'fishLoaded' | 'fishSold';
    amount: number;
    stockpile: number;
    cash?: number;
  };
  lastProductionEvent?: {
    kind: 'queued' | 'spawned';
    product: 'worker' | 'guard' | 'saboteur' | 'truck' | 'boat' | 'attackBoat';
    entityId?: string;
    stockpile: number;
  };
  crew: {
    used: number;
    reserved?: number;
    capacity: number;
  };
  placement?: {
    active: boolean;
    building?: 'house' | 'dock' | 'guardTower' | 'techLab' | 'barracks' | 'factory';
    valid?: boolean;
    reason?: string;
    x?: number;
    y?: number;
  };
  match: {
    outcome: 'running' | 'victory' | 'defeat';
    reason: string;
    playerProfitTarget: number;
    aiProfitTarget: number;
  };
  stats: {
    cashEarned: number;
    fishSold: number;
    metalHarvested: number;
    playerUnitsLost: number;
    playerBuildingsLost: number;
    enemyUnitsDestroyed: number;
    enemyBuildingsDestroyed: number;
  };
  balance: {
    playerStartingMetal: number;
    aiStartingMetal: number;
    aiStartDelaySeconds: number;
    aiFirstRaidGraceSeconds: number;
    starterMetalCargo: number;
    firstBoatCashValue: number;
  };
  performance: {
    averageFrameMs: number;
    lastFrameMs: number;
    estimatedFps: number;
    viewportWidth: number;
    viewportHeight: number;
  };
  audio: {
    supported: boolean;
    unlocked: boolean;
    musicPlaying: boolean;
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    uiVolume: number;
    alertsVolume: number;
    musicLayer: 'calm' | 'tension' | 'combat';
    lastCue?: string;
  };
  settings: { uiScale: number; edgeScroll: boolean; difficulty: 'easy' | 'normal' | 'hard' };
  map: {
    width: number;
    height: number;
    blockers: number;
    buildable: number;
    metalFields: number;
    fishingZones: number;
    fishingZoneStates: Array<{
      id: string;
      label: string;
      amount: number;
      maxFish: number;
      cashPerFish: number;
      tier: string;
    }>;
  };
};

async function getDebugState(page: Page): Promise<RtsDebugState> {
  await page.waitForFunction(() => Boolean(window.__wambasaRts));
  return page.evaluate(() => {
    const state = window.__wambasaRts;
    if (!state) {
      throw new Error('RTS debug state is not published.');
    }
    return state;
  });
}

async function worldToScreen(page: Page, worldX: number, worldY: number): Promise<{ x: number; y: number }> {
  const state = await getDebugState(page);
  const viewportBox = await page.locator('#rts-game').boundingBox();
  if (!viewportBox) {
    throw new Error('Expected viewport box.');
  }
  return {
    x: viewportBox.x + (worldX - state.camera.x) * state.camera.zoom,
    y: viewportBox.y + (worldY - state.camera.y) * state.camera.zoom,
  };
}

test.describe('Epic 1 RTS foundation', () => {
  test('boots Pixi shell with data-backed map, layers, and overlays', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Wambåsa Fishing Wars' })).toBeVisible();
    await expect(page.getByText('PixiJS RTS foundation ready.')).toBeVisible();
    await expect(page.locator('.rts-alert-item[data-message="PixiJS RTS foundation ready."]')).toBeVisible();
    await expect(page.locator('#objective-list')).toContainText('Select your crew');
    await expect(page.locator('#objective-list')).toContainText('Win the skirmish');
    await expect(page.locator('.rts-objective-item[data-objective-id="select"]')).toHaveAttribute('data-current', 'true');
    await expect(page.locator('#rts-game canvas')).toBeVisible();
    await expect(page.locator('#rts-minimap')).toBeVisible();

    const state = await getDebugState(page);
    expect(state.map).toEqual(expect.objectContaining({
      width: 3200,
      height: 1400,
      blockers: 4,
      buildable: 2,
      metalFields: 3,
      fishingZones: 2,
    }));
    expect(state.layerLabels).toEqual([
      'terrain-layer',
      'building-layer',
      'unit-layer',
      'effect-layer',
      'fog-layer',
      'overlay-layer',
      'debug-layer',
    ]);
    expect(state.overlayLabels).toEqual(
      expect.arrayContaining([
        'build-footprints-overlay',
        'selection-rings-overlay',
        'destination-markers-overlay',
        'drag-box-overlay',
        'debug-grid-overlay',
      ]),
    );
    expect(state.audio).toEqual(
      expect.objectContaining({
        supported: expect.any(Boolean),
        unlocked: false,
        musicPlaying: false,
        masterVolume: 0.86,
        musicVolume: 0.28,
        sfxVolume: 0.72,
        uiVolume: 0.7,
        alertsVolume: 0.84,
        musicLayer: 'calm',
      }),
    );
    expect(state.alerts[0]).toEqual(expect.objectContaining({ message: 'PixiJS RTS foundation ready.', severity: 'success' }));
    expect(state.objectives.currentId).toBe('select');
    expect(state.objectives.items.map((objective) => objective.id)).toEqual(['select', 'harvest', 'dock', 'boat', 'fish', 'defense', 'win']);
    expect(state.balance).toEqual({
      playerStartingMetal: 280,
      playerStartingCash: 100,
      aiStartingMetal: 280,
      aiStartingCash: 100,
      aiStartDelaySeconds: 8,
      aiFirstRaidGraceSeconds: 20,
      starterMetalCargo: 100,
      firstBoatCashValue: 160,
    });
  });

  test('opening objectives match the actual starting base state and explain dock progression', async ({ page }) => {
    await page.goto('/');

    let state = await getDebugState(page);
    expect(state.objectives.items.find((objective) => objective.id === 'dock')).toEqual(
      expect.objectContaining({
        title: 'Review the Working Dock',
        complete: false,
      }),
    );
    expect(state.objectives.items.find((objective) => objective.id === 'defense')).toEqual(expect.objectContaining({ complete: false }));

    const truck = await worldToScreen(page, 480, 917);
    await page.mouse.click(truck.x, truck.y);
    const metalField = await worldToScreen(page, 370, 980);
    await page.mouse.click(metalField.x, metalField.y, { button: 'right' });
    await page.waitForFunction(() => window.__wambasaRts?.resources.metal === 380, null, { timeout: 9000 });

    state = await getDebugState(page);
    expect(state.objectives.currentId).toBe('dock');
    await expect(page.locator('.rts-objective-item[data-objective-id="dock"]')).toContainText('Review the Working Dock');

    const dock = await worldToScreen(page, 1370, 468);
    await page.mouse.click(dock.x, dock.y);
    state = await getDebugState(page);
    expect(state.objectives.items.find((objective) => objective.id === 'dock')).toEqual(expect.objectContaining({ complete: true }));
    expect(state.objectives.currentId).toBe('boat');
  });

  test('factory and dock selections explain metal-only versus cash-backed production clearly', async ({ page }) => {
    await page.goto('/');

    const factory = await worldToScreen(page, 767, 825);
    await page.mouse.click(factory.x, factory.y);
    await expect(page.locator('#command-hint')).toContainText('Workers and Trucks cost metal only');
    await expect(page.locator('#selection-readout')).toContainText('Guards/Saboteurs: metal + cash');

    const dock = await worldToScreen(page, 1370, 468);
    await page.mouse.click(dock.x, dock.y);
    await expect(page.locator('#command-hint')).toContainText('Fishing Boats earn cash');
    await expect(page.locator('#selection-readout')).toContainText('Fish sales fund more boats and naval combat units');
  });

  test('unlocks music and SFX buses from the Start button', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Start Skirmish Shell' }).click();
    await expect(page.locator('#boot-status')).toContainText(/Music online|Audio unavailable/);

    const state = await getDebugState(page);
    if (state.audio.supported) {
      expect(state.audio).toEqual(expect.objectContaining({ unlocked: true, musicPlaying: true, musicLayer: 'calm', lastCue: expect.any(String) }));
    } else {
      expect(state.audio).toEqual(expect.objectContaining({ unlocked: false, musicPlaying: false, lastCue: 'audio-unsupported' }));
    }
  });

  test('audio exposes richer buses and warning music layer', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Skirmish Shell' }).click();
    await page.waitForFunction(() => Boolean(window.__wambasaRtsForceRaid), null, { timeout: 5000 });
    await page.evaluate(() => window.__wambasaRtsForceRaid?.());
    const state = await getDebugState(page);
    expect(state.audio).toEqual(
      expect.objectContaining({
        masterVolume: expect.any(Number),
        musicVolume: expect.any(Number),
        sfxVolume: expect.any(Number),
        uiVolume: expect.any(Number),
        alertsVolume: expect.any(Number),
      }),
    );
    if (state.audio.supported) {
      expect(state.audio).toEqual(expect.objectContaining({ lastCue: 'warning', musicLayer: 'tension' }));
    }
  });

  test('persists music and SFX volume settings across reload', async ({ page }) => {
    await page.goto('/');
    await getDebugState(page);

    await page.evaluate(() => {
      const music = document.querySelector<HTMLInputElement>('#music-volume-slider');
      const sfx = document.querySelector<HTMLInputElement>('#sfx-volume-slider');
      if (!music || !sfx) throw new Error('Missing audio sliders.');
      music.value = '41'; music.dispatchEvent(new Event('input', { bubbles: true }));
      sfx.value = '63'; sfx.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#music-volume-readout')).toHaveText('41%');
    await expect(page.locator('#sfx-volume-readout')).toHaveText('63%');

    let state = await getDebugState(page);
    expect(state.audio.musicVolume).toBeCloseTo(0.41, 2);
    expect(state.audio.sfxVolume).toBeCloseTo(0.63, 2);

    await page.reload();
    await expect(page.locator('#music-volume-readout')).toHaveText('41%');
    await expect(page.locator('#sfx-volume-readout')).toHaveText('63%');

    state = await getDebugState(page);
    expect(state.audio.musicVolume).toBeCloseTo(0.41, 2);
    expect(state.audio.sfxVolume).toBeCloseTo(0.63, 2);
  });

  test('persists readability and control settings across reload', async ({ page }) => {
    await page.goto('/');
    await getDebugState(page);

    await page.evaluate(() => {
      const uiScale = document.querySelector<HTMLInputElement>('#ui-scale-slider');
      const edgeScroll = document.querySelector<HTMLInputElement>('#edge-scroll-toggle');
      const difficulty = document.querySelector<HTMLSelectElement>('#difficulty-select');
      if (!uiScale || !edgeScroll || !difficulty) throw new Error('Missing readability settings.');
      uiScale.value = '110'; uiScale.dispatchEvent(new Event('input', { bubbles: true }));
      edgeScroll.checked = false; edgeScroll.dispatchEvent(new Event('change', { bubbles: true }));
      difficulty.value = 'hard'; difficulty.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await expect(page.locator('#ui-scale-readout')).toHaveText('110%');
    let state = await getDebugState(page);
    expect(state.settings).toEqual({ uiScale: 110, edgeScroll: false, difficulty: 'hard' });

    await page.reload();
    await expect(page.locator('#ui-scale-readout')).toHaveText('110%');
    await expect(page.locator('#edge-scroll-toggle')).not.toBeChecked();
    await expect(page.locator('#difficulty-select')).toHaveValue('hard');
    state = await getDebugState(page);
    expect(state.settings).toEqual({ uiScale: 110, edgeScroll: false, difficulty: 'hard' });
  });

  test('moves canonical camera with minimap drag and mouse wheel zoom', async ({ page }) => {
    await page.goto('/');
    const initial = await getDebugState(page);
    const minimap = page.locator('#rts-minimap');
    const minimapBox = await minimap.boundingBox();
    const viewport = page.locator('#rts-game');
    const viewportBox = await viewport.boundingBox();

    expect(minimapBox).not.toBeNull();
    expect(viewportBox).not.toBeNull();
    if (!minimapBox || !viewportBox) {
      throw new Error('Expected minimap and viewport boxes.');
    }

    await page.mouse.move(minimapBox.x + minimapBox.width * 0.42, minimapBox.y + minimapBox.height * 0.45);
    await page.mouse.down();
    await page.mouse.move(minimapBox.x + minimapBox.width * 0.78, minimapBox.y + minimapBox.height * 0.68, { steps: 6 });
    await page.mouse.up();

    const afterDrag = await getDebugState(page);
    expect(afterDrag.camera.x).toBeGreaterThan(initial.camera.x);
    expect(afterDrag.camera.y).toBeGreaterThanOrEqual(initial.camera.y);

    await page.mouse.move(viewportBox.x + viewportBox.width * 0.5, viewportBox.y + viewportBox.height * 0.5);
    await page.mouse.wheel(0, -450);

    const afterZoom = await getDebugState(page);
    expect(afterZoom.camera.zoom).toBeGreaterThan(afterDrag.camera.zoom);
  });

  test('drags the minimap viewport rectangle directly and can focus the player base with keyboard shortcut', async ({ page }) => {
    await page.goto('/');
    const minimap = page.locator('#rts-minimap');
    const minimapBox = await minimap.boundingBox();
    if (!minimapBox) {
      throw new Error('Expected minimap box.');
    }

    let state = await getDebugState(page);
    const initialCamera = state.camera;
    const viewWidth = 1280 / initialCamera.zoom;
    const viewHeight = 720 / initialCamera.zoom;
    const viewLeft = (initialCamera.x / 3200) * minimapBox.width;
    const viewTop = (initialCamera.y / 1400) * minimapBox.height;
    const viewPixelWidth = (viewWidth / 3200) * minimapBox.width;
    const viewPixelHeight = (viewHeight / 1400) * minimapBox.height;

    await page.mouse.move(minimapBox.x + viewLeft + viewPixelWidth * 0.5, minimapBox.y + viewTop + viewPixelHeight * 0.5);
    await page.mouse.down();
    await page.mouse.move(minimapBox.x + viewLeft + viewPixelWidth * 0.5 + 44, minimapBox.y + viewTop + viewPixelHeight * 0.5 + 18, { steps: 6 });
    await page.mouse.up();

    state = await getDebugState(page);
    expect(state.camera.x).toBeGreaterThan(initialCamera.x + 250);

    await page.keyboard.press('Home');
    state = await getDebugState(page);
    expect(state.camera.x).toBeLessThan(300);
    expect(state.camera.y).toBeLessThan(500);
  });

  test('Escape opens pause menu, freezes simulation, and Escape resumes it', async ({ page }) => {
    await page.goto('/');

    const worker = await worldToScreen(page, 760, 1000);
    await page.mouse.click(worker.x, worker.y);
    const destination = await worldToScreen(page, 980, 980);
    await page.mouse.click(destination.x, destination.y, { button: 'right' });
    await page.waitForTimeout(250);

    await page.keyboard.press('Escape');
    await expect(page.locator('#pause-menu-panel')).toBeVisible();

    let state = await getDebugState(page);
    expect(state.paused).toBe(true);
    const movingWorker = state.entities.find((entity) => entity.id === 'worker-1');
    expect(movingWorker?.movementState).toBe('moving');
    const pausedX = movingWorker?.x;
    const pausedY = movingWorker?.y;

    await page.waitForTimeout(900);
    state = await getDebugState(page);
    expect(state.paused).toBe(true);
    expect(state.entities.find((entity) => entity.id === 'worker-1')).toEqual(expect.objectContaining({ x: pausedX, y: pausedY }));

    await page.keyboard.press('Escape');
    await expect(page.locator('#pause-menu-panel')).toBeHidden();
    await page.waitForTimeout(900);

    state = await getDebugState(page);
    expect(state.paused).toBe(false);
    expect(state.entities.find((entity) => entity.id === 'worker-1')).toEqual(expect.not.objectContaining({ x: pausedX, y: pausedY }));
  });

  test('pause menu applies settings changes and restart returns to a clean match state', async ({ page }) => {
    await page.goto('/');
    await getDebugState(page);
    await page.locator('#pause-toggle-button').click();
    await expect(page.locator('#pause-menu-panel')).toBeVisible();

    await page.evaluate(() => {
      const uiScale = document.querySelector<HTMLInputElement>('#ui-scale-slider');
      const edgeScroll = document.querySelector<HTMLInputElement>('#edge-scroll-toggle');
      const difficulty = document.querySelector<HTMLSelectElement>('#difficulty-select');
      if (!uiScale || !edgeScroll || !difficulty) throw new Error('Missing pause settings controls.');
      uiScale.value = '108'; uiScale.dispatchEvent(new Event('input', { bubbles: true }));
      edgeScroll.checked = false; edgeScroll.dispatchEvent(new Event('change', { bubbles: true }));
      difficulty.value = 'hard'; difficulty.dispatchEvent(new Event('change', { bubbles: true }));
    });

    let state = await getDebugState(page);
    expect(state.paused).toBe(true);
    expect(state.settings).toEqual({ uiScale: 108, edgeScroll: false, difficulty: 'hard' });

    await page.locator('#pause-restart-button').click();
    await expect(page.locator('#pause-menu-panel')).toBeHidden();

    state = await getDebugState(page);
    expect(state.paused).toBe(false);
    expect(state.match).toEqual(expect.objectContaining({ outcome: 'running', reason: 'Skirmish in progress.' }));
    expect(state.resources).toEqual(expect.objectContaining({ metal: 280, cash: 100 }));
    expect(state.selectedEntityIds).toEqual([]);
    expect(state.settings).toEqual({ uiScale: 108, edgeScroll: false, difficulty: 'hard' });
  });
});

test.describe('Epic 9 MVP polish', () => {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    test(`keeps core UI visible and publishes performance diagnostics at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');

      await expect(page.locator('#rts-game canvas')).toBeVisible();
      await expect(page.locator('#rts-minimap')).toBeVisible();
      await expect(page.locator('#objective-list')).toBeVisible();
      await expect(page.locator('#alert-feed')).toBeVisible();
      await expect(page.locator('#selection-readout')).toBeVisible();
      await expect(page.locator('#pause-toggle-button')).toBeVisible();

      const commandPanel = await page.locator('.rts-command-panel').boundingBox();
      const selectionReadout = await page.locator('#selection-readout').boundingBox();
      expect(commandPanel).not.toBeNull();
      expect(selectionReadout).not.toBeNull();
      if (!commandPanel || !selectionReadout) {
        throw new Error('Expected command panel and selection readout boxes.');
      }
      expect(selectionReadout.y + selectionReadout.height).toBeLessThanOrEqual(commandPanel.y + commandPanel.height);

      await page.waitForTimeout(350);
      const state = await getDebugState(page);
      expect(state.performance.viewportWidth).toBeGreaterThan(0);
      expect(state.performance.viewportHeight).toBeGreaterThan(0);
      expect(state.performance.estimatedFps).toBeGreaterThan(0);
      expect(state.performance.averageFrameMs).toBeLessThan(80);
    });
  }
});

test.describe('Epic 3 land economy foundation', () => {
  test('initializes Factory Command Center economy components and metal fields', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#economy-readout')).toHaveText('Metal: 280 | Cash: 100 | Crew: 6/6');
    const state = await getDebugState(page);
    expect(state.resources.metal).toBe(280);
    expect(state.resources.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'player-metal-a', amount: 1200 }),
        expect.objectContaining({ id: 'player-metal-b', amount: 1200 }),
      ]),
    );
    expect(state.entities.find((entity) => entity.id === 'player-factory')).toEqual(
      expect.objectContaining({
        kind: 'factory',
        health: 1200,
        dropOff: ['metal'],
        productionQueue: [],
      }),
    );
  });

  test('queues truck harvest command by right-clicking a metal field', async ({ page }) => {
    await page.goto('/');
    const truck = await worldToScreen(page, 480, 917);
    await page.mouse.click(truck.x, truck.y);

    const metalField = await worldToScreen(page, 370, 980);
    await page.mouse.click(metalField.x, metalField.y, { button: 'right' });

    await expect(page.getByText('Harvest command queued for 1 truck.')).toBeVisible();
    const queued = await getDebugState(page);
    expect(queued.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'harvestMetal' }));
    expect(queued.entities.find((entity) => entity.id === 'truck-1')).toEqual(
      expect.objectContaining({
        movementState: 'moving',
        animationState: 'harvest',
        animationProfile: 'truck',
        animationFrameCount: 6,
        renderPolish: expect.objectContaining({ hasWheelMotion: true }),
        harvesting: expect.objectContaining({ fieldId: 'player-metal-a', phase: 'to-field' }),
      }),
    );
  });

  test('truck loads metal, returns to Factory, unloads, and updates resource bar', async ({ page }) => {
    await page.goto('/');
    const truck = await worldToScreen(page, 480, 917);
    await page.mouse.click(truck.x, truck.y);

    const metalField = await worldToScreen(page, 370, 980);
    await page.mouse.click(metalField.x, metalField.y, { button: 'right' });

    await page.waitForFunction(() => {
      const truckState = window.__wambasaRts?.entities.find((entity) => entity.id === 'truck-1');
      return truckState?.harvesting?.phase === 'returning' && truckState.cargo?.amount === 100;
    });

    let state = await getDebugState(page);
    expect(state.lastResourceEvent).toEqual(expect.objectContaining({ kind: 'metalLoaded', amount: 100, entityId: 'truck-1' }));
    expect(state.resources.fields.find((field) => field.id === 'player-metal-a')?.amount).toBe(1100);
    expect(state.resources.metal).toBe(280);
    expect(state.entities.find((entity) => entity.id === 'truck-1')).toEqual(
      expect.objectContaining({
        renderPolish: expect.objectContaining({ hasCargoLoad: true }),
      }),
    );

    await page.waitForFunction(() => window.__wambasaRts?.resources.metal === 380, null, { timeout: 9000 });
    await expect(page.locator('#economy-readout')).toHaveText('Metal: 380 | Cash: 100 | Crew: 6/6');
    await expect(page.getByText('Metal hauler unloaded 100 metal and is returning to the metal field. Stockpile: 380.')).toBeVisible();

    state = await getDebugState(page);
    const truckAfterUnload = state.entities.find((entity) => entity.id === 'truck-1');
    expect(state.lastResourceEvent).toEqual(expect.objectContaining({ kind: 'metalUnloaded', amount: 100, stockpile: 380 }));
    expect(state.objectives.items.find((objective) => objective.id === 'harvest')).toEqual(expect.objectContaining({ complete: true }));
    expect(state.objectives.currentId).toBe('dock');
    await expect(page.locator('.rts-objective-item[data-objective-id="dock"]')).toHaveAttribute('data-current', 'true');
    expect(truckAfterUnload).toEqual(
      expect.objectContaining({
        movementState: 'moving',
        cargo: { kind: 'metal', amount: 0, capacity: 100 },
        harvesting: expect.objectContaining({ fieldId: 'player-metal-a', phase: 'to-field' }),
      }),
    );
  });

  test('rejects harvest command when no truck is selected', async ({ page }) => {
    await page.goto('/');
    const worker = await worldToScreen(page, 850, 695);
    await page.mouse.click(worker.x, worker.y);

    const metalField = await worldToScreen(page, 370, 980);
    await page.mouse.click(metalField.x, metalField.y, { button: 'right' });

    await expect(page.getByText('Select a metal hauler truck before harvesting metal.')).toBeVisible();
    const state = await getDebugState(page);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: false, kind: 'harvestMetal', reason: 'wrong-unit' }));
  });

  test('factory spends metal, queues a worker, shows progress, and spawns it', async ({ page }) => {
    await page.goto('/');
    const factory = await worldToScreen(page, 767, 825);
    await page.mouse.click(factory.x, factory.y);

    await expect(page.locator('#factory-command-panel')).toBeVisible();
    await expect(page.getByText('Factory Orders')).toBeVisible();
    await page.getByRole('button', { name: 'Build Worker - 60 metal' }).click();

    await expect(page.locator('#economy-readout')).toHaveText('Metal: 220 | Cash: 100 | Crew: 6/6');
    await expect(page.locator('#production-readout')).toContainText('Worker');
    let state = await getDebugState(page);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'produce', product: 'worker' }));
    expect(state.lastProductionEvent).toEqual(expect.objectContaining({ kind: 'queued', product: 'worker', stockpile: 220 }));
    expect(state.entities.find((entity) => entity.id === 'player-factory')?.productionQueue?.[0]).toEqual(
      expect.objectContaining({ product: 'worker', cost: 60 }),
    );
    expect(state.entities.find((entity) => entity.id === 'player-factory')?.renderPolish).toEqual(
      expect.objectContaining({ hasProductionActivity: true }),
    );

    await page.waitForFunction(() => window.__wambasaRts?.lastProductionEvent?.kind === 'spawned', null, { timeout: 8000 });
    state = await getDebugState(page);
    expect(state.lastProductionEvent).toEqual(expect.objectContaining({ kind: 'spawned', product: 'worker' }));
    expect(state.entities.some((entity) => entity.id === state.lastProductionEvent?.entityId && entity.kind === 'worker')).toBe(true);
    expect(state.entities.find((entity) => entity.id === 'player-factory')?.productionQueue).toEqual([]);
    await expect(page.locator('#production-readout')).toHaveText('Queue empty');
  });

  test('barracks can train a new guard for base defense', async ({ page }) => {
    await page.goto('/');
    const barracks = await worldToScreen(page, PLAYER_BARRACKS.x, PLAYER_BARRACKS.y);
    await page.mouse.click(barracks.x, barracks.y);

    await expect(page.getByRole('button', { name: 'Build Guard - 90 metal + 15 cash' })).toBeVisible();
    await page.getByRole('button', { name: 'Build Guard - 90 metal + 15 cash' }).click();

    await expect(page.locator('#economy-readout')).toHaveText('Metal: 190 | Cash: 85 | Crew: 6/6');
    await expect(page.locator('#barracks-production-readout')).toContainText('Guard');
    let state = await getDebugState(page);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'produce', product: 'guard' }));
    expect(state.lastProductionEvent).toEqual(expect.objectContaining({ kind: 'queued', product: 'guard', stockpile: 190 }));
    expect(state.entities.find((entity) => entity.id === 'player-barracks')?.productionQueue?.[0]).toEqual(
      expect.objectContaining({ product: 'guard', cost: 90 }),
    );

    await page.waitForFunction(() => window.__wambasaRts?.lastProductionEvent?.kind === 'spawned', null, { timeout: 8000 });
    state = await getDebugState(page);
    expect(state.lastProductionEvent).toEqual(expect.objectContaining({ kind: 'spawned', product: 'guard' }));
    expect(state.entities.some((entity) => entity.id === state.lastProductionEvent?.entityId && entity.kind === 'guard' && entity.commandable)).toBe(true);
    await expect(page.locator('#barracks-production-readout')).toHaveText('Queue empty');
  });

  test('blocks unaffordable Factory production with readable feedback', async ({ page }) => {
    await page.goto('/');
    const factory = await worldToScreen(page, 767, 825);
    await page.mouse.click(factory.x, factory.y);

    await page.getByRole('button', { name: 'Build Truck - 130 metal' }).click();
    await expect(page.locator('#economy-readout')).toHaveText('Metal: 150 | Cash: 100 | Crew: 6/6');
    await expect(page.getByRole('button', { name: 'Build Truck - 130 metal' })).toBeDisabled();

    await page.evaluate(() => {
      const button = document.querySelector<HTMLButtonElement>('#produce-truck-button');
      if (button) {
        button.disabled = false;
        button.click();
      }
    });

    const state = await getDebugState(page);
    expect(page.getByRole('button', { name: 'Build Truck - 130 metal' })).toBeDisabled();
    expect(state.resources.metal).toBe(100);
  });
});

test.describe('Epic 4 worker building placement foundation', () => {
  test('selecting a worker reveals building actions and starts House placement preview', async ({ page }) => {
    await page.goto('/');
    const worker = await worldToScreen(page, 760, 1000);
    await page.mouse.click(worker.x, worker.y);

    await expect(page.locator('#worker-command-panel')).toBeVisible();
    await expect(page.getByText('Worker Build Menu')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Plan House - 90 metal' })).toBeEnabled();
    await expect(page.locator('#worker-build-details')).toContainText('Prerequisite: select a worker.');
    await expect(page.locator('#worker-build-details')).toContainText('Guard Tower: 150 metal | 7.5s build | 260 range | targets enemy raiders');

    await page.getByRole('button', { name: 'Plan House - 90 metal' }).click();
    const validPlacement = await worldToScreen(page, 950, 1050);
    await page.mouse.move(validPlacement.x, validPlacement.y);

    await expect(page.locator('#placement-readout')).toContainText('House foundation: valid');
    await expect(page.locator('#placement-readout')).toContainText('90 metal | 4.5s build | +8 crew cap');
    const state = await getDebugState(page);
    expect(state.placement).toEqual(
      expect.objectContaining({
        active: true,
        building: 'house',
        valid: true,
        reason: 'valid',
      }),
    );
    expect(state.overlayLabels).toContain('placement-preview-overlay');
  });

  test('blocks invalid House placement over terrain blockers without spending metal', async ({ page }) => {
    await page.goto('/');
    const worker = await worldToScreen(page, 760, 1000);
    await page.mouse.click(worker.x, worker.y);

    await page.getByRole('button', { name: 'Plan House - 90 metal' }).click();
    const blockedPlacement = await worldToScreen(page, 1100, 1000);
    await page.mouse.move(blockedPlacement.x, blockedPlacement.y);

    await expect(page.locator('#placement-readout')).toContainText('blocked - blocked terrain');
    await page.mouse.click(blockedPlacement.x, blockedPlacement.y);

    await expect(page.getByText('Placement blocked: blocked terrain.')).toBeVisible();
    const state = await getDebugState(page);
    expect(state.resources.metal).toBe(280);
    expect(state.lastCommandResult).toEqual(
      expect.objectContaining({ ok: false, kind: 'placement', reason: 'invalid-placement' }),
    );
    expect(state.placement).toEqual(
      expect.objectContaining({
        active: true,
        building: 'house',
        valid: false,
        reason: 'blocked terrain',
      }),
    );
  });

  test('confirms valid House placement, spends metal, and assigns the worker to build', async ({ page }) => {
    await page.goto('/');
    const worker = await worldToScreen(page, 760, 1000);
    await page.mouse.click(worker.x, worker.y);

    await page.getByRole('button', { name: 'Plan House - 90 metal' }).click();
    const validPlacement = await worldToScreen(page, 950, 1050);
    await page.mouse.move(validPlacement.x, validPlacement.y);
    await page.mouse.click(validPlacement.x, validPlacement.y);

    await expect(page.getByText('House foundation started. Dockyard Worker is moving to build.')).toBeVisible();
    await expect(page.locator('#placement-readout')).toHaveText('No placement active');
    const state = await getDebugState(page);
    expect(state.resources.metal).toBe(160);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'placement', building: 'house' }));
    expect(state.placement).toEqual({ active: false });
    expect(state.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.stringMatching(/^house-site-/),
          kind: 'house',
          commandable: false,
          animationState: 'build',
          animationProfile: 'building',
          animationFrameCount: 5,
          renderPolish: expect.objectContaining({ hasConstructionActivity: true, constructionProgress: 0 }),
          construction: expect.objectContaining({ building: 'house', complete: false, builderId: 'worker-1' }),
        }),
        expect.objectContaining({
          id: 'worker-1',
          movementState: 'moving',
          animationState: 'move',
          buildJob: expect.objectContaining({ phase: 'to-site' }),
        }),
      ]),
    );
  });

  test('worker completes House construction and expands crew capacity', async ({ page }) => {
    await page.goto('/');
    const worker = await worldToScreen(page, 760, 1000);
    await page.mouse.click(worker.x, worker.y);

    await page.getByRole('button', { name: 'Plan House - 90 metal' }).click();
    const validPlacement = await worldToScreen(page, 950, 1050);
    await page.mouse.move(validPlacement.x, validPlacement.y);
    await page.mouse.click(validPlacement.x, validPlacement.y);

    await page.waitForFunction(() => window.__wambasaRts?.crew.capacity === 14, null, { timeout: 8000 });
    await expect(page.locator('#economy-readout')).toHaveText('Metal: 190 | Cash: 100 | Crew: 6/14');
    await expect(page.getByText('Crew House complete. Crew capacity increased to 14.')).toBeVisible();

    const state = await getDebugState(page);
    expect(state.crew).toEqual({ used: 4, reserved: 0, capacity: 14 });
    expect(state.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'house',
          name: 'Crew House',
          commandable: true,
          construction: expect.objectContaining({ complete: true, capacityBonus: 8 }),
        }),
        expect.objectContaining({ id: 'worker-1', movementState: 'idle', buildJob: undefined }),
      ]),
    );
  });

  test('Dock placement is only valid on shoreline cells', async ({ page }) => {
    await page.goto('/');
    const worker = await worldToScreen(page, 850, 695);
    await page.mouse.click(worker.x, worker.y);

    await expect(page.getByRole('button', { name: 'Plan Dock - 120 metal' })).toBeEnabled();
    await page.getByRole('button', { name: 'Plan Dock - 120 metal' }).click();

    const validShore = await worldToScreen(page, 900, 500);
    await page.mouse.move(validShore.x, validShore.y);
    await expect(page.locator('#placement-readout')).toContainText('Dock foundation: valid');

    let state = await getDebugState(page);
    expect(state.placement).toEqual(
      expect.objectContaining({
        active: true,
        building: 'dock',
        valid: true,
        reason: 'valid',
      }),
    );

    const invalidLand = await worldToScreen(page, 900, 700);
    await page.mouse.move(invalidLand.x, invalidLand.y);
    await expect(page.locator('#placement-readout')).toContainText('blocked - wrong terrain (shoreline required)');

    state = await getDebugState(page);
    expect(state.placement).toEqual(
      expect.objectContaining({
        active: true,
        building: 'dock',
        valid: false,
        reason: 'requires shoreline',
      }),
    );
  });

  test('placement mode cancels cleanly with Escape and right-click', async ({ page }) => {
    await page.goto('/');
    const worker = await worldToScreen(page, 760, 1000);
    await page.mouse.click(worker.x, worker.y);

    await page.getByRole('button', { name: 'Plan House - 90 metal' }).click();
    await expect(page.locator('#placement-readout')).toContainText('Right-click or Esc to cancel');
    await page.keyboard.press('Escape');
    await expect(page.locator('#placement-readout')).toHaveText('No placement active');
    await expect(page.getByText('Building placement cancelled.')).toBeVisible();

    await page.getByRole('button', { name: 'Plan Dock - 120 metal' }).click();
    await expect(page.locator('#placement-readout')).toContainText('Right-click or Esc to cancel');
    const placementPoint = await worldToScreen(page, 900, 500);
    await page.mouse.click(placementPoint.x, placementPoint.y, { button: 'right' });
    await expect(page.locator('#placement-readout')).toHaveText('No placement active');
    await expect(page.getByText('Building placement cancelled.')).toBeVisible();
  });

  test('worker completes Dock construction and exposes boat production/unload role', async ({ page }) => {
    await page.goto('/');
    const worker = await worldToScreen(page, 850, 695);
    await page.mouse.click(worker.x, worker.y);

    await page.getByRole('button', { name: 'Plan Dock - 120 metal' }).click();
    const validShore = await worldToScreen(page, 900, 500);
    await page.mouse.move(validShore.x, validShore.y);
    await page.mouse.click(validShore.x, validShore.y);

    await expect(page.getByText('Dock foundation started. Factory Worker is moving to build.')).toBeVisible();
    let state = await getDebugState(page);
    expect(state.resources.metal).toBe(120);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'placement', building: 'dock' }));

    await page.waitForFunction(
      () => window.__wambasaRts?.entities.some((entity) => entity.kind === 'dock' && entity.name === 'Working Dock' && entity.construction?.complete),
      null,
      { timeout: 16000 },
    );
    await expect(page.getByText('Working Dock complete. Boat production and unload point ready.')).toBeVisible();

    state = await getDebugState(page);
    const builtDock = state.entities.find((entity) => entity.kind === 'dock' && entity.name === 'Working Dock' && entity.construction?.complete);
    expect(builtDock).toEqual(
      expect.objectContaining({
        commandable: true,
        productionQueue: [],
        construction: expect.objectContaining({ building: 'dock', complete: true, capacityBonus: 0 }),
      }),
    );

    const dockScreen = await worldToScreen(page, builtDock?.x ?? 900, builtDock?.y ?? 500);
    await page.mouse.click(dockScreen.x, dockScreen.y);
    await expect(page.locator('#selection-readout')).toContainText('Boat production');
    await expect(page.locator('#selection-readout')).toContainText('Fish unload');
  });

  test('worker can place a Guard Tower defensive structure and invalid placement does not spend metal', async ({ page }) => {
    await page.goto('/');
    const worker = await worldToScreen(page, 760, 1000);
    await page.mouse.click(worker.x, worker.y);

    await expect(page.getByRole('button', { name: 'Plan Guard Tower - 150 metal' })).toBeEnabled();
    await expect(page.locator('#worker-build-details')).toContainText('Guard Tower: 150 metal | 7.5s build | 260 range | targets enemy raiders');
    await page.getByRole('button', { name: 'Plan Guard Tower - 150 metal' }).click();

    const blockedPlacement = await worldToScreen(page, 1100, 1000);
    await page.mouse.move(blockedPlacement.x, blockedPlacement.y);
    await expect(page.locator('#placement-readout')).toContainText('blocked - blocked terrain');
    await page.mouse.click(blockedPlacement.x, blockedPlacement.y);

    await expect(page.getByText('Placement blocked: blocked terrain.')).toBeVisible();
    let state = await getDebugState(page);
    expect(state.resources.metal).toBe(280);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: false, kind: 'placement', reason: 'invalid-placement' }));

    const validPlacement = await worldToScreen(page, 980, 1060);
    await page.mouse.move(validPlacement.x, validPlacement.y);
    await expect(page.locator('#placement-readout')).toContainText('Guard Tower foundation: valid');
    await expect(page.locator('#placement-readout')).toContainText('150 metal | 7.5s build | 260 range | targets enemy raiders');
    await page.mouse.click(validPlacement.x, validPlacement.y);

    await expect(page.getByText('Guard Tower foundation started. Dockyard Worker is moving to build.')).toBeVisible();
    state = await getDebugState(page);
    expect(state.resources.metal).toBe(130);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'placement', building: 'guardTower' }));
    expect(state.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.stringMatching(/^guardTower-site-/),
          kind: 'guardTower',
          commandable: false,
          construction: expect.objectContaining({ building: 'guardTower', complete: false, builderId: 'worker-1' }),
        }),
      ]),
    );

    await page.waitForFunction(
      () => window.__wambasaRts?.entities.some((entity) => entity.kind === 'guardTower' && entity.name === 'Guard Tower' && entity.construction?.complete),
      null,
      { timeout: 16000 },
    );
    await expect(page.getByText('Guard Tower complete. Defensive position ready.')).toBeVisible();

    state = await getDebugState(page);
    const builtTower = state.entities.find((entity) => entity.kind === 'guardTower' && entity.name === 'Guard Tower');
    expect(builtTower).toEqual(
      expect.objectContaining({
        commandable: true,
        health: 520,
        animationProfile: 'building',
        construction: expect.objectContaining({ building: 'guardTower', complete: true, capacityBonus: 0 }),
      }),
    );

    const towerScreen = await worldToScreen(page, builtTower?.x ?? 980, builtTower?.y ?? 1060);
    await page.mouse.click(towerScreen.x, towerScreen.y);
    await expect(page.locator('#selection-readout')).toContainText('Defensive structure');
    await expect(page.locator('#selection-readout')).toContainText('Targets enemy raiders');
  });

  test('worker repairs a damaged friendly building', async ({ page }) => {
    await page.goto('/');

    await page.waitForFunction(() => Boolean(window.__wambasaRtsDamageEntity), null, { timeout: 5000 });
    const damaged = await page.evaluate(() => window.__wambasaRtsDamageEntity?.('player-factory', 500) ?? false);
    expect(damaged).toBe(true);

    let state = await getDebugState(page);
    const damagedHealth = state.entities.find((entity) => entity.id === 'player-factory')?.health ?? 1200;
    expect(damagedHealth).toBeLessThan(1200);
    expect(state.entities.find((entity) => entity.id === 'player-factory')?.renderPolish).toEqual(
      expect.objectContaining({ hasDamageSmoke: true }),
    );

    const worker = await worldToScreen(page, 760, 1000);
    await page.mouse.click(worker.x, worker.y);
    const factory = await worldToScreen(page, 767, 825);
    await page.mouse.click(factory.x, factory.y, { button: 'right' });
    await expect(page.getByLabel('success: Repair command queued for 1 worker.')).toBeVisible();

    state = await getDebugState(page);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'repair', targetId: 'player-factory' }));
    expect(state.entities.find((entity) => entity.id === 'worker-1')).toEqual(
      expect.objectContaining({ movementState: 'moving', repair: expect.objectContaining({ targetId: 'player-factory', phase: 'to-target' }) }),
    );

    await page.waitForFunction(
      (previousHealth) => (window.__wambasaRts?.entities.find((entity) => entity.id === 'player-factory')?.health ?? 0) > previousHealth,
      damagedHealth,
      { timeout: 9000 },
    );

    state = await getDebugState(page);
    expect(state.lastRepairEvent).toEqual(expect.objectContaining({ workerId: 'worker-1', targetId: 'player-factory' }));
    expect(state.entities.find((entity) => entity.id === 'player-factory')?.health).toBeGreaterThan(damagedHealth);
    await expect(page.locator('#selection-readout')).toContainText('Repairing');
  });
});

test.describe('Epic 5 dock and sea economy foundation', () => {
  test('completed Dock spends metal, queues a fishing boat, and shows progress', async ({ page }) => {
    await page.goto('/');
    const dock = await worldToScreen(page, 1370, 468);
    await page.mouse.click(dock.x, dock.y);

    await expect(page.locator('#dock-command-panel')).toBeVisible();
    await expect(page.getByText('Dock Orders')).toBeVisible();
    await expect(page.locator('#selection-readout')).toContainText('Boat production');
    await page.getByRole('button', { name: 'Build Fishing Boat - 100 metal + 25 cash' }).click();

    await expect(page.locator('#economy-readout')).toHaveText('Metal: 180 | Cash: 75 | Crew: 6/6');
    await expect(page.locator('#dock-production-readout')).toContainText('Fishing Boat');
    const state = await getDebugState(page);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'produce', product: 'boat' }));
    expect(state.lastProductionEvent).toEqual(expect.objectContaining({ kind: 'queued', product: 'boat', stockpile: 180 }));
    expect(state.entities.find((entity) => entity.id === 'player-dock')?.productionQueue?.[0]).toEqual(
      expect.objectContaining({ product: 'boat', cost: 100 }),
    );
  });

  test('Dock production spawns a selectable fishing boat at a water point', async ({ page }) => {
    await page.goto('/');
    const dock = await worldToScreen(page, 1370, 468);
    await page.mouse.click(dock.x, dock.y);
    await page.getByRole('button', { name: 'Build Fishing Boat - 100 metal + 25 cash' }).click();

    await page.waitForFunction(() => window.__wambasaRts?.lastProductionEvent?.kind === 'spawned' && window.__wambasaRts.lastProductionEvent.product === 'boat', null, { timeout: 10000 });
    await expect(page.getByText('Fishing Boat produced.')).toBeVisible();
    await expect(page.locator('#dock-production-readout')).toHaveText('Queue empty');

    const state = await getDebugState(page);
    const boat = state.entities.find((entity) => entity.id === state.lastProductionEvent?.entityId);
    expect(boat).toEqual(
      expect.objectContaining({
        kind: 'boat',
        faction: 'player',
        commandable: true,
        movementState: 'idle',
      }),
    );
    expect(boat?.y).toBeLessThan(500);

    const boatScreen = await worldToScreen(page, boat?.x ?? 1346, boat?.y ?? 350);
    await page.mouse.click(boatScreen.x, boatScreen.y);
    await expect(page.locator('#selection-readout')).toContainText('Fishing Boat');
    await expect(page.locator('#selection-readout')).toContainText('Fishing boat');
  });

  test('worker can crew the factory by right-clicking it without selecting the factory first', async ({ page }) => {
    await page.goto('/');

    const worker = await worldToScreen(page, 760, 1000);
    await page.mouse.click(worker.x, worker.y);
    const factory = await worldToScreen(page, PLAYER_FACTORY.x, PLAYER_FACTORY.y);
    await page.mouse.click(factory.x, factory.y, { button: 'right' });

    await expect(page.getByLabel('success: Factory crew assignment queued for 1 worker.')).toBeVisible();

    const state = await getDebugState(page);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'move' }));
    expect(state.entities.find((entity) => entity.id === 'worker-1')).toEqual(
      expect.objectContaining({
        movementState: 'moving',
        factoryDuty: expect.objectContaining({ factoryId: 'player-factory', phase: 'to-factory' }),
      }),
    );
  });

  test('worker can fish from shoreline and unload at the nearest completed dock', async ({ page }) => {
    test.setTimeout(45000);
    await page.goto('/');

    const worker = await worldToScreen(page, 760, 1000);
    await page.mouse.click(worker.x, worker.y);

    const minimapBox = await page.locator('#rts-minimap').boundingBox();
    if (!minimapBox) {
      throw new Error('Expected minimap box.');
    }
    await page.mouse.click(
      minimapBox.x + minimapBox.width * (SAFE_FISHING_ZONE.x / 3200),
      minimapBox.y + minimapBox.height * (SAFE_FISHING_ZONE.y / 1400),
    );

    const fishingZone = await worldToScreen(page, SAFE_FISHING_ZONE.x, SAFE_FISHING_ZONE.y);
    await page.mouse.click(fishingZone.x, fishingZone.y, { button: 'right' });

    await page.waitForFunction(() => {
      const state = window.__wambasaRts;
      const workerState = state?.entities.find((entity) => entity.id === 'worker-1');
      return state?.lastCommandResult?.kind === 'fish' && state.lastCommandResult.ok && workerState?.shoreFishing?.phase === 'to-shore';
    }, undefined, { timeout: 8000 });

    let state = await getDebugState(page);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'fish' }));
    expect(state.entities.find((entity) => entity.id === 'worker-1')).toEqual(
      expect.objectContaining({
        movementState: 'moving',
        shoreFishing: expect.objectContaining({ zoneId: 'cod-bank', phase: 'to-shore' }),
        autoFishZoneId: 'cod-bank',
      }),
    );

    await page.waitForFunction(() => {
      const workerState = window.__wambasaRts?.entities.find((entity) => entity.id === 'worker-1');
      return workerState?.shoreFishing?.phase === 'fishing';
    }, undefined, { timeout: 12000 });

    state = await getDebugState(page);
    expect(state.entities.find((entity) => entity.id === 'worker-1')).toEqual(
      expect.objectContaining({
        animationState: 'fish',
        animationProfile: 'humanoid',
        shoreFishing: expect.objectContaining({ zoneId: 'cod-bank', phase: 'fishing' }),
      }),
    );

    await page.waitForFunction(() => {
      const event = window.__wambasaRts?.lastResourceEvent;
      return event?.entityId === 'worker-1' && event.kind === 'fishLoaded';
    }, undefined, { timeout: 8000 });

    await page.waitForFunction(() => {
      const workerState = window.__wambasaRts?.entities.find((entity) => entity.id === 'worker-1');
      return ['player-dock', 'player-factory'].includes(workerState?.unloadingFish?.targetId ?? '') && (workerState?.cargo?.amount ?? 0) > 0;
    }, undefined, { timeout: 25000 });

    await page.waitForFunction(() => {
      const event = window.__wambasaRts?.lastResourceEvent;
      return event?.entityId === 'worker-1' && event.kind === 'fishSold';
    }, undefined, { timeout: 25000 });

    state = await getDebugState(page);
    expect(state.lastResourceEvent).toEqual(expect.objectContaining({ entityId: 'worker-1', kind: 'fishSold', amount: expect.any(Number), cash: expect.any(Number) }));
    expect((state.lastResourceEvent?.cash ?? 0)).toBeGreaterThan(100);
    expect(state.entities.find((entity) => entity.id === 'worker-1')).toEqual(
      expect.objectContaining({
        cargo: expect.objectContaining({ kind: 'fish', amount: 0 }),
      }),
    );
  });

  test('selected fishing boat moves through water on right-click command', async ({ page }) => {
    await page.goto('/');
    const dock = await worldToScreen(page, PLAYER_DOCK.x, PLAYER_DOCK.y);
    await page.mouse.click(dock.x, dock.y);
    await page.getByRole('button', { name: 'Build Fishing Boat - 100 metal + 25 cash' }).click();

    await page.waitForFunction(() => window.__wambasaRts?.lastProductionEvent?.kind === 'spawned' && window.__wambasaRts.lastProductionEvent.product === 'boat', null, { timeout: 10000 });
    let state = await getDebugState(page);
    const boat = state.entities.find((entity) => entity.id === state.lastProductionEvent?.entityId);
    const boatScreen = await worldToScreen(page, boat?.x ?? 1346, boat?.y ?? 350);
    await page.mouse.click(boatScreen.x, boatScreen.y);

    const waterDestination = await worldToScreen(page, 1040, 300);
    await page.mouse.click(waterDestination.x, waterDestination.y, { button: 'right' });
    await expect(page.getByText('Boat move command queued for 1 boat.')).toBeVisible();

    state = await getDebugState(page);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'move', pathLength: 1 }));
    expect(state.lastMoveCommand).toEqual(expect.objectContaining({ entityIds: [boat?.id] }));
    expect(state.entities.find((entity) => entity.id === boat?.id)).toEqual(
      expect.objectContaining({ movementState: 'moving', moveTarget: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }) }),
    );

    await page.waitForTimeout(900);
    state = await getDebugState(page);
    const movedBoat = state.entities.find((entity) => entity.id === boat?.id);
    expect(movedBoat?.x).toBeLessThan((boat?.x ?? 0) - 40);
    expect(movedBoat?.y).toBeLessThan(500);
  });

  test('Dock can produce a separate attack boat that can sink enemy boats', async ({ page }) => {
    await page.goto('/');
    const dock = await worldToScreen(page, PLAYER_DOCK.x, PLAYER_DOCK.y);
    await page.mouse.click(dock.x, dock.y);
    await page.getByRole('button', { name: 'Build Attack Boat - 135 metal + 50 cash' }).click();

    await page.waitForFunction(() => window.__wambasaRts?.lastProductionEvent?.kind === 'spawned' && window.__wambasaRts.lastProductionEvent.product === 'attackBoat', null, { timeout: 11000 });
    await expect(page.getByText('Attack Boat produced.')).toBeVisible();

    let state = await getDebugState(page);
    const attackBoat = state.entities.find((entity) => entity.id === state.lastProductionEvent?.entityId);
    expect(attackBoat).toEqual(expect.objectContaining({ kind: 'boat', combatRole: 'attack' }));

    const attackBoatScreen = await worldToScreen(page, attackBoat?.x ?? 1346, attackBoat?.y ?? 350);
    await page.mouse.click(attackBoatScreen.x, attackBoatScreen.y);
    await expect(page.locator('#selection-readout')).toContainText('Attack boat');

    const minimapBox = await page.locator('#rts-minimap').boundingBox();
    if (!minimapBox) {
      throw new Error('Expected minimap box.');
    }
    await page.mouse.click(minimapBox.x + minimapBox.width * (ENEMY_SKIFF.x / 3200), minimapBox.y + minimapBox.height * (ENEMY_SKIFF.y / 1400));
    state = await getDebugState(page);
    const liveEnemySkiff = state.entities.find((entity) => entity.id === 'enemy-skiff');
    const enemySkiff = await worldToScreen(page, liveEnemySkiff?.x ?? ENEMY_SKIFF.x, liveEnemySkiff?.y ?? ENEMY_SKIFF.y);
    await page.mouse.click(enemySkiff.x, enemySkiff.y, { button: 'right' });
    await expect(page.getByText('Attack command queued for 1 boat.')).toBeVisible();

    state = await getDebugState(page);
    expect(state.entities.find((entity) => entity.id === attackBoat?.id)?.attack).toEqual(expect.objectContaining({ targetId: 'enemy-skiff' }));

    await page.waitForFunction(() => window.__wambasaRts?.entities.find((entity) => entity.id === 'enemy-skiff')?.damageState === 'destroyed', null, {
      timeout: 15000,
    });
    state = await getDebugState(page);
    expect(state.lastCombatEvent).toEqual(expect.objectContaining({ attackerId: attackBoat?.id, targetId: 'enemy-skiff', kind: 'destroyed' }));
  });

  test('damaged boats can return to Dock for paid repair', async ({ page }) => {
    await page.goto('/');
    const dock = await worldToScreen(page, PLAYER_DOCK.x, PLAYER_DOCK.y);
    await page.mouse.click(dock.x, dock.y);
    await page.getByRole('button', { name: 'Build Attack Boat - 135 metal + 50 cash' }).click();

    await page.waitForFunction(() => window.__wambasaRts?.lastProductionEvent?.kind === 'spawned' && window.__wambasaRts.lastProductionEvent.product === 'attackBoat', null, { timeout: 11000 });
    let state = await getDebugState(page);
    const attackBoat = state.entities.find((entity) => entity.id === state.lastProductionEvent?.entityId);
    if (!attackBoat?.id) {
      throw new Error('Expected spawned attack boat for dock repair test.');
    }
    expect(attackBoat).toEqual(expect.objectContaining({ kind: 'boat', combatRole: 'attack', health: 260 }));

    const damaged = await page.evaluate((entityId) => window.__wambasaRtsDamageEntity?.(entityId, 120) ?? false, attackBoat.id);
    expect(damaged).toBe(true);
    state = await getDebugState(page);
    const damagedHealth = state.entities.find((entity) => entity.id === attackBoat?.id)?.health ?? 260;
    const cashBeforeRepair = state.resources.cash;
    expect(damagedHealth).toBeLessThan(260);

    const attackBoatScreen = await worldToScreen(page, attackBoat?.x ?? PLAYER_DOCK.x, attackBoat?.y ?? 350);
    await page.mouse.click(attackBoatScreen.x, attackBoatScreen.y);
    await page.mouse.click(dock.x, dock.y, { button: 'right' });
    await expect(page.getByText('Dock repair queued for 1 boat. Costs 10 cash/s while repairing.')).toBeVisible();

    state = await getDebugState(page);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'repair', targetId: 'player-dock' }));

    await page.waitForFunction(
      ({ boatId, damagedHealth, cashBeforeRepair }) => {
        const state = window.__wambasaRts;
        const boat = state?.entities.find((entity) => entity.id === boatId);
        return (boat?.health ?? 0) > damagedHealth && (state?.resources.cash ?? 999) < cashBeforeRepair;
      },
      { boatId: attackBoat.id, damagedHealth, cashBeforeRepair },
      { timeout: 5000 },
    );

    state = await getDebugState(page);
    expect(state.entities.find((entity) => entity.id === attackBoat.id)?.health).toBeGreaterThan(damagedHealth);
    expect(state.resources.cash).toBeLessThan(cashBeforeRepair);
  });

  test('boat repair is blocked when the friendly Dock is destroyed', async ({ page }) => {
    await page.goto('/');
    const dock = await worldToScreen(page, PLAYER_DOCK.x, PLAYER_DOCK.y);
    await page.mouse.click(dock.x, dock.y);
    await page.getByRole('button', { name: 'Build Attack Boat - 135 metal + 50 cash' }).click();

    await page.waitForFunction(() => window.__wambasaRts?.lastProductionEvent?.kind === 'spawned' && window.__wambasaRts.lastProductionEvent.product === 'attackBoat', null, { timeout: 11000 });
    let state = await getDebugState(page);
    const attackBoat = state.entities.find((entity) => entity.id === state.lastProductionEvent?.entityId);
    if (!attackBoat?.id) {
      throw new Error('Expected spawned attack boat for destroyed dock repair test.');
    }
    const damagedBoat = await page.evaluate((entityId) => window.__wambasaRtsDamageEntity?.(entityId, 120) ?? false, attackBoat.id);
    expect(damagedBoat).toBe(true);
    const destroyedDock = await page.evaluate(() => window.__wambasaRtsDamageEntity?.('player-dock', 2000) ?? false);
    expect(destroyedDock).toBe(true);

    const attackBoatScreen = await worldToScreen(page, attackBoat?.x ?? PLAYER_DOCK.x, attackBoat?.y ?? 350);
    await page.mouse.click(attackBoatScreen.x, attackBoatScreen.y);
    await page.mouse.click(dock.x, dock.y, { button: 'right' });
    await expect(page.getByText('Dock repair unavailable: no functioning friendly Dock can receive that boat.')).toBeVisible();

    state = await getDebugState(page);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: false, kind: 'repair' }));
    expect(state.entities.find((entity) => entity.id === attackBoat.id)?.dockRepair).toBeUndefined();
  });

  test('selected fishing boat rejects land move targets with clear feedback', async ({ page }) => {
    await page.goto('/');
    const dock = await worldToScreen(page, 1370, 468);
    await page.mouse.click(dock.x, dock.y);
    await page.getByRole('button', { name: 'Build Fishing Boat - 100 metal + 25 cash' }).click();

    await page.waitForFunction(() => window.__wambasaRts?.lastProductionEvent?.kind === 'spawned' && window.__wambasaRts.lastProductionEvent.product === 'boat', null, { timeout: 10000 });
    const state = await getDebugState(page);
    const boat = state.entities.find((entity) => entity.id === state.lastProductionEvent?.entityId);
    const boatScreen = await worldToScreen(page, boat?.x ?? 1346, boat?.y ?? 350);
    await page.mouse.click(boatScreen.x, boatScreen.y);

    const landDestination = await worldToScreen(page, 1020, 880);
    await page.mouse.click(landDestination.x, landDestination.y, { button: 'right' });

    await expect(page.getByText('Boat move rejected: choose open water.')).toBeVisible();
    const rejected = await getDebugState(page);
    expect(rejected.lastCommandResult).toEqual(expect.objectContaining({ ok: false, kind: 'move', reason: 'invalid-destination' }));
    expect(rejected.entities.find((entity) => entity.id === boat?.id)).toEqual(expect.objectContaining({ movementState: 'idle' }));
  });

  test('selected fishing boat can harvest fish from a fishing zone', async ({ page }) => {
    await page.goto('/');
    const dock = await worldToScreen(page, 1370, 468);
    await page.mouse.click(dock.x, dock.y);
    await page.getByRole('button', { name: 'Build Fishing Boat - 100 metal + 25 cash' }).click();

    await page.waitForFunction(() => window.__wambasaRts?.lastProductionEvent?.kind === 'spawned' && window.__wambasaRts.lastProductionEvent.product === 'boat', null, { timeout: 10000 });
    let state = await getDebugState(page);
    const boat = state.entities.find((entity) => entity.id === state.lastProductionEvent?.entityId);
    const boatScreen = await worldToScreen(page, boat?.x ?? 1346, boat?.y ?? 350);
    await page.mouse.click(boatScreen.x, boatScreen.y);

    const fishingZone = await worldToScreen(page, 1585, 285);
    await page.mouse.click(fishingZone.x, fishingZone.y, { button: 'right' });

    await expect(page.getByText('Fishing command queued for 1 boat.')).toBeVisible();
    state = await getDebugState(page);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'fish', pathLength: 1 }));
    expect(state.entities.find((entity) => entity.id === boat?.id)).toEqual(
      expect.objectContaining({
        movementState: 'moving',
        animationState: 'fish',
        animationProfile: 'boat',
        animationFrameCount: 5,
        renderPolish: expect.objectContaining({ hasWake: true }),
        fishing: expect.objectContaining({ zoneId: 'cod-bank', phase: 'to-zone' }),
      }),
    );

    await page.waitForFunction(
      (boatId) => {
        const boatState = window.__wambasaRts?.entities.find((entity) => entity.id === boatId);
        return boatState?.fishing?.phase === 'fishing' && (boatState.cargo?.amount ?? 0) > 0;
      },
      boat?.id,
      { timeout: 7000 },
    );
    await expect(page.locator('#selection-readout')).toContainText('Fishing');
    await expect(page.locator('#selection-readout')).toContainText('Sunlit Cod Bank');
    await expect(page.locator('#selection-readout')).toContainText('Safe waters');
    await expect(page.locator('#selection-readout')).toContainText('2 cash/fish');
    state = await getDebugState(page);
    expect(state.entities.find((entity) => entity.id === boat?.id)).toEqual(expect.objectContaining({ animationState: 'fish' }));

    await page.waitForFunction(
      (boatId) => {
        const boatState = window.__wambasaRts?.entities.find((entity) => entity.id === boatId);
        return boatState?.cargo?.kind === 'fish' && boatState.cargo.amount === boatState.cargo.capacity && !boatState.fishing;
      },
      boat?.id,
      { timeout: 9000 },
    );
    await expect(page.getByText('Fishing Boat filled fish cargo. Returning to Dock automatically.')).toBeVisible();

    state = await getDebugState(page);
    expect(state.lastResourceEvent).toEqual(expect.objectContaining({ entityId: boat?.id, kind: 'fishLoaded' }));
    expect(state.entities.find((entity) => entity.id === boat?.id)).toEqual(
      expect.objectContaining({
        movementState: 'moving',
        cargo: { kind: 'fish', amount: 80, capacity: 80 },
        fishing: undefined,
        unloadingFish: expect.objectContaining({ dockId: 'player-dock', phase: 'to-dock' }),
        autoFishZoneId: 'cod-bank',
      }),
    );
  });

  test('loaded fishing boat returns to Dock and sells fish for cash', async ({ page }) => {
    await page.goto('/');
    const dock = await worldToScreen(page, 1370, 468);
    await page.mouse.click(dock.x, dock.y);
    await page.getByRole('button', { name: 'Build Fishing Boat - 100 metal + 25 cash' }).click();

    await page.waitForFunction(() => window.__wambasaRts?.lastProductionEvent?.kind === 'spawned' && window.__wambasaRts.lastProductionEvent.product === 'boat', null, { timeout: 10000 });
    let state = await getDebugState(page);
    const boat = state.entities.find((entity) => entity.id === state.lastProductionEvent?.entityId);
    const boatScreen = await worldToScreen(page, boat?.x ?? 1346, boat?.y ?? 350);
    await page.mouse.click(boatScreen.x, boatScreen.y);

    const fishingZone = await worldToScreen(page, 1585, 285);
    await page.mouse.click(fishingZone.x, fishingZone.y, { button: 'right' });
    await page.waitForFunction(
      (boatId) => {
        const boatState = window.__wambasaRts?.entities.find((entity) => entity.id === boatId);
        return boatState?.cargo?.kind === 'fish' && boatState.cargo.amount === boatState.cargo.capacity && !boatState.fishing;
      },
      boat?.id,
      { timeout: 20000 },
    );

    const dockScreen = await worldToScreen(page, 1370, 468);
    await page.mouse.click(dockScreen.x, dockScreen.y, { button: 'right' });
    await expect(page.getByText('Fish unload command queued for 1 boat.')).toBeVisible();

    state = await getDebugState(page);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'fish', pathLength: 1 }));
    expect(state.entities.find((entity) => entity.id === boat?.id)).toEqual(
      expect.objectContaining({
        movementState: 'moving',
        unloadingFish: expect.objectContaining({ dockId: 'player-dock', phase: 'to-dock' }),
      }),
    );

    await page.waitForFunction(() => window.__wambasaRts?.resources.cash === 235, null, { timeout: 7000 });
    await expect(page.locator('#economy-readout')).toHaveText('Metal: 180 | Cash: 235 | Crew: 6/6');
    await expect(page.getByText('Fishing Boat sold 80 fish from Sunlit Cod Bank and is returning to fish. Cash: 235.')).toBeVisible();
    await expect(page.locator('#match-result-panel')).toBeHidden();

    state = await getDebugState(page);
    expect(state.match).toEqual(expect.objectContaining({ outcome: 'running', playerProfitTarget: 1600 }));
    expect(state.lastResourceEvent).toEqual(expect.objectContaining({ entityId: boat?.id, kind: 'fishSold', amount: 80, cash: 235 }));
    expect(state.stats).toEqual(expect.objectContaining({ cashEarned: 160, fishSold: 80, metalHarvested: 0 }));
    expect(state.entities.find((entity) => entity.id === boat?.id)).toEqual(
      expect.objectContaining({
        movementState: 'moving',
        cargo: { kind: 'fish', amount: 0, capacity: 80 },
        unloadingFish: undefined,
        fishing: expect.objectContaining({ zoneId: 'cod-bank', phase: 'to-zone' }),
        autoFishZoneId: 'cod-bank',
      }),
    );
    await expect(page.locator('#restart-match-button')).toBeHidden();
  });

  test('contested fishing zone pays more cash and shows higher-yield zone details', async ({ page }) => {
    await page.goto('/');
    const dock = await worldToScreen(page, 1370, 468);
    await page.mouse.click(dock.x, dock.y);
    await page.getByRole('button', { name: 'Build Fishing Boat - 100 metal + 25 cash' }).click();

    await page.waitForFunction(() => window.__wambasaRts?.lastProductionEvent?.kind === 'spawned' && window.__wambasaRts.lastProductionEvent.product === 'boat', null, { timeout: 10000 });
    let state = await getDebugState(page);
    const boat = state.entities.find((entity) => entity.id === state.lastProductionEvent?.entityId);
    const boatScreen = await worldToScreen(page, boat?.x ?? 1346, boat?.y ?? 350);
    await page.mouse.click(boatScreen.x, boatScreen.y);

    const minimapBox = await page.locator('#rts-minimap').boundingBox();
    expect(minimapBox).not.toBeNull();
    if (!minimapBox) {
      throw new Error('Expected minimap box for contested fishing zone test.');
    }
    await page.mouse.click(minimapBox.x + minimapBox.width * (CONTESTED_FISHING_ZONE.x / 3200), minimapBox.y + minimapBox.height * (CONTESTED_FISHING_ZONE.y / 1400));

    const fishingZone = await worldToScreen(page, CONTESTED_FISHING_ZONE.x, CONTESTED_FISHING_ZONE.y);
    await page.mouse.click(fishingZone.x, fishingZone.y, { button: 'right' });
    await page.waitForFunction(
      (boatId) => {
        const boatState = window.__wambasaRts?.entities.find((entity) => entity.id === boatId);
        return boatState?.cargo?.kind === 'fish' && boatState.cargo.amount === boatState.cargo.capacity && !boatState.fishing;
      },
      boat?.id,
      { timeout: 20000 },
    );

    await expect(page.locator('#selection-readout')).toContainText('Breaker Herring Run');
    await expect(page.locator('#selection-readout')).toContainText('Contested waters');
    await expect(page.locator('#selection-readout')).toContainText('3 cash/fish');

    const dockScreen = await worldToScreen(page, 1370, 468);
    await page.mouse.click(dockScreen.x, dockScreen.y, { button: 'right' });
    await page.waitForFunction(() => window.__wambasaRts?.resources.cash === 315, null, { timeout: 10000 });
    await expect(page.locator('#economy-readout')).toHaveText('Metal: 180 | Cash: 315 | Crew: 6/6');
    await expect(page.getByText('Fishing Boat sold 80 fish from Breaker Herring Run and is returning to fish. Cash: 315.')).toBeVisible();

    state = await getDebugState(page);
    expect(state.lastResourceEvent).toEqual(expect.objectContaining({ entityId: boat?.id, kind: 'fishSold', amount: 80, cash: 315 }));
    expect(state.entities.find((entity) => entity.id === boat?.id)).toEqual(
      expect.objectContaining({
        fishing: expect.objectContaining({ zoneId: 'herring-bank', phase: 'to-zone' }),
        autoFishZoneId: 'herring-bank',
      }),
    );
  });

  test('depleted fishing zones return partial catch, warn about poor yield, and regrow over time', async ({ page }) => {
    await page.goto('/');
    const dock = await worldToScreen(page, PLAYER_DOCK.x, PLAYER_DOCK.y);
    await page.mouse.click(dock.x, dock.y);
    await page.getByRole('button', { name: 'Build Fishing Boat - 100 metal + 25 cash' }).click();

    await page.waitForFunction(() => window.__wambasaRts?.lastProductionEvent?.kind === 'spawned' && window.__wambasaRts.lastProductionEvent.product === 'boat', null, { timeout: 10000 });
    await page.waitForFunction(() => Boolean(window.__wambasaRtsSetFishingZoneAmount), null, { timeout: 5000 });
    await page.evaluate(() => window.__wambasaRtsSetFishingZoneAmount?.('cod-bank', 20));

    let state = await getDebugState(page);
    expect(state.map.fishingZoneStates.find((zone) => zone.id === 'cod-bank')).toEqual(expect.objectContaining({ amount: 20, maxFish: 120 }));

    const boat = state.entities.find((entity) => entity.id === state.lastProductionEvent?.entityId);
    const boatScreen = await worldToScreen(page, boat?.x ?? PLAYER_DOCK.x, boat?.y ?? 350);
    await page.mouse.click(boatScreen.x, boatScreen.y);

    const fishingZone = await worldToScreen(page, SAFE_FISHING_ZONE.x, SAFE_FISHING_ZONE.y);
    await page.mouse.click(fishingZone.x, fishingZone.y, { button: 'right' });
    await page.waitForFunction(
      (boatId) => {
        const boatState = window.__wambasaRts?.entities.find((entity) => entity.id === boatId);
        return boatState?.fishing?.phase === 'fishing';
      },
      boat?.id,
      { timeout: 8000 },
    );
    await expect(page.locator('#selection-readout')).toContainText('Poor yield');

    await page.waitForFunction(
      (boatId) => {
        const boatState = window.__wambasaRts?.entities.find((entity) => entity.id === boatId);
        return boatState?.cargo?.kind === 'fish' && (boatState.cargo.amount ?? 0) > 0 && (boatState.cargo.amount ?? 0) < (boatState.cargo.capacity ?? 0) && !boatState.fishing && Boolean(boatState.unloadingFish);
      },
      boat?.id,
      { timeout: 8000 },
    );
    await expect(page.getByText('Sunlit Cod Bank is depleted. Returning partial catch to Dock.')).toBeVisible();

    await page.waitForFunction(
      (boatId) => {
        const event = window.__wambasaRts?.lastResourceEvent;
        return event?.entityId === boatId && event?.kind === 'fishSold';
      },
      boat?.id,
      { timeout: 12000 },
    );
    state = await getDebugState(page);
    expect(state.lastResourceEvent).toEqual(expect.objectContaining({ entityId: boat?.id, kind: 'fishSold', amount: expect.any(Number), cash: expect.any(Number) }));
    expect((state.lastResourceEvent?.amount ?? 0)).toBeGreaterThan(0);
    expect((state.lastResourceEvent?.amount ?? 0)).toBeLessThan(80);
    expect((state.lastResourceEvent?.cash ?? 0)).toBeGreaterThan(100);
    expect((state.lastResourceEvent?.cash ?? 0)).toBeLessThan(220);
    const amountAfterSale = state.map.fishingZoneStates.find((zone) => zone.id === 'cod-bank')?.amount ?? 0;
    expect(amountAfterSale).toBeLessThan(20);

    await page.waitForTimeout(3500);
    state = await getDebugState(page);
    expect((state.map.fishingZoneStates.find((zone) => zone.id === 'cod-bank')?.amount ?? 0)).toBeGreaterThan(amountAfterSale);
  });

  test('integrates metal funding into built Dock, boat production, fishing, and cash sale', async ({ page }) => {
    await page.goto('/');

    const worker = await worldToScreen(page, 850, 695);
    await page.mouse.click(worker.x, worker.y);
    await page.getByRole('button', { name: 'Plan Dock - 120 metal' }).click();
    const dockPlacement = await worldToScreen(page, 900, 500);
    await page.mouse.move(dockPlacement.x, dockPlacement.y);
    await page.mouse.click(dockPlacement.x, dockPlacement.y);
    await expect(page.getByText('Dock foundation started. Factory Worker is moving to build.')).toBeVisible();

    const truck = await worldToScreen(page, 480, 917);
    await page.mouse.click(truck.x, truck.y);
    const metalField = await worldToScreen(page, 370, 980);
    await page.mouse.click(metalField.x, metalField.y, { button: 'right' });
    await expect(page.getByText('Harvest command queued for 1 truck.')).toBeVisible();

    await page.waitForFunction(
      () =>
        window.__wambasaRts?.entities.some((entity) => entity.kind === 'dock' && entity.name === 'Working Dock' && entity.construction?.complete) &&
        (window.__wambasaRts?.resources.metal ?? 0) >= 220,
      null,
      { timeout: 15000 },
    );

    let state = await getDebugState(page);
    const builtDock = state.entities.find((entity) => entity.kind === 'dock' && entity.name === 'Working Dock' && entity.construction?.complete);
    expect(builtDock).toEqual(expect.objectContaining({ commandable: true }));
    expect(state.resources.metal).toBeGreaterThanOrEqual(220);

    const builtDockScreen = await worldToScreen(page, builtDock?.x ?? 900, builtDock?.y ?? 500);
    await page.mouse.click(builtDockScreen.x, builtDockScreen.y);
    await page.getByRole('button', { name: 'Build Fishing Boat - 100 metal + 25 cash' }).click();
    await expect(page.locator('#dock-production-readout')).toContainText('Fishing Boat');

    await page.waitForFunction(() => window.__wambasaRts?.lastProductionEvent?.kind === 'spawned' && window.__wambasaRts.lastProductionEvent.product === 'boat', null, { timeout: 10000 });
    state = await getDebugState(page);
    const boat = state.entities.find((entity) => entity.id === state.lastProductionEvent?.entityId);
    expect(boat).toEqual(expect.objectContaining({ kind: 'boat', cargo: { kind: 'fish', amount: 0, capacity: 80 } }));

    const boatScreen = await worldToScreen(page, boat?.x ?? 876, boat?.y ?? 382);
    await page.mouse.click(boatScreen.x, boatScreen.y);
    const fishingZone = await worldToScreen(page, 1585, 285);
    await page.mouse.click(fishingZone.x, fishingZone.y, { button: 'right' });
    await page.waitForFunction(
      (boatId) => {
        const boatState = window.__wambasaRts?.entities.find((entity) => entity.id === boatId);
        return boatState?.cargo?.kind === 'fish' && boatState.cargo.amount === boatState.cargo.capacity && !boatState.fishing;
      },
      boat?.id,
      { timeout: 12000 },
    );

    const unloadDockScreen = await worldToScreen(page, builtDock?.x ?? 900, builtDock?.y ?? 500);
    await page.mouse.click(unloadDockScreen.x, unloadDockScreen.y, { button: 'right' });
    await expect(page.getByText('Fish unload command queued for 1 boat.')).toBeVisible();

    await page.waitForFunction(() => window.__wambasaRts?.resources.cash === 235, null, { timeout: 8000 });
    state = await getDebugState(page);
    expect(state.resources.cash).toBe(235);
    expect(state.resources.metal).toBeGreaterThanOrEqual(80);
    expect(state.lastResourceEvent).toEqual(expect.objectContaining({ kind: 'fishSold', amount: 80, cash: 235 }));
    await expect(page.locator('#economy-readout')).toContainText('Cash: 235');
  });
});

test.describe('Epic 6 AI rival foundation', () => {
  test('spawns AI rival economy state, command center, workers, hauler, and base area', async ({ page }) => {
    await page.goto('/');

    const state = await getDebugState(page);
    expect(state.ai).toEqual(
      expect.objectContaining({
        metal: 280,
        cash: 100,
        commandCenterId: 'enemy-factory',
        unitIds: expect.arrayContaining(['enemy-factory', 'enemy-worker-1', 'enemy-truck-1']),
        baseArea: expect.objectContaining({ id: 'enemy-base', owner: 'enemy' }),
      }),
    );
    expect(state.resources.fields).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'enemy-metal', amount: 1600 })]));
    expect(state.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'enemy-factory',
          kind: 'enemyFactory',
          faction: 'enemy',
          commandable: false,
          health: 900,
          dropOff: ['metal'],
        }),
        expect.objectContaining({
          id: 'enemy-worker-1',
          kind: 'worker',
          faction: 'enemy',
          commandable: false,
          movementState: 'idle',
        }),
        expect.objectContaining({
          id: 'enemy-truck-1',
          kind: 'truck',
          faction: 'enemy',
          commandable: false,
          cargo: { kind: 'metal', amount: 0, capacity: 100 },
        }),
        expect.objectContaining({
          id: 'enemy-guard-1',
          kind: 'guard',
          faction: 'enemy',
          commandable: false,
        }),
      ]),
    );
  });

  test('clicking rival units reveals enemy readout without granting player commands', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__wambasaRtsSelectEntity), null, { timeout: 5000 });
    const selected = await page.evaluate(() => window.__wambasaRtsSelectEntity?.('enemy-guard-1') ?? false);
    expect(selected).toBe(true);

    await expect(page.locator('#selection-readout')).toContainText('Rival Guard (enemy)');
    await expect(page.locator('#worker-command-panel')).toBeHidden();
    await expect(page.locator('#factory-command-panel')).toBeHidden();
    await expect(page.locator('#dock-command-panel')).toBeHidden();

    const state = await getDebugState(page);
    expect(state.selectedEntityIds).toEqual(['enemy-guard-1']);
    expect(state.entities.find((entity) => entity.id === 'enemy-guard-1')).toEqual(expect.objectContaining({ commandable: false }));
  });

  test('AI rival issues harvest through pathing and unloads metal into its own stockpile', async ({ page }) => {
    await page.goto('/');

    await page.waitForFunction(
      () => window.__wambasaRts?.entities.find((entity) => entity.id === 'enemy-truck-1')?.harvesting?.phase === 'to-field',
      null,
      { timeout: 13000 },
    );
    let state = await getDebugState(page);
    expect(state.entities.find((entity) => entity.id === 'enemy-truck-1')).toEqual(
      expect.objectContaining({
        movementState: 'moving',
        harvesting: expect.objectContaining({ fieldId: 'enemy-metal', phase: 'to-field' }),
      }),
    );

    await page.waitForFunction(
      () =>
        window.__wambasaRts?.ai.lastResourceEvent?.kind === 'metalUnloaded' &&
        (window.__wambasaRts.resources.fields.find((field) => field.id === 'enemy-metal')?.amount ?? 1600) < 1600,
      null,
      { timeout: 22000 },
    );
    state = await getDebugState(page);
    expect(state.ai.lastResourceEvent).toEqual(expect.objectContaining({ entityId: 'enemy-truck-1', kind: 'metalUnloaded', amount: 100 }));
    expect(state.ai.metal).toBeGreaterThanOrEqual(0);
    expect(state.resources.fields.find((field) => field.id === 'enemy-metal')?.amount).toBeLessThan(1600);
    expect(state.entities.find((entity) => entity.id === 'enemy-truck-1')).toEqual(
      expect.objectContaining({
        cargo: { kind: 'metal', amount: 0, capacity: 100 },
      }),
    );
  });

  test('AI rival rebuilds a destroyed metal hauler through normal production', async ({ page }) => {
    await page.goto('/');

    await page.waitForFunction(() => Boolean(window.__wambasaRtsDamageEntity), null, { timeout: 5000 });
    const damaged = await page.evaluate(() => window.__wambasaRtsDamageEntity?.('enemy-truck-1', 999) ?? false);
    expect(damaged).toBe(true);

    await page.waitForFunction(
      () => window.__wambasaRts?.entities.find((entity) => entity.id === 'enemy-factory')?.productionQueue?.some((item) => item.product === 'truck'),
      null,
      { timeout: 13000 },
    );
    let state = await getDebugState(page);
    expect(state.entities.find((entity) => entity.id === 'enemy-factory')?.productionQueue).toEqual(
      expect.arrayContaining([expect.objectContaining({ product: 'truck' })]),
    );

    await page.waitForFunction(
      () => window.__wambasaRts?.entities.some((entity) => /^enemy-truck-/.test(entity.id) && entity.id !== 'enemy-truck-1' && entity.damageState === 'healthy'),
      null,
      { timeout: 9000 },
    );
    state = await getDebugState(page);
    const replacementId = state.entities.find((entity) => /^enemy-truck-/.test(entity.id) && entity.id !== 'enemy-truck-1' && entity.damageState === 'healthy')?.id;
    expect(replacementId).toMatch(/^enemy-truck-/);
    expect(replacementId).not.toBe('enemy-truck-1');
    expect(state.entities.find((entity) => entity.id === replacementId)).toEqual(
      expect.objectContaining({ kind: 'truck', faction: 'enemy', damageState: 'healthy' }),
    );
  });

  test('AI rival spends metal on production and spawns a new enemy worker', async ({ page }) => {
    await page.goto('/');

    await page.waitForFunction(
      () => window.__wambasaRts?.entities.find((entity) => entity.id === 'enemy-factory')?.productionQueue?.some((item) => item.product === 'worker'),
      null,
      { timeout: 13000 },
    );
    let state = await getDebugState(page);
    expect(state.entities.find((entity) => entity.id === 'enemy-factory')?.productionQueue).toEqual(
      expect.arrayContaining([
      expect.objectContaining({ product: 'worker', cost: 60 }),
      ]),
    );

    await page.waitForFunction(() => window.__wambasaRts?.ai.lastProductionEvent?.kind === 'spawned', null, { timeout: 9000 });
    state = await getDebugState(page);
    expect(state.ai.lastProductionEvent).toEqual(expect.objectContaining({ kind: 'spawned', product: 'worker' }));
    expect(state.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: state.ai.lastProductionEvent?.entityId,
          kind: 'worker',
          faction: 'enemy',
          commandable: false,
        }),
      ]),
    );
  });

  test('AI rival builds a dock, queues boat production, and spawns an enemy fishing boat', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Skirmish Shell' }).click();

    await page.waitForFunction(
      () => window.__wambasaRts?.entities.some((entity) => entity.id === 'enemy-dock' && entity.kind === 'dock' && entity.construction?.complete === false),
      null,
      { timeout: 14000 },
    );
    let state = await getDebugState(page);
    expect(state.entities.find((entity) => entity.id === 'enemy-dock')).toEqual(
      expect.objectContaining({
        kind: 'dock',
        faction: 'enemy',
        commandable: false,
        construction: expect.objectContaining({ building: 'dock', complete: false }),
      }),
    );
    expect(state.entities.some((entity) => entity.faction === 'enemy' && entity.kind === 'worker' && entity.buildJob?.siteId === 'enemy-dock')).toBe(true);
    expect(state.ai.unitIds).toContain('enemy-dock');

    await page.waitForFunction(
      () => window.__wambasaRts?.entities.some((entity) => entity.id === 'enemy-dock' && entity.kind === 'dock' && entity.construction?.complete === true),
      null,
      { timeout: 22000 },
    );

    await page.waitForFunction(
      () => window.__wambasaRts?.ai.lastProductionEvent?.kind === 'spawned' && window.__wambasaRts.ai.lastProductionEvent.product === 'boat',
      null,
      { timeout: 32000 },
    );
    state = await getDebugState(page);
    const enemyBoat = state.entities.find((entity) => entity.id === state.ai.lastProductionEvent?.entityId);
    expect(state.ai.lastProductionEvent).toEqual(expect.objectContaining({ kind: 'spawned', product: 'boat' }));
    expect(enemyBoat).toEqual(
      expect.objectContaining({
        kind: 'boat',
        faction: 'enemy',
        commandable: false,
        cargo: { kind: 'fish', amount: 0, capacity: 80 },
      }),
    );
    expect(enemyBoat?.y).toBeLessThan(500);
  });

  test('AI rival fishes and unloads cash without changing player cash', async ({ page }) => {
    await page.goto('/');

    await page.waitForFunction(() => (window.__wambasaRts?.ai.cash ?? 0) >= 160, null, { timeout: 42000 });
    const state = await getDebugState(page);
    const enemyBoat = state.entities.find((entity) => entity.id.startsWith('enemy-boat-') && entity.kind === 'boat' && entity.faction === 'enemy');

    expect(state.ai.cash).toBeGreaterThanOrEqual(160);
    expect(state.ai.lastResourceEvent).toEqual(expect.objectContaining({ kind: 'fishSold', amount: 80 }));
    expect(state.resources.cash).toBe(100);
    expect(state.match).toEqual(expect.objectContaining({ outcome: 'running', aiProfitTarget: 2000 }));
    await expect(page.locator('#match-result-panel')).toBeHidden();
    expect(enemyBoat).toEqual(
      expect.objectContaining({
        cargo: { kind: 'fish', amount: 0, capacity: 80 },
      }),
    );
    expect(enemyBoat?.unloadingFish).toBeUndefined();
  });

  test('AI rival guards respond to player raids and build a defensive tower', async ({ page }) => {
    await page.goto('/');

    const guard = await worldToScreen(page, 1480, 705);
    await page.mouse.click(guard.x, guard.y);
    const minimapBox = await page.locator('#rts-minimap').boundingBox();
    if (!minimapBox) {
      throw new Error('Expected minimap box.');
    }
    await page.mouse.click(minimapBox.x + minimapBox.width * (ENEMY_FACTORY.x / 3200), minimapBox.y + minimapBox.height * (ENEMY_FACTORY.y / 1400));
    const enemyFactory = await worldToScreen(page, ENEMY_FACTORY.x, ENEMY_FACTORY.y);
    await page.mouse.click(enemyFactory.x, enemyFactory.y, { button: 'right' });

    await page.waitForFunction(() => window.__wambasaRts?.ai.lastDefenseEvent?.kind === 'responding', null, { timeout: 9000 });
    let state = await getDebugState(page);
    expect(state.ai.lastDefenseEvent).toEqual(expect.objectContaining({ kind: 'responding', defenderId: 'enemy-guard-1', threatId: 'guard-1' }));
    expect(state.entities.find((entity) => entity.id === 'enemy-guard-1')?.attack).toEqual(expect.objectContaining({ targetId: 'guard-1' }));

    await page.waitForFunction(() => window.__wambasaRts?.entities.some((entity) => entity.id === 'enemy-guard-tower'), null, { timeout: 9000 });
    state = await getDebugState(page);
    expect(state.entities.find((entity) => entity.id === 'enemy-guard-tower')).toEqual(
      expect.objectContaining({
        kind: 'guardTower',
        faction: 'enemy',
        commandable: false,
        construction: expect.objectContaining({ building: 'guardTower', complete: true }),
      }),
    );
  });

  test('enemy command center destruction ends the match in victory', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Skirmish Shell' }).click();

    await page.waitForFunction(() => Boolean(window.__wambasaRtsDamageEntity), null, { timeout: 5000 });
    await page.waitForFunction(
      () => window.__wambasaRts?.entities.some((entity) => entity.factoryDuty?.factoryId === 'enemy-factory'),
      null,
      { timeout: 5000 },
    );
    const destroyedCrew = await page.evaluate(() => {
      const crewBefore = window.__wambasaRts?.entities
        .filter((entity) => entity.factoryDuty?.factoryId === 'enemy-factory')
        .map((entity) => entity.id) ?? [];
      const damaged = window.__wambasaRtsDamageEntity?.('enemy-factory', 9999) ?? false;
      const crewAfter = window.__wambasaRts?.entities
        .filter((entity) => crewBefore.includes(entity.id))
        .map((entity) => ({ id: entity.id, health: entity.health, damageState: entity.damageState, factoryDuty: entity.factoryDuty })) ?? [];
      return { damaged, crewBefore, crewAfter };
    });
    await page.waitForFunction(() => window.__wambasaRts?.match.outcome === 'victory', null, { timeout: 5000 });

    const state = await getDebugState(page);
    expect(destroyedCrew.damaged).toBe(true);
    expect(destroyedCrew.crewBefore.length).toBeGreaterThan(0);
    expect(destroyedCrew.crewAfter).toEqual(
      destroyedCrew.crewBefore.map((id) => expect.objectContaining({ id, health: 0, damageState: 'destroyed', factoryDuty: undefined })),
    );
    expect(state.match).toEqual(expect.objectContaining({ outcome: 'victory', reason: 'Enemy command center destroyed.' }));
    await expect(page.locator('#match-result-title')).toHaveText('Victory');
    await expect(page.locator('#match-result-reason')).toHaveText('Enemy command center destroyed.');
    await expect(page.locator('#match-result-advice')).toContainText('keep the pressure on damaged production hubs');
  });

  test('player command center destruction ends the match in defeat', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Skirmish Shell' }).click();
    await page.waitForFunction(() => Boolean(window.__wambasaRtsDamageEntity), null, { timeout: 5000 });
    await page.evaluate(() => window.__wambasaRtsDamageEntity?.('player-factory', 9999));
    await page.waitForFunction(() => window.__wambasaRts?.match.outcome === 'defeat', null, { timeout: 5000 });

    const state = await getDebugState(page);
    expect(state.match).toEqual(expect.objectContaining({ outcome: 'defeat', reason: 'Factory Command Center destroyed.' }));
    await expect(page.locator('#match-result-title')).toHaveText('Defeat');
    await expect(page.locator('#match-result-reason')).toHaveText('Factory Command Center destroyed.');
    await expect(page.locator('#match-result-advice')).toContainText('build defenses earlier');
  });

  test('player loses when no recoverable economy path remains', async ({ page }) => {
    await page.goto('/');
    const barracks = await worldToScreen(page, PLAYER_BARRACKS.x, PLAYER_BARRACKS.y);
    await page.mouse.click(barracks.x, barracks.y);
    await page.getByRole('button', { name: 'Build Guard - 90 metal + 15 cash' }).click();
    await page.getByRole('button', { name: 'Build Saboteur - 110 metal + 25 cash' }).click();
    await expect(page.locator('#economy-readout')).toHaveText('Metal: 80 | Cash: 60 | Crew: 6/6');

    await page.waitForFunction(() => Boolean(window.__wambasaRtsDamageEntity), null, { timeout: 5000 });
    await page.evaluate(() => {
      window.__wambasaRtsDamageEntity?.('truck-1', 9999);
      window.__wambasaRtsDamageEntity?.('player-dock', 9999);
    });
    await page.waitForFunction(() => window.__wambasaRts?.match.reason === 'No recoverable economy path remains.', null, { timeout: 5000 });

    const state = await getDebugState(page);
    expect(state.match).toEqual(expect.objectContaining({ outcome: 'defeat', reason: 'No recoverable economy path remains.' }));
    await expect(page.locator('#match-result-title')).toHaveText('Defeat');
    await expect(page.locator('#match-result-reason')).toHaveText('No recoverable economy path remains.');
    await expect(page.locator('#match-result-advice')).toContainText('protect at least one truck or dock line');
  });

  test('AI rival emits a raid warning and sends a raider at exposed player economy', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(1500);
    let state = await getDebugState(page);
    expect(state.ai.lastRaidEvent).toBeUndefined();
    expect(state.balance.aiFirstRaidGraceSeconds).toBe(20);

    await page.waitForFunction(() => Boolean(window.__wambasaRtsForceRaid), null, { timeout: 5000 });
    await page.evaluate(() => window.__wambasaRtsForceRaid?.());
    await page.waitForFunction(() => window.__wambasaRts?.ai.lastRaidEvent?.kind === 'damaged', null, { timeout: 7000 });
    await expect(page.locator('#boot-status')).toContainText('Warning: Metal Hauler is taking damage.');

    const minimapBox = await page.locator('#rts-minimap').boundingBox();
    if (!minimapBox) {
      throw new Error('Expected minimap box.');
    }
    await page.mouse.click(minimapBox.x + minimapBox.width * 0.92, minimapBox.y + minimapBox.height * 0.52);
    state = await getDebugState(page);
    expect(state.camera.x).toBeGreaterThan(1600);

    await page.locator('.rts-alert-item[data-message="Warning: Metal Hauler is taking damage."]').click();
    await expect(page.locator('#boot-status')).toContainText('Camera focused on alert: Warning: Metal Hauler is taking damage.');

    state = await getDebugState(page);
    expect(state.ai.lastRaidEvent).toEqual(expect.objectContaining({ kind: 'damaged', attackerId: 'enemy-worker-1', targetId: 'truck-1' }));
    expect(state.camera.x).toBeLessThan(100);
    expect(state.camera.y).toBeLessThanOrEqual(220);
    expect(state.alerts.find((alert) => alert.message === 'Warning: Metal Hauler is taking damage.')).toEqual(
      expect.objectContaining({ severity: 'warning', focusWorld: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }) }),
    );
    expect(state.entities.find((entity) => entity.id === 'enemy-worker-1')).toEqual(
      expect.objectContaining({
        movementState: 'idle',
        attack: expect.objectContaining({ targetId: 'truck-1', phase: 'attacking' }),
      }),
    );
    expect(state.entities.find((entity) => entity.id === 'truck-1')?.health).toBeLessThan(260);
  });

  test('AI raider reaches the exposed truck and applies damage', async ({ page }) => {
    await page.goto('/');

    await page.waitForFunction(() => Boolean(window.__wambasaRtsForceRaid), null, { timeout: 5000 });
    await page.evaluate(() => window.__wambasaRtsForceRaid?.());
    await page.waitForFunction(() => window.__wambasaRts?.ai.lastRaidEvent?.kind === 'damaged', null, { timeout: 16000 });
    const state = await getDebugState(page);
    const truck = state.entities.find((entity) => entity.id === 'truck-1');

    expect(state.ai.lastRaidEvent).toEqual(expect.objectContaining({ kind: 'damaged', attackerId: 'enemy-worker-1', targetId: 'truck-1' }));
    expect(truck?.health).toBeLessThan(260);
    expect(state.entities.find((entity) => entity.id === 'enemy-worker-1')?.attack).toEqual(
      expect.objectContaining({ targetId: 'truck-1', phase: 'attacking' }),
    );
  });

  test('AI rival launches a live opening raid without debug forcing after the grace window', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    const state = await getDebugState(page);
    expect(state.balance.aiFirstRaidGraceSeconds).toBe(20);

    await page.waitForFunction(
      () => ['queued', 'damaged', 'destroyed'].includes(window.__wambasaRts?.ai.lastRaidEvent?.kind ?? ''),
      null,
      { timeout: 45000 },
    );

    const afterRaid = await getDebugState(page);
    expect(afterRaid.ai.lastRaidEvent).toEqual(
      expect.objectContaining({
        attackerId: 'enemy-worker-1',
        targetId: expect.stringMatching(/truck-1|player-dock|player-factory/),
      }),
    );
    expect(afterRaid.alerts.some((alert) => /under attack|taking damage|incoming/i.test(alert.message))).toBe(true);
  });

  test('dock attack warnings are actionable and rate-limited against repeated forced raids', async ({ page }) => {
    await page.goto('/');

    await page.waitForFunction(() => Boolean(window.__wambasaRtsForceRaidTarget), null, { timeout: 5000 });
    await page.evaluate(() => {
      window.__wambasaRtsForceRaidTarget?.('player-dock');
      window.__wambasaRtsForceRaidTarget?.('player-dock');
      window.__wambasaRtsForceRaidTarget?.('player-dock');
    });

    await expect(page.locator('#boot-status')).toContainText('Warning: Working Dock is taking damage.');
    let state = await getDebugState(page);
    const dockWarningAlerts = state.alerts.filter((alert) => alert.message === 'Warning: Working Dock is taking damage.');
    expect(dockWarningAlerts).toHaveLength(1);
    expect(dockWarningAlerts[0]).toEqual(expect.objectContaining({
      severity: 'warning',
      focusWorld: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
    }));

    const minimapBox = await page.locator('#rts-minimap').boundingBox();
    if (!minimapBox) {
      throw new Error('Expected minimap box.');
    }
    await page.mouse.click(minimapBox.x + minimapBox.width * 0.92, minimapBox.y + minimapBox.height * 0.52);
    state = await getDebugState(page);
    expect(state.camera.x).toBeGreaterThan(1600);

    await page.locator('.rts-alert-item[data-message="Warning: Working Dock is taking damage."]').click();
    await expect(page.locator('#boot-status')).toContainText('Camera focused on alert: Warning: Working Dock is taking damage.');
    state = await getDebugState(page);
    expect(state.camera.x).toBeGreaterThan(450);
    expect(state.camera.x).toBeLessThan(850);
    expect(state.camera.y).toBeLessThanOrEqual(260);
  });
});

test.describe('Epic 7 combat foundation', () => {
  test('initializes a selectable player guard as a combat unit', async ({ page }) => {
    await page.goto('/');

    const state = await getDebugState(page);
    expect(state.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'guard-1',
          name: 'Harbor Guard',
          kind: 'guard',
          faction: 'player',
          commandable: true,
          health: 210,
        }),
      ]),
    );

    const guard = await worldToScreen(page, 1480, 705);
    await page.mouse.click(guard.x, guard.y);
    await expect(page.locator('#selection-readout')).toContainText('Harbor Guard');
    await expect(page.locator('#selection-readout')).toContainText('Combat unit');
  });

  test('selected guard can arm Attack, get invalid-target feedback, and left-click an enemy target', async ({ page }) => {
    await page.goto('/');

    const guard = await worldToScreen(page, 1480, 705);
    await page.mouse.click(guard.x, guard.y);
    await expect(page.locator('#selection-readout')).toContainText('Right-click enemy to attack');
    await expect(page.locator('#selection-readout')).toContainText('Attack/T arms left-click target');
    await expect(page.locator('#command-hint')).toContainText('Guards: right-click enemies to attack');
    await expect(page.getByRole('button', { name: 'Attack Target (T)' })).toBeEnabled();

    await page.getByRole('button', { name: 'Attack Target (T)' }).click();
    await expect(page.getByText('Attack armed: left-click an enemy target.')).toBeVisible();
    await expect(page.locator('#command-hint')).toContainText('Attack armed.');

    const emptyGround = await worldToScreen(page, 1590, 860);
    await page.mouse.click(emptyGround.x, emptyGround.y);
    await expect(page.getByText('Attack target invalid: left-click an enemy unit or structure.')).toBeVisible();
    await expect(page.locator('#command-hint')).toContainText('Attack armed.');

    const minimapBox = await page.locator('#rts-minimap').boundingBox();
    if (!minimapBox) {
      throw new Error('Expected minimap box.');
    }
    await page.mouse.click(minimapBox.x + minimapBox.width * (ENEMY_SKIFF.x / 3200), minimapBox.y + minimapBox.height * (ENEMY_SKIFF.y / 1400));
    const enemySkiff = await worldToScreen(page, ENEMY_SKIFF.x, ENEMY_SKIFF.y);
    await page.mouse.click(enemySkiff.x, enemySkiff.y);
    await expect(page.getByText('Attack command queued for 1 guard.')).toBeVisible();

    let state = await getDebugState(page);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'attack', targetId: 'enemy-skiff' }));
    expect(state.entities.find((entity) => entity.id === 'guard-1')).toEqual(
      expect.objectContaining({
        movementState: 'moving',
        animationState: 'attack',
        animationProfile: 'humanoid',
        animationFrameCount: 4,
        attack: expect.objectContaining({ targetId: 'enemy-skiff', phase: 'to-target' }),
      }),
    );

    await page.waitForFunction(() => window.__wambasaRts?.lastCombatEvent?.kind === 'damaged', null, { timeout: 9000 });
    state = await getDebugState(page);
    expect(state.lastCombatEvent).toEqual(expect.objectContaining({ attackerId: 'guard-1', targetId: 'enemy-skiff', kind: 'damaged' }));
    expect(state.entities.find((entity) => entity.id === 'enemy-skiff')?.health).toBeLessThan(220);
    expect(state.entities.find((entity) => entity.id === 'guard-1')?.attack).toEqual(
      expect.objectContaining({ targetId: 'enemy-skiff', phase: 'attacking' }),
    );
    expect(state.entities.find((entity) => entity.id === 'guard-1')).toEqual(expect.objectContaining({ animationState: 'attack' }));
    await expect(page.locator('#selection-readout')).toContainText('Target Rival Skiff');
  });

  test('guard attack mode shows hover targeting and range preview for valid enemy targets', async ({ page }) => {
    await page.goto('/');

    const guard = await worldToScreen(page, PLAYER_GUARD.x, PLAYER_GUARD.y);
    await page.mouse.click(guard.x, guard.y);
    await page.getByRole('button', { name: 'Attack Target (T)' }).click();

    const minimapBox = await page.locator('#rts-minimap').boundingBox();
    if (!minimapBox) {
      throw new Error('Expected minimap box.');
    }
    await page.mouse.click(minimapBox.x + minimapBox.width * (ENEMY_SKIFF.x / 3200), minimapBox.y + minimapBox.height * (ENEMY_SKIFF.y / 1400));
    const enemySkiff = await worldToScreen(page, ENEMY_SKIFF.x, ENEMY_SKIFF.y);
    await page.mouse.move(enemySkiff.x, enemySkiff.y);

    await expect(page.locator('#command-hint')).toContainText('Valid enemy target acquired');
    const state = await getDebugState(page);
    expect(state.overlayLabels).toContain('combat-targeting-overlay');
    expect(state.combatPreview).toEqual(
      expect.objectContaining({
        active: true,
        hoveredEntityId: 'enemy-skiff',
        hoveredTargetValid: true,
        selectedAttackerIds: ['guard-1'],
        rangeCircleCount: 1,
      }),
    );
  });

  test('attack boat hover preview distinguishes valid enemy boats from invalid enemy buildings', async ({ page }) => {
    await page.goto('/');

    const dock = await worldToScreen(page, PLAYER_DOCK.x, PLAYER_DOCK.y);
    await page.mouse.click(dock.x, dock.y);
    await page.getByRole('button', { name: 'Build Attack Boat - 135 metal + 50 cash' }).click();

    await page.waitForFunction(() => window.__wambasaRts?.lastProductionEvent?.kind === 'spawned' && window.__wambasaRts.lastProductionEvent.product === 'attackBoat', null, { timeout: 11000 });
    let state = await getDebugState(page);
    const attackBoat = state.entities.find((entity) => entity.id === state.lastProductionEvent?.entityId);
    const attackBoatScreen = await worldToScreen(page, attackBoat?.x ?? PLAYER_DOCK.x, attackBoat?.y ?? 350);
    await page.mouse.click(attackBoatScreen.x, attackBoatScreen.y);

    const minimapBox = await page.locator('#rts-minimap').boundingBox();
    if (!minimapBox) {
      throw new Error('Expected minimap box.');
    }
    await page.mouse.click(minimapBox.x + minimapBox.width * 0.9, minimapBox.y + minimapBox.height * 0.7);

    const enemyFactory = await worldToScreen(page, ENEMY_FACTORY.x, ENEMY_FACTORY.y);
    await page.mouse.move(enemyFactory.x, enemyFactory.y);
    state = await getDebugState(page);
    expect(state.combatPreview).toEqual(
      expect.objectContaining({
        active: true,
        hoveredEntityId: 'enemy-factory',
        hoveredTargetValid: false,
        rangeCircleCount: 1,
      }),
    );

    await page.mouse.click(minimapBox.x + minimapBox.width * (ENEMY_SKIFF.x / 3200), minimapBox.y + minimapBox.height * (ENEMY_SKIFF.y / 1400));
    const enemySkiff = await worldToScreen(page, ENEMY_SKIFF.x, ENEMY_SKIFF.y);
    await page.mouse.move(enemySkiff.x, enemySkiff.y);
    state = await getDebugState(page);
    expect(state.combatPreview).toEqual(
      expect.objectContaining({
        active: true,
        hoveredEntityId: 'enemy-skiff',
        hoveredTargetValid: true,
        rangeCircleCount: 1,
      }),
    );
  });

  test('selected guard supports Stop, Hold Position, and Attack-Move tactical orders', async ({ page }) => {
    await page.goto('/');

    const guard = await worldToScreen(page, 1480, 705);
    await page.mouse.click(guard.x, guard.y);
    await expect(page.getByRole('button', { name: 'Stop (S)' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hold Position (H)' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Attack-Move (A)' })).toBeEnabled();

    const minimapBox = await page.locator('#rts-minimap').boundingBox();
    if (!minimapBox) {
      throw new Error('Expected minimap box.');
    }
    await page.mouse.click(minimapBox.x + minimapBox.width * (ENEMY_FACTORY.x / 3200), minimapBox.y + minimapBox.height * (ENEMY_FACTORY.y / 1400));
    const enemyFactory = await worldToScreen(page, ENEMY_FACTORY.x, ENEMY_FACTORY.y);
    await page.mouse.click(enemyFactory.x, enemyFactory.y, { button: 'right' });
    let state = await getDebugState(page);
    expect(state.entities.find((entity) => entity.id === 'guard-1')?.attack).toEqual(expect.objectContaining({ targetId: 'enemy-factory' }));

    await page.getByRole('button', { name: 'Stop (S)' }).click();
    await expect(page.getByText('Stop command issued to 1 unit.')).toBeVisible();
    state = await getDebugState(page);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'stop' }));
    expect(state.entities.find((entity) => entity.id === 'guard-1')).toEqual(expect.objectContaining({ movementState: 'idle', pathLength: 0, attack: undefined }));

    await page.getByRole('button', { name: 'Hold Position (H)' }).click();
    await expect(page.getByText('Hold Position issued to 1 guard.')).toBeVisible();
    state = await getDebugState(page);
    expect(state.entities.find((entity) => entity.id === 'guard-1')?.guardOrder).toEqual(expect.objectContaining({ mode: 'hold' }));

    await page.getByRole('button', { name: 'Attack-Move (A)' }).click();
    await expect(page.getByText('Attack-Move armed: left-click a land destination.')).toBeVisible();
    const attackMoveDestination = await worldToScreen(page, ENEMY_FACTORY.x, ENEMY_FACTORY.y);
    await page.mouse.click(attackMoveDestination.x, attackMoveDestination.y);
    await expect(page.getByText('Attack-Move queued for 1 guard.')).toBeVisible();
    await page.waitForFunction(() => Boolean(window.__wambasaRts?.entities.find((entity) => entity.id === 'guard-1')?.attack?.targetId), null, {
      timeout: 5000,
    });
    state = await getDebugState(page);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'attackMove' }));
    expect(state.entities.find((entity) => entity.id === 'guard-1')?.attack?.targetId).toBeTruthy();
  });

  test('damaged and destroyed states are exposed and destroyed buildings stop functioning', async ({ page }) => {
    await page.goto('/');

    const guard = await worldToScreen(page, 1480, 705);
    await page.mouse.click(guard.x, guard.y);

    const minimapBox = await page.locator('#rts-minimap').boundingBox();
    if (!minimapBox) {
      throw new Error('Expected minimap box.');
    }
    await page.mouse.click(minimapBox.x + minimapBox.width * (ENEMY_SHED.x / 3200), minimapBox.y + minimapBox.height * (ENEMY_SHED.y / 1400));
    const enemyShed = await worldToScreen(page, ENEMY_SHED.x, ENEMY_SHED.y);
    await page.mouse.click(enemyShed.x, enemyShed.y, { button: 'right' });
    await expect(page.getByText('Attack command queued for 1 guard.')).toBeVisible();

    await page.waitForFunction(
      () => ['damaged', 'critical'].includes(window.__wambasaRts?.entities.find((entity) => entity.id === 'enemy-shed')?.damageState ?? ''),
      null,
      { timeout: 10000 },
    );
    let state = await getDebugState(page);
    expect(state.entities.find((entity) => entity.id === 'enemy-shed')).toEqual(
      expect.objectContaining({
        commandable: false,
        damageState: expect.stringMatching(/damaged|critical/),
      }),
    );

    await page.waitForFunction(() => window.__wambasaRts?.entities.find((entity) => entity.id === 'enemy-shed')?.damageState === 'destroyed', null, {
      timeout: 12000,
    });
    state = await getDebugState(page);
    expect(state.lastCombatEvent).toEqual(expect.objectContaining({ kind: 'destroyed', attackerId: 'guard-1', targetId: 'enemy-shed', targetHealth: 0 }));
    expect(state.entities.find((entity) => entity.id === 'enemy-shed')).toEqual(
      expect.objectContaining({
        commandable: false,
        movementState: 'idle',
        pathLength: 0,
        health: 0,
        damageState: 'destroyed',
        animationState: 'destroyed',
        productionQueue: undefined,
      }),
    );
  });

  test('selected saboteur disables an enemy building and it later recovers', async ({ page }) => {
    await page.goto('/');

    const saboteur = await worldToScreen(page, 1600, 620);
    await page.mouse.click(saboteur.x, saboteur.y);
    await expect(page.locator('#selection-readout')).toContainText('Net-Cutter Saboteur');
    await expect(page.locator('#selection-readout')).toContainText('Sabotage unit');

    const minimapBox = await page.locator('#rts-minimap').boundingBox();
    if (!minimapBox) {
      throw new Error('Expected minimap box.');
    }
    await page.mouse.click(minimapBox.x + minimapBox.width * (ENEMY_FACTORY.x / 3200), minimapBox.y + minimapBox.height * (ENEMY_FACTORY.y / 1400));
    const enemyFactory = await worldToScreen(page, ENEMY_FACTORY.x, ENEMY_FACTORY.y);
    await page.mouse.click(enemyFactory.x, enemyFactory.y, { button: 'right' });
    await expect(page.getByText('Sabotage command queued for 1 saboteur.')).toBeVisible();

    let state = await getDebugState(page);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'sabotage', targetId: 'enemy-factory' }));
    expect(state.entities.find((entity) => entity.id === 'saboteur-1')).toEqual(
      expect.objectContaining({
        movementState: 'moving',
        animationState: 'sabotage',
        sabotage: expect.objectContaining({ targetId: 'enemy-factory', phase: 'to-target' }),
      }),
    );

    await page.waitForFunction(() => window.__wambasaRts?.lastSabotageEvent?.kind === 'disabled', null, { timeout: 7000 });
    state = await getDebugState(page);
    expect(state.lastSabotageEvent).toEqual(expect.objectContaining({ kind: 'disabled', saboteurId: 'saboteur-1', targetId: 'enemy-factory' }));
    expect(state.entities.find((entity) => entity.id === 'enemy-factory')?.disabledSeconds).toBeGreaterThan(0);
    expect(state.entities.find((entity) => entity.id === 'saboteur-1')?.sabotage).toBeUndefined();

    await page.waitForFunction(() => window.__wambasaRts?.lastSabotageEvent?.kind === 'recovered', null, { timeout: 9000 });
    state = await getDebugState(page);
    expect(state.entities.find((entity) => entity.id === 'enemy-factory')?.disabledSeconds).toBe(0);
    await expect(page.getByText('Rival Cannery recovered from sabotage.')).toBeVisible();
  });

  test('enemy right-click with non-combat units gives explicit attack feedback instead of silent move behavior', async ({ page }) => {
    await page.goto('/');

    const worker = await worldToScreen(page, 850, 695);
    await page.mouse.click(worker.x, worker.y);
    const minimapBox = await page.locator('#rts-minimap').boundingBox();
    if (!minimapBox) {
      throw new Error('Expected minimap box.');
    }
    await page.mouse.click(minimapBox.x + minimapBox.width * (ENEMY_FACTORY.x / 3200), minimapBox.y + minimapBox.height * (ENEMY_FACTORY.y / 1400));
    const enemyFactory = await worldToScreen(page, ENEMY_FACTORY.x, ENEMY_FACTORY.y);
    await page.mouse.click(enemyFactory.x, enemyFactory.y, { button: 'right' });

    const state = await getDebugState(page);
    expect(state.lastCommandResult).not.toEqual(expect.objectContaining({ ok: true, kind: 'move' }));
    expect(state.entities.find((entity) => entity.id === 'worker-2')).toEqual(
      expect.objectContaining({
        movementState: 'idle',
        attack: undefined,
      }),
    );
  });

  test('saboteur right-click on enemy unit explains valid sabotage targets', async ({ page }) => {
    await page.goto('/');

    const saboteur = await worldToScreen(page, 1600, 620);
    await page.mouse.click(saboteur.x, saboteur.y);
    const minimapBox = await page.locator('#rts-minimap').boundingBox();
    if (!minimapBox) {
      throw new Error('Expected minimap box.');
    }
    await page.mouse.click(minimapBox.x + minimapBox.width * (ENEMY_WORKER.x / 3200), minimapBox.y + minimapBox.height * (ENEMY_WORKER.y / 1400));
    const enemyWorker = await worldToScreen(page, ENEMY_WORKER.x, ENEMY_WORKER.y);
    await page.mouse.click(enemyWorker.x, enemyWorker.y, { button: 'right' });

    await expect(page.getByText('Saboteurs can only target enemy buildings. Select guards to attack enemy units and boats.')).toBeVisible();
    const state = await getDebugState(page);
    expect(state.entities.find((entity) => entity.id === 'saboteur-1')).toEqual(
      expect.objectContaining({
        movementState: 'idle',
        sabotage: undefined,
      }),
    );
  });

  test('barracks trains a saboteur that can disable an enemy building', async ({ page }) => {
    await page.goto('/');
    const barracks = await worldToScreen(page, PLAYER_BARRACKS.x, PLAYER_BARRACKS.y);
    await page.mouse.click(barracks.x, barracks.y);

    await expect(page.getByRole('button', { name: 'Build Saboteur - 110 metal + 25 cash' })).toBeVisible();
    await page.getByRole('button', { name: 'Build Saboteur - 110 metal + 25 cash' }).click();

    await expect(page.locator('#economy-readout')).toHaveText('Metal: 170 | Cash: 75 | Crew: 6/6');
    await expect(page.locator('#barracks-production-readout')).toContainText('Saboteur');
    let state = await getDebugState(page);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'produce', product: 'saboteur' }));
    expect(state.lastProductionEvent).toEqual(expect.objectContaining({ kind: 'queued', product: 'saboteur', stockpile: 170 }));

    await page.waitForFunction(() => window.__wambasaRts?.lastProductionEvent?.kind === 'spawned' && window.__wambasaRts.lastProductionEvent.product === 'saboteur', null, {
      timeout: 5000,
    });
    state = await getDebugState(page);
    const saboteurId = state.lastProductionEvent?.entityId;
    expect(state.lastProductionEvent).toEqual(expect.objectContaining({ kind: 'spawned', product: 'saboteur' }));
    expect(state.entities.find((entity) => entity.id === saboteurId)).toEqual(
      expect.objectContaining({ kind: 'saboteur', faction: 'player', commandable: true }),
    );

    const saboteur = state.entities.find((entity) => entity.id === saboteurId);
    const saboteurScreen = await worldToScreen(page, saboteur?.x ?? 997, saboteur?.y ?? 950);
    await page.mouse.click(saboteurScreen.x, saboteurScreen.y);
    await expect(page.locator('#selection-readout')).toContainText('Saboteur');
    await expect(page.locator('#selection-readout')).toContainText('Sabotage unit');

    const minimapBox = await page.locator('#rts-minimap').boundingBox();
    if (!minimapBox) {
      throw new Error('Expected minimap box.');
    }
    await page.mouse.click(minimapBox.x + minimapBox.width * (ENEMY_FACTORY.x / 3200), minimapBox.y + minimapBox.height * (ENEMY_FACTORY.y / 1400));
    const enemyFactory = await worldToScreen(page, ENEMY_FACTORY.x, ENEMY_FACTORY.y);
    await page.mouse.click(enemyFactory.x, enemyFactory.y, { button: 'right' });
    await expect(page.getByText('Sabotage command queued for 1 saboteur.')).toBeVisible();

    state = await getDebugState(page);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'sabotage', targetId: 'enemy-factory' }));
    expect(state.entities.find((entity) => entity.id === saboteurId)?.sabotage).toEqual(expect.objectContaining({ targetId: 'enemy-factory' }));

    await page.waitForFunction(() => (window.__wambasaRts?.entities.find((entity) => entity.id === 'enemy-factory')?.disabledSeconds ?? 0) > 0, null, {
      timeout: 12000,
    });
    state = await getDebugState(page);
    expect(state.lastSabotageEvent).toEqual(expect.objectContaining({ kind: 'disabled', targetId: 'enemy-factory' }));
    expect(state.entities.find((entity) => entity.id === 'enemy-factory')?.disabledSeconds).toBeGreaterThan(0);
  });

  test('enemy boats can be sunk and stop carrying fish income', async ({ page }) => {
    await page.goto('/');

    const guard = await worldToScreen(page, 1480, 705);
    await page.mouse.click(guard.x, guard.y);

    const minimapBox = await page.locator('#rts-minimap').boundingBox();
    if (!minimapBox) {
      throw new Error('Expected minimap box.');
    }
    await page.mouse.click(minimapBox.x + minimapBox.width * (ENEMY_SKIFF.x / 3200), minimapBox.y + minimapBox.height * (ENEMY_SKIFF.y / 1400));
    const enemySkiff = await worldToScreen(page, ENEMY_SKIFF.x, ENEMY_SKIFF.y);
    await page.mouse.click(enemySkiff.x, enemySkiff.y, { button: 'right' });
    await expect(page.getByText('Attack command queued for 1 guard.')).toBeVisible();

    await page.waitForFunction(() => window.__wambasaRts?.entities.find((entity) => entity.id === 'enemy-skiff')?.damageState === 'destroyed', null, {
      timeout: 12000,
    });
    const state = await getDebugState(page);
    expect(state.lastCombatEvent).toEqual(expect.objectContaining({ kind: 'destroyed', attackerId: 'guard-1', targetId: 'enemy-skiff', targetHealth: 0 }));
    expect(state.entities.find((entity) => entity.id === 'enemy-skiff')).toEqual(
      expect.objectContaining({
        kind: 'boat',
        faction: 'enemy',
        commandable: false,
        movementState: 'idle',
        pathLength: 0,
        damageState: 'destroyed',
        cargo: { kind: 'fish', amount: 50, capacity: 80 },
        fishing: undefined,
        unloadingFish: undefined,
      }),
    );
  });

  test('workers can repair damaged friendly targets before destruction', async ({ page }) => {
    await page.goto('/');

    await page.waitForFunction(() => Boolean(window.__wambasaRtsForceRaid), null, { timeout: 5000 });
    await page.evaluate(() => window.__wambasaRtsForceRaid?.());
    await page.waitForFunction(() => window.__wambasaRts?.ai.lastRaidEvent?.kind === 'damaged', null, { timeout: 16000 });
    let state = await getDebugState(page);
    const damagedHealth = state.entities.find((entity) => entity.id === 'truck-1')?.health ?? 260;
    expect(damagedHealth).toBeLessThan(260);

    const worker = await worldToScreen(page, 760, 1000);
    await page.mouse.click(worker.x, worker.y);
    const truck = await worldToScreen(page, 480, 917);
    await page.mouse.click(truck.x, truck.y, { button: 'right' });
    await expect(page.getByLabel('success: Repair command queued for 1 worker.')).toBeVisible();

    state = await getDebugState(page);
    expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'repair', targetId: 'truck-1' }));
    expect(state.entities.find((entity) => entity.id === 'worker-1')?.repair).toEqual(expect.objectContaining({ targetId: 'truck-1', phase: 'to-target' }));
    expect(state.entities.find((entity) => entity.id === 'worker-1')).toEqual(expect.objectContaining({ animationState: 'repair' }));

    await page.waitForFunction(
      (previousHealth) => (window.__wambasaRts?.entities.find((entity) => entity.id === 'truck-1')?.health ?? 0) > previousHealth,
      damagedHealth,
      { timeout: 9000 },
    );
    state = await getDebugState(page);
    expect(state.lastRepairEvent).toEqual(expect.objectContaining({ workerId: 'worker-1', targetId: 'truck-1' }));
    expect(state.lastRepairEvent?.targetHealth).toBeGreaterThan(damagedHealth);
    expect(state.entities.find((entity) => entity.id === 'truck-1')?.damageState).not.toBe('destroyed');
  });

  test('completed Guard Tower automatically attacks enemy raiders in range', async ({ page }) => {
    await page.goto('/');

    const worker = await worldToScreen(page, 850, 695);
    await page.mouse.click(worker.x, worker.y);
    await page.getByRole('button', { name: 'Plan Guard Tower - 150 metal' }).click();

    const towerPlacement = await worldToScreen(page, 1100, 760);
    await page.mouse.move(towerPlacement.x, towerPlacement.y);
    await expect(page.locator('#placement-readout')).toContainText('Guard Tower foundation: valid');
    await page.mouse.click(towerPlacement.x, towerPlacement.y);

    await page.waitForFunction(
      () => window.__wambasaRts?.entities.some((entity) => entity.kind === 'guardTower' && entity.name === 'Guard Tower' && entity.construction?.complete),
      null,
      { timeout: 16000 },
    );

    await page.waitForFunction(() => Boolean(window.__wambasaRtsForceRaidTarget), null, { timeout: 5000 });
    await page.evaluate(() => window.__wambasaRtsForceRaidTarget?.('player-factory'));

    await page.waitForFunction(
      () => {
        const event = window.__wambasaRts?.lastCombatEvent;
        const target = window.__wambasaRts?.entities.find((entity) => entity.id === event?.targetId);
        return event?.attackerId?.startsWith('guardTower-site-') && target?.faction === 'enemy' && (target.health ?? 0) > 0;
      },
      null,
      { timeout: 12000 },
    );

    let state = await getDebugState(page);
    const tower = state.entities.find((entity) => entity.kind === 'guardTower' && entity.name === 'Guard Tower');
    const target = state.entities.find((entity) => entity.id === state.lastCombatEvent?.targetId);
    expect(state.lastCombatEvent).toEqual(expect.objectContaining({ kind: 'damaged', attackerId: tower?.id }));
    expect(target).toEqual(expect.objectContaining({ faction: 'enemy' }));
    expect(tower).toEqual(expect.objectContaining({ attack: expect.objectContaining({ targetId: target?.id, phase: 'attacking', range: 260 }) }));

    const towerScreen = await worldToScreen(page, tower?.x ?? 1100, tower?.y ?? 760);
    await page.mouse.click(towerScreen.x, towerScreen.y);
    await expect(page.locator('#selection-readout')).toContainText('Range 260');
    await expect(page.locator('#selection-readout')).toContainText(`Target ${target?.name}`);

    state = await getDebugState(page);
    expect(state.entities.find((entity) => entity.id === target?.id)?.health).toBeLessThan(target?.kind === 'boat' ? 52 : 210);
  });
});

test.describe('Epic 2 selection foundation', () => {
  test('initializes selectable worker and truck entities in game state', async ({ page }) => {
    await page.goto('/');

    const state = await getDebugState(page);
    expect(state.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'worker-1', kind: 'worker', faction: 'player', commandable: true, movementState: 'idle' }),
        expect.objectContaining({ id: 'worker-2', kind: 'worker', faction: 'player', commandable: true, movementState: 'idle' }),
        expect.objectContaining({ id: 'truck-1', kind: 'truck', faction: 'player', commandable: true, movementState: 'idle' }),
        expect.objectContaining({ id: 'player-factory', kind: 'factory', faction: 'player', commandable: true }),
      ]),
    );
  });

  test('selects a unit with left click and updates command UI plus overlay state', async ({ page }) => {
    await page.goto('/');
    const worker = await worldToScreen(page, 760, 1000);
    await page.mouse.click(worker.x, worker.y);

    await expect(page.locator('#selection-readout')).toContainText('Dockyard Worker');

    const afterSelect = await getDebugState(page);
    expect(afterSelect.selectedEntityIds).toEqual(['worker-1']);
    expect(afterSelect.overlayLabels).toContain('selection-rings-overlay');
    expect(afterSelect.objectives.items.find((objective) => objective.id === 'select')).toEqual(expect.objectContaining({ complete: true }));
    expect(afterSelect.objectives.currentId).toBe('harvest');
  });

  test('supports shift-select and drag-select for worker groups', async ({ page }) => {
    await page.goto('/');
    const workerOne = await worldToScreen(page, 760, 1000);
    const workerTwo = await worldToScreen(page, 850, 695);

    await page.mouse.click(workerOne.x, workerOne.y);
    await page.keyboard.down('Shift');
    await page.mouse.click(workerTwo.x, workerTwo.y);
    await page.keyboard.up('Shift');

    let state = await getDebugState(page);
    expect(state.selectedEntityIds.sort()).toEqual(['worker-1', 'worker-2']);

    const dragStart = await worldToScreen(page, 420, 650);
    const dragEnd = await worldToScreen(page, 900, 1045);
    await page.mouse.move(dragStart.x, dragStart.y);
    await page.mouse.down();
    await page.mouse.move(dragEnd.x, dragEnd.y, { steps: 8 });
    await page.mouse.up();

    state = await getDebugState(page);
    expect(state.selectedEntityIds.sort()).toEqual(['truck-1', 'worker-1', 'worker-2']);
    await expect(page.locator('#selection-readout')).toContainText('Metal Hauler');
  });

  test('right-click queues move command and selected unit begins moving', async ({ page }) => {
    await page.goto('/');
    const worker = await worldToScreen(page, 760, 1000);
    await page.mouse.click(worker.x, worker.y);

    const destination = await worldToScreen(page, 1010, 1000);
    await page.mouse.click(destination.x, destination.y, { button: 'right' });
    await expect(page.getByText('Move command queued for 1 unit.')).toBeVisible();

    const queued = await getDebugState(page);
    expect(queued.lastMoveCommand).toEqual(expect.objectContaining({ entityIds: ['worker-1'] }));
    expect(queued.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'move' }));
    expect(queued.entities.find((entity) => entity.id === 'worker-1')).toEqual(
      expect.objectContaining({
        movementState: 'moving',
        animationState: 'move',
        animationDirection: 'east',
        animationProfile: 'humanoid',
        animationFrameCount: 6,
        moveTarget: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      }),
    );

    await page.waitForFunction(() => {
      const workerState = window.__wambasaRts?.entities.find((entity) => entity.id === 'worker-1');
      return workerState?.animationState === 'move' && (workerState.animationFrame ?? 0) > 0;
    });
    const afterMove = await getDebugState(page);
    const movedWorker = afterMove.entities.find((entity) => entity.id === 'worker-1');
    expect(movedWorker?.x).toBeGreaterThan(760);
    expect(movedWorker?.animationFrame).toBeGreaterThan(0);
  });

  test('rejects invalid move commands with readable feedback', async ({ page }) => {
    await page.goto('/');
    const worker = await worldToScreen(page, 760, 1000);
    await page.mouse.click(worker.x, worker.y);

    const water = await worldToScreen(page, 900, 330);
    await page.mouse.click(water.x, water.y, { button: 'right' });

    await expect(page.getByText('Move rejected: that destination is water or blocked terrain.')).toBeVisible();
    await expect(page.locator('.rts-alert-item[data-message="Move rejected: that destination is water or blocked terrain."]')).toBeVisible();
    const state = await getDebugState(page);
    expect(state.lastCommandResult).toEqual(
      expect.objectContaining({ ok: false, kind: 'move', reason: 'invalid-destination' }),
    );
    expect(state.alerts[0]).toEqual(
      expect.objectContaining({ message: 'Move rejected: that destination is water or blocked terrain.', severity: 'warning' }),
    );
    expect(state.entities.find((entity) => entity.id === 'worker-1')).toEqual(expect.objectContaining({ movementState: 'idle' }));
  });

  test('routes move commands around central blockers with a waypoint path', async ({ page }) => {
    await page.goto('/');
    const worker = await worldToScreen(page, 760, 1000);
    await page.mouse.click(worker.x, worker.y);

    const behindRocks = await worldToScreen(page, 1395, 1000);
    await page.mouse.click(behindRocks.x, behindRocks.y, { button: 'right' });

    const queued = await getDebugState(page);
    expect(queued.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'move' }));
    expect(queued.lastMoveCommand?.pathLength).toBeGreaterThan(2);

    const movingWorker = queued.entities.find((entity) => entity.id === 'worker-1');
    expect(movingWorker).toEqual(expect.objectContaining({ movementState: 'moving' }));
    expect(movingWorker?.pathLength).toBeGreaterThan(1);
  });

  test('reserves distinct destinations and keeps group-moved units separated', async ({ page }) => {
    await page.goto('/');
    const groupDestination = { x: 920, y: 1140 };

    const workerOne = await worldToScreen(page, 760, 1000);
    const workerTwo = await worldToScreen(page, 850, 695);
    const truck = await worldToScreen(page, 480, 917);

    await page.mouse.click(workerOne.x, workerOne.y);
    await page.keyboard.down('Shift');
    await page.mouse.click(workerTwo.x, workerTwo.y);
    await page.mouse.click(truck.x, truck.y);
    await page.keyboard.up('Shift');

    let state = await getDebugState(page);
    expect(state.selectedEntityIds.sort()).toEqual(['truck-1', 'worker-1', 'worker-2']);

    const destination = await worldToScreen(page, groupDestination.x, groupDestination.y);
    await page.mouse.click(destination.x, destination.y, { button: 'right' });

    state = await getDebugState(page);
    const selectedMovers = state.entities.filter((entity) => state.selectedEntityIds.includes(entity.id));
    expect(selectedMovers).toHaveLength(3);
    expect(selectedMovers.every((entity) => entity.movementState === 'moving' && entity.pathLength > 0)).toBe(true);
    const reservedTargets = selectedMovers.map((entity) => `${Math.round(entity.moveTarget?.x ?? 0)},${Math.round(entity.moveTarget?.y ?? 0)}`);
    expect(new Set(reservedTargets).size).toBe(selectedMovers.length);

    await page.waitForTimeout(1500);
    state = await getDebugState(page);
    expect(state.collision.mobileUnitCount).toBeGreaterThanOrEqual(3);

    const mobileUnits = state.entities.filter((entity) => ['truck-1', 'worker-1', 'worker-2'].includes(entity.id));
    for (let i = 0; i < mobileUnits.length; i += 1) {
      for (let j = i + 1; j < mobileUnits.length; j += 1) {
        const a = mobileUnits[i];
        const b = mobileUnits[j];
        const centerDistance = Math.hypot(a.x - b.x, a.y - b.y);
        expect(centerDistance).toBeGreaterThanOrEqual(a.collisionRadius + b.collisionRadius - 1);
      }
    }

    await page.waitForFunction(() => {
      const trackedIds = ['truck-1', 'worker-1', 'worker-2'];
      const tracked = window.__wambasaRts?.entities.filter((entity) => trackedIds.includes(entity.id)) ?? [];
      return tracked.length === trackedIds.length && tracked.every((entity) => entity.movementState === 'idle' && entity.pathLength === 0);
    }, undefined, { timeout: 12000 });

    state = await getDebugState(page);
    const settledUnits = state.entities.filter((entity) => ['truck-1', 'worker-1', 'worker-2'].includes(entity.id));
    expect(settledUnits.every((entity) => entity.movementState === 'idle' && entity.pathLength === 0)).toBe(true);
    for (const entity of settledUnits) {
      expect(Math.hypot(entity.x - groupDestination.x, entity.y - groupDestination.y)).toBeLessThanOrEqual(112);
    }
  });
});
