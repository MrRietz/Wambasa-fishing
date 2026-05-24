import { buildingCatalog } from '../data/buildings';
import { formatProductionCost, productionCatalog } from '../data/production';
import type { AlertSeverity, RtsDebugState } from '../debug/debugState';
import type { DamageState, GameEntity, MatchOutcome, MatchState, MatchStats, PlacementMode } from '../entities/components';
import type { FishingZoneData } from '../map/mapTypes';
import type { RtsDomElements } from './domShell';
import {
  renderAlertFeedPanel,
  renderDockCommandPanel,
  renderEconomyReadout,
  renderBarracksCommandPanel,
  renderBuildingCommandPanel,
  renderFactoryCommandPanel,
  renderMatchResultPanel,
  renderObjectiveList,
  renderSelectionReadout,
  renderTacticalCommandPanel,
  renderTechLabCommandPanel,
  renderWorkerCommandPanel,
  type RecentAlert,
  type ResourceInspectionReadout,
} from './panels';

export interface HudPresentationInput {
  pauseMenuOpen: boolean;
  placementMode: PlacementMode | null;
  attackTargetPlacement: boolean;
  attackMovePlacement: boolean;
  combatPreviewTargetId?: string;
  combatPreviewTargetValid: boolean;
  selected: GameEntity[];
}

export interface HudPresentation {
  commandHint: string;
  viewportMode: string;
  viewportHotkeys: string;
}

export interface HudSelectionRenderInput extends HudPresentationInput {
  allEntities: GameEntity[];
  getDamageState: (entity: GameEntity) => DamageState | undefined;
  getFishingZone: (zoneId: string) => FishingZoneData | undefined;
  resourceInspection?: ResourceInspectionReadout | null;
  economy: { metal: number; cash: number };
  crew: RtsDebugState['crew'] & { reserved?: number };
  selectedFactory: GameEntity | null;
  factoryCrewTarget: GameEntity | null;
  selectedDock: GameEntity | null;
  selectedBarracks: GameEntity | null;
  selectedTechLab: GameEntity | null;
  selectedBuilding: GameEntity | null;
  selectedWorkerCount: number;
  selectedFactoryCrewCount: number;
  selectedFactoryReleaseCount: number;
  availableReels: number;
}

export interface HudEconomyRenderInput {
  economy: { metal: number; cash: number };
  crew: RtsDebugState['crew'] & { reserved?: number };
  selectedFactory: GameEntity | null;
  factoryCrewTarget: GameEntity | null;
  selectedDock: GameEntity | null;
  selectedBarracks: GameEntity | null;
  selectedTechLab: GameEntity | null;
  selectedBuilding: GameEntity | null;
  selectedWorkerCount: number;
  selectedFactoryCrewCount: number;
  selectedFactoryReleaseCount: number;
  availableReels: number;
  placementMode: PlacementMode | null;
}

export interface PauseHudState {
  outcome: MatchOutcome;
  pauseMenuOpen: boolean;
  skirmishStarted: boolean;
}

const DEFAULT_HOTKEYS = 'LMB Select | RMB Order | A Attack-Move | T Attack | H Hold | S Stop';

export function buildHudPresentation(input: HudPresentationInput): HudPresentation {
  if (input.pauseMenuOpen) {
    return {
      commandHint: 'Paused. Resume to keep issuing orders.',
      viewportMode: 'Paused',
      viewportHotkeys: 'Esc or Resume to continue',
    };
  }

  if (input.placementMode) {
    return {
      commandHint: `${buildingCatalog[input.placementMode.building].label}: left-click place, right-click cancel.`,
      viewportMode: `Build: ${buildingCatalog[input.placementMode.building].label}`,
      viewportHotkeys: 'LMB Confirm placement | RMB/Esc Cancel',
    };
  }

  if (input.attackTargetPlacement) {
    if (input.combatPreviewTargetId) {
      return {
        commandHint: input.combatPreviewTargetValid
          ? 'Attack armed. Left-click confirm, right-click cancel.'
          : 'Attack armed. Selected force cannot hit this target.',
        viewportMode: input.combatPreviewTargetValid ? 'Attack target locked' : 'Attack targeting',
        viewportHotkeys: 'LMB Confirm attack | RMB/Esc Cancel',
      };
    }

    return {
      commandHint: 'Attack armed. Left-click an enemy target, right-click cancel.',
      viewportMode: 'Attack targeting',
      viewportHotkeys: 'LMB Pick target | RMB/Esc Cancel',
    };
  }

  if (input.attackMovePlacement) {
    return {
      commandHint: 'Attack-Move armed. Left-click ground, right-click cancel.',
      viewportMode: 'Attack-move targeting',
      viewportHotkeys: 'LMB Confirm destination | RMB/Esc Cancel',
    };
  }

  const hasGuard = input.selected.some((entity) => entity.kind === 'guard');
  const hasSaboteur = input.selected.some((entity) => entity.kind === 'saboteur');
  const hasWorker = input.selected.some((entity) => entity.kind === 'worker');
  const hasBoat = input.selected.some((entity) => entity.kind === 'boat');
  const hasTruck = input.selected.some((entity) => entity.kind === 'truck');
  const hasFactory = input.selected.some((entity) => entity.kind === 'factory');
  const hasDock = input.selected.some((entity) => entity.kind === 'dock');
  const hasBarracks = input.selected.some((entity) => entity.kind === 'barracks');
  const hasTechLab = input.selected.some((entity) => entity.kind === 'techLab');

  if (hasFactory) {
    return {
      commandHint: `Assign workers to factory crew to produce reels. Sell stored reels or enable auto-sell for cash. Workers cost ${formatProductionCost(productionCatalog.worker)}; trucks cost ${formatProductionCost(productionCatalog.truck)}.`,
      viewportMode: 'Factory selected',
      viewportHotkeys: DEFAULT_HOTKEYS,
    };
  }

  if (hasBarracks) {
    return {
      commandHint: `Guards cost ${formatProductionCost(productionCatalog.guard)}. Saboteurs cost ${formatProductionCost(productionCatalog.saboteur)}.`,
      viewportMode: 'Barracks selected',
      viewportHotkeys: DEFAULT_HOTKEYS,
    };
  }

  if (hasDock) {
    return {
      commandHint: '',
      viewportMode: 'Dock selected',
      viewportHotkeys: DEFAULT_HOTKEYS,
    };
  }

  if (hasTechLab) {
    return {
      commandHint: '',
      viewportMode: 'Tech Lab selected',
      viewportHotkeys: DEFAULT_HOTKEYS,
    };
  }

  if (hasGuard) {
    return {
      commandHint: '',
      viewportMode: 'Combat group selected',
      viewportHotkeys: DEFAULT_HOTKEYS,
    };
  }

  if (hasSaboteur) {
    return {
      commandHint: '',
      viewportMode: 'Saboteur selected',
      viewportHotkeys: DEFAULT_HOTKEYS,
    };
  }

  if (hasWorker) {
    return {
      commandHint: '',
      viewportMode: 'Worker selected',
      viewportHotkeys: DEFAULT_HOTKEYS,
    };
  }

  if (hasBoat) {
    const hasAttackBoat = input.selected.some((entity) => entity.kind === 'boat' && entity.economy?.combatRole === 'attack');
    return {
      commandHint: '',
      viewportMode: hasAttackBoat ? 'Naval combat selected' : 'Fishing group selected',
      viewportHotkeys: DEFAULT_HOTKEYS,
    };
  }

  if (hasTruck) {
    return {
      commandHint: '',
      viewportMode: 'Harvest group selected',
      viewportHotkeys: DEFAULT_HOTKEYS,
    };
  }

  return {
    commandHint: 'Select a unit or building. Right-click to order.',
    viewportMode: 'Command online',
    viewportHotkeys: DEFAULT_HOTKEYS,
  };
}

export function createHudPresenter(
  rootElement: HTMLElement,
  elements: Pick<
    RtsDomElements,
    | 'commandHintElement'
    | 'alertFeedElement'
    | 'selectionElement'
    | 'viewportHudElement'
    | 'viewportModeElement'
    | 'viewportSelectionElement'
    | 'viewportHotkeyElement'
    | 'economyElement'
    | 'factoryCommandsElement'
    | 'workerButtonElement'
    | 'truckButtonElement'
    | 'sellReelsButtonElement'
    | 'toggleAutoSellButtonElement'
    | 'releaseFactoryCrewDecreaseButtonElement'
    | 'releaseFactoryCrewCountElement'
    | 'releaseFactoryCrewButtonElement'
    | 'releaseFactoryCrewIncreaseButtonElement'
    | 'productionElement'
    | 'factoryReelReadoutElement'
    | 'barracksCommandsElement'
    | 'guardButtonElement'
    | 'saboteurButtonElement'
    | 'barracksProductionElement'
    | 'dockCommandsElement'
    | 'boatButtonElement'
    | 'attackBoatButtonElement'
    | 'dockProductionElement'
    | 'techLabCommandsElement'
    | 'cncUpgradeButtonElement'
    | 'militaryUpgradeButtonElement'
    | 'boatsUpgradeButtonElement'
    | 'reelsUpgradeButtonElement'
    | 'techLabReadoutElement'
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
    | 'tacticalCommandsElement'
    | 'buildingCommandsElement'
    | 'sellBuildingButtonElement'
    | 'stopButtonElement'
    | 'attackButtonElement'
    | 'holdButtonElement'
    | 'attackMoveButtonElement'
    | 'resultPanelElement'
    | 'resultTitleElement'
    | 'resultReasonElement'
    | 'resultAdviceElement'
    | 'resultSummaryElement'
    | 'pausePanelElement'
    | 'skirmishButton'
    | 'pauseToggleButtonElement'
    | 'resumeButtonElement'
    | 'objectiveListElement'
  >,
) {
  function renderCommandPresentation(input: HudPresentationInput): void {
    const presentation = buildHudPresentation(input);
    elements.commandHintElement.textContent = presentation.commandHint;
    elements.commandHintElement.hidden = presentation.commandHint.length === 0;
    elements.viewportModeElement.textContent = presentation.viewportMode;
    elements.viewportHotkeyElement.textContent = presentation.viewportHotkeys;
  }

  function renderSelection(input: HudSelectionRenderInput): void {
    renderSelectionReadout(
      elements.selectionElement,
      input.selected,
      input.allEntities,
      input.getDamageState,
      input.getFishingZone,
      input.resourceInspection,
    );
    elements.viewportSelectionElement.textContent = summarizeViewportSelection(input.selected, input.resourceInspection);
    elements.viewportHudElement.dataset.selection =
      input.selected.length > 0 ? 'active' : input.resourceInspection?.kind ?? 'none';
    renderCommandPresentation(input);
    renderFactoryCommandPanel(
      {
        factoryCommandsElement: elements.factoryCommandsElement,
        productionElement: elements.productionElement,
        workerButtonElement: elements.workerButtonElement,
        truckButtonElement: elements.truckButtonElement,
        sellReelsButtonElement: elements.sellReelsButtonElement,
        toggleAutoSellButtonElement: elements.toggleAutoSellButtonElement,
        releaseFactoryCrewDecreaseButtonElement: elements.releaseFactoryCrewDecreaseButtonElement,
        releaseFactoryCrewCountElement: elements.releaseFactoryCrewCountElement,
        releaseFactoryCrewButtonElement: elements.releaseFactoryCrewButtonElement,
        releaseFactoryCrewIncreaseButtonElement: elements.releaseFactoryCrewIncreaseButtonElement,
        factoryReelReadoutElement: elements.factoryReelReadoutElement,
      },
      input.selectedFactory,
      input.economy,
      input.crew,
      input.selectedFactoryCrewCount,
      input.selectedFactoryReleaseCount,
    );
    renderBarracksCommandPanel(
      {
        barracksCommandsElement: elements.barracksCommandsElement,
        guardButtonElement: elements.guardButtonElement,
        saboteurButtonElement: elements.saboteurButtonElement,
        barracksProductionElement: elements.barracksProductionElement,
      },
      input.selectedBarracks,
      input.economy,
      input.crew,
    );
    renderDockCommandPanel(
      {
        dockCommandsElement: elements.dockCommandsElement,
        dockProductionElement: elements.dockProductionElement,
        boatButtonElement: elements.boatButtonElement,
        attackBoatButtonElement: elements.attackBoatButtonElement,
      },
      input.selectedDock,
      input.economy,
      input.crew,
    );
    renderWorkerCommandPanel(
      {
        workerCommandsElement: elements.workerCommandsElement,
        placeHouseButtonElement: elements.placeHouseButtonElement,
        placeDockButtonElement: elements.placeDockButtonElement,
        placeGuardTowerButtonElement: elements.placeGuardTowerButtonElement,
        placeTechLabButtonElement: elements.placeTechLabButtonElement,
        placeBarracksButtonElement: elements.placeBarracksButtonElement,
        placeFactoryButtonElement: elements.placeFactoryButtonElement,
        assignFactoryCrewButtonElement: elements.assignFactoryCrewButtonElement,
        equipReelButtonElement: elements.equipReelButtonElement,
        workerBuildDetailsElement: elements.workerBuildDetailsElement,
        placementElement: elements.placementElement,
      },
      input.selectedWorkerCount,
      input.economy.metal,
      input.placementMode,
      input.factoryCrewTarget,
      input.availableReels,
    );
    renderTechLabCommandPanel(
      {
        techLabCommandsElement: elements.techLabCommandsElement,
        cncUpgradeButtonElement: elements.cncUpgradeButtonElement,
        militaryUpgradeButtonElement: elements.militaryUpgradeButtonElement,
        boatsUpgradeButtonElement: elements.boatsUpgradeButtonElement,
        reelsUpgradeButtonElement: elements.reelsUpgradeButtonElement,
        techLabReadoutElement: elements.techLabReadoutElement,
      },
      input.selectedTechLab,
      input.economy,
    );
    renderTacticalCommandPanel(
      {
        tacticalCommandsElement: elements.tacticalCommandsElement,
        stopButtonElement: elements.stopButtonElement,
        attackButtonElement: elements.attackButtonElement,
        holdButtonElement: elements.holdButtonElement,
        attackMoveButtonElement: elements.attackMoveButtonElement,
      },
      input.selected,
    );
    renderBuildingCommandPanel(
      {
        buildingCommandsElement: elements.buildingCommandsElement,
        sellBuildingButtonElement: elements.sellBuildingButtonElement,
      },
      input.selectedBuilding,
      input.getDamageState,
    );
  }

  function renderEconomy(input: HudEconomyRenderInput): void {
    renderEconomyReadout(elements.economyElement, input.economy, input.crew);
    renderFactoryCommandPanel(
      {
        factoryCommandsElement: elements.factoryCommandsElement,
        productionElement: elements.productionElement,
        workerButtonElement: elements.workerButtonElement,
        truckButtonElement: elements.truckButtonElement,
        sellReelsButtonElement: elements.sellReelsButtonElement,
        toggleAutoSellButtonElement: elements.toggleAutoSellButtonElement,
        releaseFactoryCrewDecreaseButtonElement: elements.releaseFactoryCrewDecreaseButtonElement,
        releaseFactoryCrewCountElement: elements.releaseFactoryCrewCountElement,
        releaseFactoryCrewButtonElement: elements.releaseFactoryCrewButtonElement,
        releaseFactoryCrewIncreaseButtonElement: elements.releaseFactoryCrewIncreaseButtonElement,
        factoryReelReadoutElement: elements.factoryReelReadoutElement,
      },
      input.selectedFactory,
      input.economy,
      input.crew,
      input.selectedFactoryCrewCount,
      input.selectedFactoryReleaseCount,
    );
    renderBarracksCommandPanel(
      {
        barracksCommandsElement: elements.barracksCommandsElement,
        guardButtonElement: elements.guardButtonElement,
        saboteurButtonElement: elements.saboteurButtonElement,
        barracksProductionElement: elements.barracksProductionElement,
      },
      input.selectedBarracks,
      input.economy,
      input.crew,
    );
    renderDockCommandPanel(
      {
        dockCommandsElement: elements.dockCommandsElement,
        dockProductionElement: elements.dockProductionElement,
        boatButtonElement: elements.boatButtonElement,
        attackBoatButtonElement: elements.attackBoatButtonElement,
      },
      input.selectedDock,
      input.economy,
      input.crew,
    );
    renderWorkerCommandPanel(
      {
        workerCommandsElement: elements.workerCommandsElement,
        placeHouseButtonElement: elements.placeHouseButtonElement,
        placeDockButtonElement: elements.placeDockButtonElement,
        placeGuardTowerButtonElement: elements.placeGuardTowerButtonElement,
        placeTechLabButtonElement: elements.placeTechLabButtonElement,
        placeBarracksButtonElement: elements.placeBarracksButtonElement,
        placeFactoryButtonElement: elements.placeFactoryButtonElement,
        assignFactoryCrewButtonElement: elements.assignFactoryCrewButtonElement,
        equipReelButtonElement: elements.equipReelButtonElement,
        workerBuildDetailsElement: elements.workerBuildDetailsElement,
        placementElement: elements.placementElement,
      },
      input.selectedWorkerCount,
      input.economy.metal,
      input.placementMode,
      input.factoryCrewTarget,
      input.availableReels,
    );
    renderTechLabCommandPanel(
      {
        techLabCommandsElement: elements.techLabCommandsElement,
        cncUpgradeButtonElement: elements.cncUpgradeButtonElement,
        militaryUpgradeButtonElement: elements.militaryUpgradeButtonElement,
        boatsUpgradeButtonElement: elements.boatsUpgradeButtonElement,
        reelsUpgradeButtonElement: elements.reelsUpgradeButtonElement,
        techLabReadoutElement: elements.techLabReadoutElement,
      },
      input.selectedTechLab,
      input.economy,
    );
    renderBuildingCommandPanel(
      {
        buildingCommandsElement: elements.buildingCommandsElement,
        sellBuildingButtonElement: elements.sellBuildingButtonElement,
      },
      input.selectedBuilding,
      () => undefined,
    );
  }

  function renderAlerts(alerts: RecentAlert[], focusAlert?: (alertId: number) => void): void {
    renderAlertFeedPanel(elements.alertFeedElement, alerts, focusAlert);
  }

  function renderObjectives(objectives: RtsDebugState['objectives']): void {
    renderObjectiveList(elements.objectiveListElement, objectives);
  }

  function renderMatchResult(matchState: MatchState, matchStats: MatchStats): void {
    renderMatchResultPanel(
      {
        resultPanelElement: elements.resultPanelElement,
        resultTitleElement: elements.resultTitleElement,
        resultReasonElement: elements.resultReasonElement,
        resultAdviceElement: elements.resultAdviceElement,
        resultSummaryElement: elements.resultSummaryElement,
      },
      matchState,
      matchStats,
    );
  }

  function syncPause(state: PauseHudState): void {
    const canPause = state.outcome === 'running';
    const showMenu = canPause && (!state.skirmishStarted || state.pauseMenuOpen);
    elements.pausePanelElement.hidden = !showMenu;
    elements.pauseToggleButtonElement.disabled = !canPause;
    elements.pauseToggleButtonElement.textContent = state.pauseMenuOpen && canPause ? 'Resume' : 'Pause';
    elements.pauseToggleButtonElement.setAttribute('aria-pressed', state.pauseMenuOpen && canPause ? 'true' : 'false');
    elements.skirmishButton.hidden = state.skirmishStarted;
    elements.resumeButtonElement.hidden = !state.skirmishStarted;
    rootElement.dataset.paused = state.pauseMenuOpen && canPause ? 'true' : 'false';
    rootElement.dataset.menuOpen = showMenu ? 'true' : 'false';
  }

  return {
    renderAlerts,
    renderCommandPresentation,
    renderEconomy,
    renderMatchResult,
    renderObjectives,
    renderSelection,
    syncPause,
  };
}

function summarizeViewportSelection(selected: GameEntity[], resourceInspection?: ResourceInspectionReadout | null): string {
  if (selected.length === 0) {
    return resourceInspection?.text ?? 'No unit selected';
  }
  if (selected.length === 1) {
    const entity = selected[0];
    const role =
      entity.kind === 'boat'
        ? entity.economy?.combatRole === 'attack'
          ? 'Attack Boat'
          : 'Fishing Boat'
        : entity.kind === 'guardTower'
          ? 'Defense Tower'
          : entity.kind === 'barracks'
            ? 'Barracks'
          : entity.kind === 'techLab'
            ? 'Tech Lab'
          : entity.kind.replace(/^./, (char) => char.toUpperCase());
    return `${entity.name} | ${role}`;
  }
  const counts = new Map<string, number>();
  for (const entity of selected) {
    counts.set(entity.kind, (counts.get(entity.kind) ?? 0) + 1);
  }
  const summary = [...counts.entries()]
    .map(([kind, count]) => `${count} ${kind === 'guardTower' ? 'Tower' : kind === 'techLab' ? 'Tech Lab' : kind === 'barracks' ? 'Barracks' : kind.replace(/^./, (char) => char.toUpperCase())}`)
    .join(' | ');
  return `${selected.length} selected | ${summary}`;
}
