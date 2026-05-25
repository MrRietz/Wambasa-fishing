import { buildingCatalog } from '../data/buildings';
import { GUARD_TOWER_RANGE } from '../config/constants';
import { formatTechUpgradeCost, getTechUpgradeCost, techUpgradeCatalog, type TechUpgradeKind } from '../data/upgrades';
import { formatProductionCost, productionCatalog, type ProductionKind } from '../data/production';
import type { DamageState, GameEntity, MatchState, MatchStats, PlacementMode } from '../entities/components';
import type { AlertSeverity, RtsDebugState } from '../debug/debugState';
import { describePlacementReason } from '../map/buildPlacement';
import type { FishingZoneData } from '../map/mapTypes';
import type { FishingZoneState } from '../map/mapTypes';
import { REEL_BUILD_SECONDS } from '../simulation/systems/factoryReelSystem';
import type { RtsDomElements } from './domShell';

export interface RecentAlert {
  id: number;
  message: string;
  severity: AlertSeverity;
  focusWorld?: { x: number; y: number };
}

export interface ResourceInspectionReadout {
  kind: 'metal' | 'fish';
  text: string;
}

export function renderAlertFeedPanel(
  alertFeedElement: HTMLDivElement,
  recentAlerts: RecentAlert[],
  focusAlert?: (alertId: number) => void,
): void {
  alertFeedElement.replaceChildren();
  const urgentAlerts = recentAlerts.filter((alert) => alert.severity === 'warning' || alert.severity === 'error');
  const fallbackAlerts = recentAlerts.filter((alert) => alert.severity === 'success' || alert.severity === 'info');
  const visibleAlerts = urgentAlerts.length > 0 ? urgentAlerts.slice(0, 2) : fallbackAlerts.slice(0, 1);
  for (const alert of visibleAlerts) {
    const item = document.createElement('div');
    item.className = 'rts-alert-item';
    item.dataset.severity = alert.severity;
    item.dataset.message = alert.message;
    item.dataset.focusable = String(Boolean(alert.focusWorld));
    item.setAttribute('aria-label', `${alert.severity}: ${alert.message}`);
    item.textContent = `${alert.severity.toUpperCase()}:`;
    if (alert.focusWorld && focusAlert) {
      item.tabIndex = 0;
      item.role = 'button';
      item.title = 'Focus camera on alert';
      item.addEventListener('click', () => focusAlert(alert.id));
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          focusAlert(alert.id);
        }
      });
    }
    alertFeedElement.append(item);
  }
  const hiddenCount = recentAlerts.length - visibleAlerts.length;
  if (hiddenCount > 0 && urgentAlerts.length > 0) {
    const summary = document.createElement('div');
    summary.className = 'rts-alert-item';
    summary.dataset.severity = 'info';
    summary.dataset.message = `+${hiddenCount} more alerts`;
    summary.setAttribute('aria-label', `${hiddenCount} more alerts`);
    summary.textContent = 'INFO:';
    alertFeedElement.append(summary);
  }
}

export function renderMatchResultPanel(
  elements: Pick<RtsDomElements, 'resultPanelElement' | 'resultTitleElement' | 'resultReasonElement' | 'resultAdviceElement' | 'resultSummaryElement'>,
  matchState: MatchState,
  matchStats: MatchStats,
): void {
  elements.resultPanelElement.hidden = matchState.outcome === 'running';
  elements.resultPanelElement.dataset.outcome = matchState.outcome;
  elements.resultTitleElement.textContent =
    matchState.outcome === 'victory' ? 'Victory' : matchState.outcome === 'defeat' ? 'Defeat' : 'Skirmish Result';
  elements.resultReasonElement.textContent = matchState.reason;
  elements.resultAdviceElement.textContent = matchState.outcome === 'running' ? '' : getMatchRecommendation(matchState.reason, matchStats);
  renderMatchResultSummary(elements.resultSummaryElement, matchStats);
}

export function renderObjectiveList(
  objectiveListElement: HTMLOListElement,
  objectives: RtsDebugState['objectives'],
): void {
  objectiveListElement.replaceChildren();
  const activeObjective =
    objectives.items.find((objective) => objective.current)
    ?? objectives.items.find((objective) => !objective.complete)
    ?? objectives.items[objectives.items.length - 1];
  if (!activeObjective) return;

  const item = document.createElement('li');
  item.className = 'rts-objective-item';
  item.dataset.objectiveId = activeObjective.id;
  item.dataset.complete = String(activeObjective.complete);
  item.dataset.current = String(activeObjective.current);

  const title = document.createElement('span');
  title.className = 'rts-objective-title';
  title.textContent = `${activeObjective.complete ? 'Complete' : activeObjective.current ? 'Active' : 'Next'}: ${activeObjective.title}`;

  item.append(title);
  objectiveListElement.append(item);
}

export function renderEconomyReadout(
  economyElement: HTMLDivElement,
  economy: { metal: number; cash: number },
  crew: RtsDebugState['crew'],
): void {
  const reserved = crew.reserved ?? 0;
  const atCapacity = crew.used + reserved >= crew.capacity;
  const houseCapacity = Math.max(0, crew.capacity - 10);
  const houseCount = Math.floor(houseCapacity / buildingCatalog.house.capacityBonus);
  const crewValue = reserved > 0 ? `${crew.used}+${reserved}/${crew.capacity}` : `${crew.used}/${crew.capacity}`;
  economyElement.replaceChildren(
    createEconomySegment('Metal', String(economy.metal), 'metal'),
    createEconomySegment('Cash', String(economy.cash), 'cash'),
    createEconomySegment('Crew', crewValue, 'crew', reserved > 0 ? `${crew.used} active, ${reserved} queued` : 'Active units'),
    createEconomySegment(
      'Houses',
      atCapacity ? 'Build House' : `+${houseCapacity} cap`,
      'housing',
      atCapacity ? `+${buildingCatalog.house.capacityBonus} crew cap` : `${houseCount} built`,
      atCapacity ? 'warning' : undefined,
    ),
  );
}

export function renderSelectionReadout(
  selectionElement: HTMLDivElement,
  selected: GameEntity[],
  allEntities: GameEntity[],
  getDamageState: (entity: GameEntity) => DamageState | undefined,
  getFishingZone: (zoneId: string) => FishingZoneData | undefined,
  resourceInspection?: ResourceInspectionReadout | null,
): void {
  selectionElement.replaceChildren();
  if (selected.length === 0) {
    if (!resourceInspection) {
      selectionElement.hidden = true;
      selectionElement.dataset.selection = 'none';
      selectionElement.dataset.faction = 'none';
      return;
    }
    selectionElement.hidden = false;
    selectionElement.dataset.selection = resourceInspection ? resourceInspection.kind : 'none';
    selectionElement.dataset.faction = 'none';
    selectionElement.append(createEmptySelectionCard(resourceInspection));
    return;
  }

  selectionElement.hidden = false;
  selectionElement.dataset.faction =
    selected.every((entity) => entity.faction === 'player')
      ? 'player'
      : selected.every((entity) => entity.faction === 'enemy')
        ? 'enemy'
        : 'mixed';
  selectionElement.dataset.selection = selected.map((entity) => entity.id).join(',');
  if (selected.length === 1) {
    selectionElement.append(createSingleSelectionCard(selected[0], allEntities, getDamageState, getFishingZone));
    return;
  }

  selectionElement.append(createMultiSelectionCard(selected));
}

export function renderFactoryCommandPanel(
  elements: Pick<RtsDomElements, 'factoryCommandsElement' | 'productionElement' | 'workerButtonElement' | 'truckButtonElement' | 'sellReelsButtonElement' | 'toggleAutoSellButtonElement' | 'releaseFactoryCrewDecreaseButtonElement' | 'releaseFactoryCrewCountElement' | 'releaseFactoryCrewButtonElement' | 'releaseFactoryCrewIncreaseButtonElement' | 'factoryReelReadoutElement'>,
  factory: GameEntity | null,
  economy: { metal: number; cash: number },
  crew: { used: number; capacity: number; reserved?: number },
  assignedCrewCount = 0,
  requestedReleaseCount = assignedCrewCount,
): void {
  elements.factoryCommandsElement.hidden = !factory;
  const queue = factory?.economy?.productionQueue ?? [];
  const workshop = factory?.economy?.reelWorkshop;
  const clampedReleaseCount = assignedCrewCount <= 0 ? 0 : Math.max(1, Math.min(requestedReleaseCount, assignedCrewCount));
  renderProductionQueueReadout(elements.productionElement, queue, 'Factory queue empty');
  elements.factoryReelReadoutElement.textContent = getFactoryReelReadout(factory, workshop, assignedCrewCount);
  elements.factoryReelReadoutElement.dataset.state = !factory
    ? 'hidden'
    : assignedCrewCount > 0
      ? 'producing'
      : 'idle';
  syncProductionButton(elements.workerButtonElement, 'Worker', productionCatalog.worker, economy, crew);
  syncProductionButton(elements.truckButtonElement, 'Truck', productionCatalog.truck, economy, crew);
  elements.sellReelsButtonElement.innerHTML = `Sell<br><span>${workshop?.reelInventory ?? 0} stored</span>`;
  elements.toggleAutoSellButtonElement.innerHTML = `Auto Sell<br><span>${workshop?.autoSell ? 'on' : 'off'}</span>`;
  elements.releaseFactoryCrewCountElement.innerHTML = assignedCrewCount <= 0
    ? 'Crew 0/10<br><span>Assign workers first</span>'
    : `Crew ${assignedCrewCount}/10<br><span>Releasing ${clampedReleaseCount}, keeping ${Math.max(0, assignedCrewCount - clampedReleaseCount)}</span>`;
  elements.releaseFactoryCrewButtonElement.innerHTML = assignedCrewCount <= 0
    ? 'Send Out<br><span>No crew inside</span>'
    : `Send ${clampedReleaseCount} Out<br><span>To rally point</span>`;
  elements.workerButtonElement.disabled = !factory || !canAffordProduction(economy, productionCatalog.worker, crew);
  elements.truckButtonElement.disabled = !factory || !canAffordProduction(economy, productionCatalog.truck, crew);
  elements.sellReelsButtonElement.disabled = !factory || (workshop?.reelInventory ?? 0) <= 0;
  elements.toggleAutoSellButtonElement.disabled = !factory;
  elements.releaseFactoryCrewDecreaseButtonElement.disabled = !factory || assignedCrewCount <= 1 || clampedReleaseCount <= 1;
  elements.releaseFactoryCrewButtonElement.disabled = !factory || assignedCrewCount <= 0;
  elements.releaseFactoryCrewIncreaseButtonElement.disabled = !factory || assignedCrewCount <= 1 || clampedReleaseCount >= assignedCrewCount;
}

function getFactoryReelReadout(
  factory: GameEntity | null,
  workshop: NonNullable<GameEntity['economy']>['reelWorkshop'] | undefined,
  assignedCrewCount: number,
): string {
  if (!factory) {
    return 'Reel workshop idle';
  }
  const stored = workshop?.reelInventory ?? 0;
  const autosell = workshop?.autoSell ? 'Auto-sell on' : 'Auto-sell off';
  if (assignedCrewCount <= 0) {
    return `Reel workshop idle | Assign workers to produce reels | Stored ${stored} | ${autosell}`;
  }
  const progress = Math.round(((workshop?.reelProgressSeconds ?? 0) / REEL_BUILD_SECONDS) * 100);
  return `Producing reels | Next reel ${progress}% | Crew ${assignedCrewCount}/10 | Stored ${stored} | ${autosell}`;
}

export function renderBarracksCommandPanel(
  elements: Pick<RtsDomElements, 'barracksCommandsElement' | 'guardButtonElement' | 'saboteurButtonElement' | 'barracksProductionElement'>,
  barracks: GameEntity | null,
  economy: { metal: number; cash: number },
  crew: { used: number; capacity: number; reserved?: number },
): void {
  elements.barracksCommandsElement.hidden = !barracks;
  const queue = barracks?.economy?.productionQueue ?? [];
  renderProductionQueueReadout(elements.barracksProductionElement, queue, 'Barracks queue empty');
  syncProductionButton(elements.guardButtonElement, 'Guard', productionCatalog.guard, economy, crew);
  syncProductionButton(elements.saboteurButtonElement, 'Saboteur', productionCatalog.saboteur, economy, crew);
  elements.guardButtonElement.disabled = !barracks || !canAffordProduction(economy, productionCatalog.guard, crew);
  elements.saboteurButtonElement.disabled = !barracks || !canAffordProduction(economy, productionCatalog.saboteur, crew);
}

export function renderDockCommandPanel(
  elements: Pick<RtsDomElements, 'dockCommandsElement' | 'dockProductionElement' | 'boatButtonElement' | 'attackBoatButtonElement'>,
  dock: GameEntity | null,
  economy: { metal: number; cash: number },
  crew: { used: number; capacity: number; reserved?: number },
): void {
  elements.dockCommandsElement.hidden = !dock;
  const queue = dock?.economy?.productionQueue ?? [];
  renderProductionQueueReadout(elements.dockProductionElement, queue, 'Dock queue empty');
  syncProductionButton(elements.boatButtonElement, 'Fishing Boat', productionCatalog.boat, economy, crew);
  elements.boatButtonElement.disabled = !dock || !canAffordProduction(economy, productionCatalog.boat, crew);
  syncProductionButton(elements.attackBoatButtonElement, 'Attack Boat', productionCatalog.attackBoat, economy, crew);
  elements.attackBoatButtonElement.disabled = !dock || !canAffordProduction(economy, productionCatalog.attackBoat, crew);
}

export function renderTechLabCommandPanel(
  elements: Pick<
    RtsDomElements,
    | 'techLabCommandsElement'
    | 'cncUpgradeButtonElement'
    | 'militaryUpgradeButtonElement'
    | 'boatsUpgradeButtonElement'
    | 'reelsUpgradeButtonElement'
    | 'techLabReadoutElement'
  >,
  techLab: GameEntity | null,
  economy: { metal: number; cash: number },
): void {
  elements.techLabCommandsElement.hidden = !techLab;
  const levels = techLab?.economy?.technologyLab?.levels ?? {};
  elements.techLabReadoutElement.textContent = techLab
    ? `CNC ${levels.cnc ?? 0}/3 | Military ${levels.military ?? 0}/3 | Boats ${levels.boats ?? 0}/3 | Reels ${levels.reels ?? 0}/3`
    : 'No research completed';
  syncUpgradeButton(elements.cncUpgradeButtonElement, 'cnc', levels.cnc ?? 0, economy);
  syncUpgradeButton(elements.militaryUpgradeButtonElement, 'military', levels.military ?? 0, economy);
  syncUpgradeButton(elements.boatsUpgradeButtonElement, 'boats', levels.boats ?? 0, economy);
  syncUpgradeButton(elements.reelsUpgradeButtonElement, 'reels', levels.reels ?? 0, economy);
}

export function renderWorkerCommandPanel(
  elements: Pick<
    RtsDomElements,
    | 'workerCommandsElement'
    | 'placeHouseButtonElement'
    | 'placeDockButtonElement'
    | 'placeGuardTowerButtonElement'
    | 'placeTechLabButtonElement'
    | 'placeBarracksButtonElement'
    | 'placeFactoryButtonElement'
    | 'assignFactoryCrewButtonElement'
    | 'equipReelButtonElement'
    | 'workerBuildDetailsElement'
    | 'placementElement'
  >,
  selectedWorkerCount: number,
  metal: number,
  placementMode: PlacementMode | null,
  factoryCrewTarget: GameEntity | null,
  availableReels: number,
): void {
  const workerSelected = selectedWorkerCount > 0;
  elements.workerCommandsElement.hidden = !workerSelected;
  elements.placeHouseButtonElement.disabled = !workerSelected || metal < buildingCatalog.house.cost;
  elements.placeDockButtonElement.disabled = !workerSelected || metal < buildingCatalog.dock.cost;
  elements.placeGuardTowerButtonElement.disabled = !workerSelected || metal < buildingCatalog.guardTower.cost;
  elements.placeTechLabButtonElement.disabled = !workerSelected || metal < buildingCatalog.techLab.cost;
  elements.placeBarracksButtonElement.disabled = !workerSelected || metal < buildingCatalog.barracks.cost;
  elements.placeFactoryButtonElement.disabled = !workerSelected || metal < buildingCatalog.factory.cost;
  elements.assignFactoryCrewButtonElement.disabled = !workerSelected || !factoryCrewTarget;
  elements.equipReelButtonElement.disabled = !workerSelected || availableReels <= 0;
  const houseCostLabel = `${buildingCatalog.house.cost} metal`;
  const houseReason = metal < buildingCatalog.house.cost ? `Need ${buildingCatalog.house.cost - metal} metal` : houseCostLabel;
  elements.placeHouseButtonElement.setAttribute('aria-label', `House - ${houseReason}`);
  elements.placeHouseButtonElement.title = `House - ${houseReason} | +${buildingCatalog.house.capacityBonus} crew cap`;
  elements.placeHouseButtonElement.innerHTML = `House<br><span>${houseReason}</span>`;
  elements.assignFactoryCrewButtonElement.innerHTML = `Crew<br><span>${factoryCrewTarget ? 'factory ready' : 'right-click factory'}</span>`;
  elements.equipReelButtonElement.innerHTML = `Reel<br><span>${availableReels} available</span>`;
  elements.workerBuildDetailsElement.textContent = workerSelected ? getWorkerBuildDetailsCopy(selectedWorkerCount, availableReels) : '';
  elements.placementElement.textContent = placementMode
    ? `${buildingCatalog[placementMode.building].label}: ${placementMode.valid ? 'ready' : describePlacementReason(placementMode.reason)} | ${getPlacementDetailsCopy(placementMode.building)}`
    : 'Placement idle';
}

export function renderTacticalCommandPanel(
  elements: Pick<RtsDomElements, 'tacticalCommandsElement' | 'stopButtonElement' | 'attackButtonElement' | 'holdButtonElement' | 'attackMoveButtonElement'>,
  selectedUnits: GameEntity[],
): void {
  const mobileUnits = selectedUnits.filter((entity) => entity.faction === 'player' && entity.commandable && entity.movement.speed > 0);
  const workers = mobileUnits.filter((entity) => entity.kind === 'worker');
  const guards = mobileUnits.filter((entity) => entity.kind === 'guard');
  const attackBoats = mobileUnits.filter((entity) => entity.kind === 'boat' && entity.economy?.combatRole === 'attack');
  elements.tacticalCommandsElement.hidden = mobileUnits.length === 0;
  elements.stopButtonElement.disabled = mobileUnits.length === 0;
  elements.attackButtonElement.disabled = workers.length === 0 && guards.length === 0 && attackBoats.length === 0;
  elements.holdButtonElement.disabled = guards.length === 0;
  elements.attackMoveButtonElement.disabled = guards.length === 0;
}

export function renderBuildingCommandPanel(
  elements: Pick<RtsDomElements, 'buildingCommandsElement' | 'sellBuildingButtonElement'>,
  building: GameEntity | null,
  getDamageState: (entity: GameEntity) => DamageState | undefined,
): void {
  elements.buildingCommandsElement.hidden = !building;
  if (!building) {
    return;
  }
  const buildingKind = isBuildingPlanKind(building.kind) ? building.kind : undefined;
  const definition = buildingKind ? buildingCatalog[buildingKind] : undefined;
  const underConstruction = Boolean(building.economy?.construction && !building.economy.construction.complete);
  const destroyed = getDamageState(building) === 'destroyed' || Boolean(building.economy?.destruction);
  const sellable = Boolean(definition?.sellable) && !underConstruction && !destroyed && building.commandable;
  const refund = definition ? Math.floor(definition.cost * definition.refundRate) : 0;
  const reason =
    !definition?.sellable
      ? 'protected'
      : underConstruction
        ? 'building'
        : destroyed
          ? 'removed'
          : `${refund} metal`;
  elements.sellBuildingButtonElement.disabled = !sellable;
  elements.sellBuildingButtonElement.title = sellable ? `Sell for ${refund} metal` : 'This building cannot be sold right now';
  elements.sellBuildingButtonElement.setAttribute('aria-label', sellable ? `Sell ${building.name} for ${refund} metal` : `Sell unavailable for ${building.name}`);
  elements.sellBuildingButtonElement.innerHTML = `Sell<br><span>${reason}</span>`;
}

function isBuildingPlanKind(kind: GameEntity['kind']): kind is keyof typeof buildingCatalog {
  return kind === 'house' || kind === 'dock' || kind === 'guardTower' || kind === 'techLab' || kind === 'barracks' || kind === 'factory';
}

function renderMatchResultSummary(resultSummaryElement: HTMLDListElement, matchStats: MatchStats): void {
  resultSummaryElement.replaceChildren();
  const rows: Array<[string, number]> = [
    ['Cash earned', matchStats.cashEarned],
    ['Fish sold', matchStats.fishSold],
    ['Metal harvested', matchStats.metalHarvested],
    ['Units lost', matchStats.playerUnitsLost],
    ['Buildings lost', matchStats.playerBuildingsLost],
    ['Rival assets destroyed', matchStats.enemyUnitsDestroyed + matchStats.enemyBuildingsDestroyed],
  ];
  for (const [label, value] of rows) {
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    detail.textContent = String(value);
    resultSummaryElement.append(term, detail);
  }
}

function getMatchRecommendation(reason: string, matchStats: MatchStats): string {
  const normalizedReason = reason.toLowerCase();
  if (reason.includes('All friendly units and buildings lost')) {
    return 'Recommendation: keep a reserve force and protect your economy so you do not lose the whole battlefield at once.';
  }
  if (reason.includes('Economic victory')) {
    return matchStats.cashEarned >= 1600
      ? 'Recommendation: pressure the rival sooner so your stronger economy converts into a faster battlefield win.'
      : 'Recommendation: add one more fishing or metal loop earlier and defend it long enough to lock the cash lead.';
  }
  if (normalizedReason.includes('enemy command center destroyed')) {
    return 'Recommendation: keep the pressure on damaged production hubs before the rival rebuilds.';
  }
  if (normalizedReason.includes('command center destroyed')) {
    return 'Recommendation: build defenses earlier and pull guards back before the command center is exposed.';
  }
  if (reason.includes('All rival units and buildings destroyed')) {
    return 'Recommendation: once you win the map, keep collapsing production and docks instead of only trading in the center.';
  }
  return 'Recommendation: stabilize your economy, then convert the extra income into defense or a focused attack timing.';
}

function createEconomySegment(label: string, value: string, tone: string, detail?: string, state?: 'warning'): HTMLSpanElement {
  const segment = document.createElement('span');
  segment.className = 'rts-economy-segment';
  segment.dataset.tone = tone;
  if (state) {
    segment.dataset.state = state;
  }
  segment.title = detail ? `${label}: ${value} (${detail})` : `${label}: ${value}`;

  const labelElement = document.createElement('span');
  labelElement.className = 'rts-economy-label';
  labelElement.textContent = label;

  const valueElement = document.createElement('span');
  valueElement.className = 'rts-economy-value';
  valueElement.textContent = value;

  segment.append(labelElement, valueElement);
  if (detail) {
    const detailElement = document.createElement('span');
    detailElement.className = 'rts-economy-detail';
    detailElement.textContent = detail;
    segment.append(detailElement);
  }
  return segment;
}

function createEmptySelectionCard(resourceInspection?: ResourceInspectionReadout | null): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'rts-selection-card';

  const title = document.createElement('div');
  title.className = 'rts-selection-name';
  title.textContent = resourceInspection ? 'Field Intel' : 'No Selection';

  const detail = document.createElement('div');
  detail.className = 'rts-selection-subtext';
  detail.textContent = resourceInspection?.text ?? 'Select a unit, building, or resource node. Hotkeys: F factory, R barracks, V dock.';

  card.append(title, detail);
  return card;
}

function createSingleSelectionCard(
  entity: GameEntity,
  allEntities: GameEntity[],
  getDamageState: (entity: GameEntity) => DamageState | undefined,
  getFishingZone: (zoneId: string) => FishingZoneData | undefined,
): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'rts-selection-card';

  const head = document.createElement('div');
  head.className = 'rts-selection-head';

  const name = document.createElement('div');
  name.className = 'rts-selection-name';
  name.textContent = entity.name;

  const badges = document.createElement('div');
  badges.className = 'rts-selection-badges';
  for (const label of getEntityBadges(entity, getDamageState)) {
    badges.append(createSelectionBadge(label));
  }
  head.append(name, badges);

  const guidanceText = getEntitySelectionGuidance(entity);
  const orderText = getEntityOrderText(entity, allEntities);
  const showGuidance = guidanceText.length > 0;
  const showOrder = !isLowValueOrderText(orderText);

  const guidance = document.createElement('div');
  guidance.className = 'rts-selection-guidance';
  guidance.textContent = guidanceText;

  const order = document.createElement('div');
  order.className = 'rts-selection-order';
  order.textContent = orderText;

  const stats = document.createElement('div');
  stats.className = 'rts-selection-stats';
  for (const stat of getEntityStatRows(entity, getFishingZone, getDamageState)) {
    const item = document.createElement('div');
    item.className = 'rts-selection-stat';
    item.textContent = stat;
    stats.append(item);
  }

  card.append(head);
  if (showGuidance) {
    card.append(guidance);
  }
  if (showOrder) {
    card.append(order);
  }
  card.append(stats);
  return card;
}

function createMultiSelectionCard(selected: GameEntity[]): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'rts-selection-card';

  const summary = document.createElement('div');
  summary.className = 'rts-selection-summary';
  summary.textContent = getSelectionSummary(selected);

  const badges = document.createElement('div');
  badges.className = 'rts-selection-badges';
  for (const status of getSelectionDetail(selected).split(' | ')) {
    if (status.trim().length > 0) {
      badges.append(createSelectionBadge(status));
    }
  }

  card.append(summary);
  if (badges.childElementCount > 0) {
    card.append(badges);
  }
  return card;
}

function createSelectionBadge(label: string): HTMLSpanElement {
  const badge = document.createElement('span');
  badge.className = 'rts-selection-badge';
  badge.textContent = label;
  return badge;
}

function getEntityBadges(entity: GameEntity, getDamageState: (entity: GameEntity) => DamageState | undefined): string[] {
  const badges = [entity.faction === 'player' ? 'Player' : 'Enemy', getEntityRoleLabel(entity)];
  const damageState = getDamageState(entity);
  if (damageState && damageState !== 'healthy') {
    badges.push(damageState[0].toUpperCase() + damageState.slice(1));
  }
  return badges;
}

function getEntityRoleLabel(entity: GameEntity): string {
  if (entity.kind === 'boat') {
    return entity.economy?.combatRole === 'attack' ? 'Attack Boat' : 'Fishing Boat';
  }
  if (entity.kind === 'guardTower') {
    return 'Defense Tower';
  }
  if (entity.kind === 'techLab') {
    return 'Tech Lab';
  }
  if (entity.kind === 'barracks') {
    return 'Barracks';
  }
  return formatKindLabel(entity.kind, 1).replace(/^./, (char) => char.toUpperCase());
}

function getEntitySelectionGuidance(entity: GameEntity): string {
  if (entity.kind === 'factory' || entity.kind === 'enemyFactory') {
    return 'Train units, manage reels, crew with workers, and use Return Workers to send selected crew back outside at the rally point.';
  }
  if (entity.kind === 'barracks') {
    return 'Train combat units, right-click terrain to set a rally point, and press R to cycle barracks.';
  }
  if (entity.kind === 'dock') {
    return 'Build boats, right-click water to set a rally point, and press V to cycle docks.';
  }
  if (entity.kind === 'techLab') {
    return 'Buy permanent upgrades below.';
  }
  if (entity.kind === 'guardTower') {
    return 'Auto-engages enemies in range and holds the shoreline.';
  }
  if (entity.kind === 'guard') {
    return 'Right-click attack. A attack-move. H hold.';
  }
  if (entity.kind === 'saboteur') {
    return 'Right-click enemy buildings to sabotage.';
  }
  if (entity.kind === 'worker') {
    return 'Build, repair, fish shore, crew a factory, or right-click enemies for melee.';
  }
  if (entity.kind === 'boat') {
    return entity.economy?.combatRole === 'attack'
      ? 'Right-click enemy boats to engage.'
      : 'Right-click fishing zones, then dock to unload.';
  }
  if (entity.kind === 'truck') {
    return 'Right-click a metal field to harvest.';
  }
  if (entity.kind === 'house') {
    return 'Expands crew capacity for your economy and army.';
  }
  return '';
}

function getEntityOrderText(entity: GameEntity, allEntities: GameEntity[]): string {
  if (entity.economy?.harvesting?.phase === 'to-field') return 'Harvesting metal';
  if (entity.economy?.harvesting?.phase === 'loading') return 'Loading ore';
  if (entity.economy?.harvesting?.phase === 'returning') return 'Returning ore to factory';
  if (entity.economy?.fishing?.phase === 'to-zone') return 'Sailing to fishing zone';
  if (entity.economy?.fishing?.phase === 'fishing') return 'Fishing';
  if (entity.economy?.shoreFishing?.phase === 'to-shore') return 'Moving to shoreline';
  if (entity.economy?.shoreFishing?.phase === 'fishing') return 'Shoreline fishing';
  if (entity.economy?.factoryDuty?.phase === 'to-factory') return 'Reporting to factory crew';
  if (entity.economy?.factoryDuty?.phase === 'producing') return 'Producing reels in factory';
  if (entity.economy?.unloadingFish) return 'Returning catch to bank';
  if (entity.economy?.dockRepair?.phase === 'to-dock') return 'Returning to dock for repair';
  if (entity.economy?.dockRepair?.phase === 'repairing') return 'Repairing at dock';
  if (entity.economy?.buildJob?.phase === 'to-site') return 'Moving to construction site';
  if (entity.economy?.buildJob?.phase === 'building') return 'Constructing';
  if (entity.economy?.attack) {
    const target = allEntities.find((candidate) => candidate.id === entity.economy?.attack?.targetId);
    return `${entity.economy.attack.phase === 'attacking' ? 'Attacking' : 'Moving to attack'}${target ? ` ${target.name}` : ''}`;
  }
  if (entity.economy?.guardOrder?.mode === 'hold') return 'Holding position';
  if (entity.economy?.guardOrder?.mode === 'attackMove') return 'Attack-moving';
  if (entity.economy?.sabotage?.phase === 'to-target') return 'Moving to sabotage';
  if (entity.economy?.sabotage?.phase === 'sabotaging') return 'Sabotaging target';
  if (entity.economy?.repair?.phase === 'to-target') return 'Moving to repair';
  if (entity.economy?.repair?.phase === 'repairing') return 'Repairing target';
  if (entity.economy?.productionQueue?.length) return `Producing ${entity.economy.productionQueue.length} queued`;
  if (entity.economy?.construction && !entity.economy.construction.complete) return 'Under construction';
  return entity.commandable ? 'Awaiting commands' : 'Passive structure';
}

function isLowValueOrderText(orderText: string): boolean {
  return orderText === 'Awaiting commands' || orderText === 'Passive structure';
}

function getEntityStatRows(
  entity: GameEntity,
  getFishingZone: (zoneId: string) => FishingZoneData | undefined,
  getDamageState: (entity: GameEntity) => DamageState | undefined,
): string[] {
  const stats: string[] = [];
  if (entity.economy?.health !== undefined) {
    const damageState = getDamageState(entity);
    stats.push(`HP ${Math.ceil(entity.economy.health)}${damageState && damageState !== 'healthy' ? ` ${damageState}` : ''}`);
  }
  if (entity.kind === 'guardTower') {
    stats.push(`Range ${GUARD_TOWER_RANGE}`);
  }
  if (entity.economy?.cargo) {
    stats.push(`Cargo ${entity.economy.cargo.amount}/${entity.economy.cargo.capacity}`);
  }
  const fishingZone =
    entity.economy?.fishing?.zoneId
      ? getFishingZone(entity.economy.fishing.zoneId)
      : entity.economy?.autoFishZoneId
        ? getFishingZone(entity.economy.autoFishZoneId)
        : undefined;
  if (fishingZone) {
    stats.push(fishingZone.label);
    stats.push(`${formatFishingZoneTier(fishingZone.tier)} | ${fishingZone.cashPerFish} cash/fish`);
  }
  if (entity.economy?.productionQueue) {
    stats.push(`Queue ${entity.economy.productionQueue.length}`);
  }
  if (entity.economy?.rallyPoint && (entity.kind === 'factory' || entity.kind === 'barracks' || entity.kind === 'dock')) {
    stats.push(`Rally ${Math.round(entity.economy.rallyPoint.x)},${Math.round(entity.economy.rallyPoint.y)}`);
  }
  if (entity.economy?.reelWorkshop) {
    stats.push(`Reels ${entity.economy.reelWorkshop.reelInventory}`);
  }
  if (entity.economy?.reelEquipped) {
    stats.push('Reel equipped');
  }
  if (entity.economy?.construction && !entity.economy.construction.complete) {
    stats.push(`Build ${Math.round((entity.economy.construction.progressSeconds / entity.economy.construction.totalSeconds) * 100)}%`);
  }
  return stats.slice(0, 4);
}

function getSelectionSummary(selected: GameEntity[]): string {
  const counts = new Map<string, number>();
  for (const entity of selected) {
    counts.set(entity.kind, (counts.get(entity.kind) ?? 0) + 1);
  }
  const labels = [...counts.entries()].map(([kind, count]) => `${count} ${formatKindLabel(kind, count)}`).join(' | ');
  return `${selected.length} units selected | ${labels}`;
}

function getSelectionDetail(selected: GameEntity[]): string {
  const statuses: string[] = [];
  const harvesting = selected.filter((entity) => entity.economy?.harvesting?.phase === 'to-field' || entity.economy?.harvesting?.phase === 'loading').length;
  const returningMetal = selected.filter((entity) => entity.economy?.harvesting?.phase === 'returning').length;
  const sailingToFish = selected.filter((entity) => entity.economy?.fishing?.phase === 'to-zone').length;
  const fishingNow = selected.filter((entity) => entity.economy?.fishing?.phase === 'fishing').length;
  const shoreFishing = selected.filter((entity) => entity.economy?.shoreFishing?.phase === 'fishing').length;
  const unloading = selected.filter((entity) => entity.economy?.unloadingFish).length;
  const repairing = selected.filter((entity) => entity.economy?.repair || entity.economy?.dockRepair).length;
  const attacking = selected.filter((entity) => entity.economy?.attack).length;
  const building = selected.filter((entity) => entity.economy?.buildJob).length;
  const factoryCrew = selected.filter((entity) => entity.economy?.factoryDuty).length;
  const reelEquipped = selected.filter((entity) => entity.economy?.reelEquipped).length;
  const cargoAmount = selected.reduce((sum, entity) => sum + (entity.economy?.cargo?.amount ?? 0), 0);
  const cargoCapacity = selected.reduce((sum, entity) => sum + (entity.economy?.cargo?.capacity ?? 0), 0);

  if (harvesting > 0) statuses.push(`${harvesting} harvesting`);
  if (returningMetal > 0) statuses.push(`${returningMetal} returning ore`);
  if (sailingToFish > 0) statuses.push(`${sailingToFish} sailing to fish`);
  if (fishingNow > 0) statuses.push(`${fishingNow} fishing`);
  if (shoreFishing > 0) statuses.push(`${shoreFishing} shore fishing`);
  if (unloading > 0) statuses.push(`${unloading} unloading`);
  if (repairing > 0) statuses.push(`${repairing} repairing`);
  if (attacking > 0) statuses.push(`${attacking} attacking`);
  if (building > 0) statuses.push(`${building} building`);
  if (factoryCrew > 0) statuses.push(`${factoryCrew} factory crew`);
  if (reelEquipped > 0) statuses.push(`${reelEquipped} reel equipped`);
  if (cargoCapacity > 0) statuses.push(`cargo ${cargoAmount}/${cargoCapacity}`);

  return statuses.length > 0 ? statuses.join(' | ') : 'Awaiting orders';
}

function formatKindLabel(kind: string, count: number): string {
  const singular =
    kind === 'guardTower' ? 'tower'
    : kind === 'enemyFactory' ? 'factory'
    : kind === 'techLab' ? 'tech lab'
    : kind === 'barracks' ? 'barracks'
    : kind;
  if (count === 1) {
    return singular;
  }
  if (singular === 'factory') return 'factories';
  if (singular === 'house') return 'houses';
  return `${singular}s`;
}

function getWorkerBuildDetailsCopy(selectedWorkerCount: number, availableReels: number): string {
  return `${selectedWorkerCount} worker${selectedWorkerCount === 1 ? '' : 's'} | reels ${availableReels}`;
}

function renderProductionQueueReadout(
  element: HTMLDivElement,
  queue: Array<{ product: ProductionKind; remainingSeconds: number }>,
  emptyLabel: string,
): void {
  element.replaceChildren();
  element.classList.add('rts-queue-readout');
  if (queue.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'rts-queue-empty';
    empty.textContent = emptyLabel;
    element.append(empty);
    return;
  }

  queue.forEach((item, index) => {
    const chip = document.createElement('span');
    chip.className = 'rts-queue-chip';
    chip.textContent = `${index + 1} ${shortProductionLabel(item.product)} ${Math.ceil(item.remainingSeconds * 10) / 10}s`;
    chip.title = `${productionCatalog[item.product].label} - ${formatProductionCost(productionCatalog[item.product])}`;
    element.append(chip);
  });
}

function shortProductionLabel(product: ProductionKind): string {
  switch (product) {
    case 'worker':
      return 'Worker';
    case 'guard':
      return 'Guard';
    case 'saboteur':
      return 'Saboteur';
    case 'truck':
      return 'Truck';
    case 'boat':
      return 'Fishing Boat';
    case 'attackBoat':
      return 'Attack Boat';
  }
}

function canAffordProduction(
  economy: { metal: number; cash: number },
  definition: (typeof productionCatalog)[ProductionKind],
  crew: { used: number; capacity: number; reserved?: number },
): boolean {
  const reserved = crew.reserved ?? 0;
  const crewAvailable = crew.used + reserved + (definition.crewCost ?? 0) <= crew.capacity;
  return economy.metal >= definition.cost && economy.cash >= (definition.cashCost ?? 0) && crewAvailable;
}

function isFishingZoneState(zone: FishingZoneData): zone is FishingZoneState {
  return typeof (zone as Partial<FishingZoneState>).amount === 'number' && typeof zone.maxFish === 'number';
}

function syncProductionButton(
  button: HTMLButtonElement,
  label: string,
  definition: (typeof productionCatalog)[ProductionKind],
  economy: { metal: number; cash: number },
  crew: { used: number; capacity: number; reserved?: number },
): void {
  const costLabel = formatProductionCost(definition);
  const reserved = crew.reserved ?? 0;
  const missingCrew = Math.max(0, crew.used + reserved + (definition.crewCost ?? 0) - crew.capacity);
  const lacksCrew = missingCrew > 0;
  const lacksMetal = economy.metal < definition.cost;
  const lacksCash = economy.cash < (definition.cashCost ?? 0);
  const reason = lacksCrew
    ? `Need more houses for +${missingCrew} crew capacity`
    : lacksMetal || lacksCash
      ? `Need ${formatProductionCostShortfall(definition, economy)}`
      : costLabel;
  button.setAttribute('aria-label', `Build ${label} - ${reason}`);
  button.title = `${label} - ${reason}`;
  button.innerHTML = `${label}<br><span>${reason}</span>`;
}

function formatFishingZoneTier(tier: FishingZoneData['tier']): string {
  return tier === 'contested' ? 'Contested waters' : 'Safe waters';
}

function formatProductionCostShortfall(
  definition: (typeof productionCatalog)[ProductionKind],
  economy: { metal: number; cash: number },
): string {
  const missingMetal = Math.max(0, definition.cost - economy.metal);
  const missingCash = Math.max(0, (definition.cashCost ?? 0) - economy.cash);
  if (missingMetal > 0 && missingCash > 0) {
    return `${missingMetal} metal + ${missingCash} cash`;
  }
  if (missingCash > 0) {
    return `${missingCash} cash`;
  }
  return `${missingMetal} metal`;
}

function getPlacementDetailsCopy(building: PlacementMode['building']): string {
  if (building === 'house') {
    return `${buildingCatalog.house.cost} metal | ${buildingCatalog.house.seconds.toFixed(1)}s build | +${buildingCatalog.house.capacityBonus} crew cap`;
  }
  if (building === 'dock') {
    return `${buildingCatalog.dock.cost} metal | ${buildingCatalog.dock.seconds.toFixed(1)}s build | shoreline only | unlocks boats`;
  }
  if (building === 'techLab') {
    return `${buildingCatalog.techLab.cost} metal | ${buildingCatalog.techLab.seconds.toFixed(1)}s build | unlocks permanent upgrades`;
  }
  if (building === 'barracks') {
    return `${buildingCatalog.barracks.cost} metal | ${buildingCatalog.barracks.seconds.toFixed(1)}s build | trains guards and saboteurs`;
  }
  if (building === 'factory') {
    return `${buildingCatalog.factory.cost} metal | ${buildingCatalog.factory.seconds.toFixed(1)}s build | drop-off + worker/truck production`;
  }
  return `${buildingCatalog.guardTower.cost} metal | ${buildingCatalog.guardTower.seconds.toFixed(1)}s build | ${GUARD_TOWER_RANGE} range | targets enemy raiders`;
}

function syncUpgradeButton(
  button: HTMLButtonElement,
  kind: TechUpgradeKind,
  currentLevel: number,
  economy: { metal: number; cash: number },
): void {
  const definition = techUpgradeCatalog[kind];
  const maxed = currentLevel >= definition.maxLevel;
  const nextCost = getTechUpgradeCost(kind, currentLevel);
  const costLabel = maxed ? 'Maxed' : formatTechUpgradeCost(nextCost);
  button.setAttribute('aria-label', `${definition.label} - ${costLabel}`);
  button.title = `${definition.label} - ${definition.description}`;
  button.innerHTML = `${definition.label}<br><span>${maxed ? 'Max level' : `Lv ${currentLevel + 1}: ${costLabel}`}</span>`;
  button.disabled = maxed || economy.metal < nextCost.metal || economy.cash < nextCost.cash;
}
