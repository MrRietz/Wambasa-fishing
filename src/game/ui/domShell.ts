export interface RtsDomElements {
  rootElement: HTMLElement;
  gameElement: HTMLDivElement;
  statusElement: HTMLParagraphElement;
  skirmishButton: HTMLButtonElement;
  pauseToggleButtonElement: HTMLButtonElement;
  mobileCommandTrayElement: HTMLDivElement;
  mobileSelectButtonElement: HTMLButtonElement;
  mobileSmartButtonElement: HTMLButtonElement;
  mobileMoveButtonElement: HTMLButtonElement;
  mobileAttackButtonElement: HTMLButtonElement;
  mobileMenuButtonElement: HTMLButtonElement;
  minimapElement: HTMLCanvasElement;
  minimapContext: CanvasRenderingContext2D;
  commandHintElement: HTMLDivElement;
  alertFeedElement: HTMLDivElement;
  selectionElement: HTMLDivElement;
  viewportHudElement: HTMLDivElement;
  viewportModeElement: HTMLDivElement;
  viewportSelectionElement: HTMLDivElement;
  viewportHotkeyElement: HTMLDivElement;
  economyElement: HTMLDivElement;
  musicSliderElement: HTMLInputElement;
  sfxSliderElement: HTMLInputElement;
  musicReadoutElement: HTMLSpanElement;
  sfxReadoutElement: HTMLSpanElement;
  uiScaleSliderElement: HTMLInputElement;
  uiScaleReadoutElement: HTMLSpanElement;
  scrollSpeedSliderElement: HTMLInputElement;
  scrollSpeedReadoutElement: HTMLSpanElement;
  edgeScrollToggleElement: HTMLInputElement;
  difficultySelectElement: HTMLSelectElement;
  saveGameButtonElement: HTMLButtonElement;
  loadGameButtonElement: HTMLButtonElement;
  exportSaveButtonElement: HTMLButtonElement;
  importSaveButtonElement: HTMLButtonElement;
  importSaveInputElement: HTMLInputElement;
  factoryCommandsElement: HTMLDivElement;
  workerButtonElement: HTMLButtonElement;
  truckButtonElement: HTMLButtonElement;
  sellReelsButtonElement: HTMLButtonElement;
  toggleAutoSellButtonElement: HTMLButtonElement;
  releaseFactoryCrewDecreaseButtonElement: HTMLButtonElement;
  releaseFactoryCrewCountElement: HTMLDivElement;
  releaseFactoryCrewButtonElement: HTMLButtonElement;
  releaseFactoryCrewIncreaseButtonElement: HTMLButtonElement;
  productionElement: HTMLDivElement;
  factoryReelReadoutElement: HTMLDivElement;
  barracksCommandsElement: HTMLDivElement;
  guardButtonElement: HTMLButtonElement;
  saboteurButtonElement: HTMLButtonElement;
  barracksProductionElement: HTMLDivElement;
  dockCommandsElement: HTMLDivElement;
  boatButtonElement: HTMLButtonElement;
  attackBoatButtonElement: HTMLButtonElement;
  dockProductionElement: HTMLDivElement;
  techLabCommandsElement: HTMLDivElement;
  cncUpgradeButtonElement: HTMLButtonElement;
  militaryUpgradeButtonElement: HTMLButtonElement;
  boatsUpgradeButtonElement: HTMLButtonElement;
  reelsUpgradeButtonElement: HTMLButtonElement;
  techLabReadoutElement: HTMLDivElement;
  workerCommandsElement: HTMLDivElement;
  placeHouseButtonElement: HTMLButtonElement;
  placeDockButtonElement: HTMLButtonElement;
  placeGuardTowerButtonElement: HTMLButtonElement;
  placeTechLabButtonElement: HTMLButtonElement;
  placeBarracksButtonElement: HTMLButtonElement;
  placeFactoryButtonElement: HTMLButtonElement;
  assignFactoryCrewButtonElement: HTMLButtonElement;
  equipReelButtonElement: HTMLButtonElement;
  workerBuildDetailsElement: HTMLDivElement;
  placementElement: HTMLDivElement;
  tacticalCommandsElement: HTMLDivElement;
  buildingCommandsElement: HTMLDivElement;
  sellBuildingButtonElement: HTMLButtonElement;
  stopButtonElement: HTMLButtonElement;
  attackButtonElement: HTMLButtonElement;
  holdButtonElement: HTMLButtonElement;
  attackMoveButtonElement: HTMLButtonElement;
  resultPanelElement: HTMLElement;
  resultTitleElement: HTMLDivElement;
  resultReasonElement: HTMLParagraphElement;
  resultAdviceElement: HTMLParagraphElement;
  resultSummaryElement: HTMLDListElement;
  restartButtonElement: HTMLButtonElement;
  pausePanelElement: HTMLElement;
  resumeButtonElement: HTMLButtonElement;
  pauseRestartButtonElement: HTMLButtonElement;
  objectiveListElement: HTMLOListElement;
}

export function mountRtsDomShell(rootSelector = '#app'): RtsDomElements {
  const appRoot = document.querySelector<HTMLDivElement>(rootSelector);
  if (!appRoot) {
    throw new Error(`Missing ${rootSelector} root element.`);
  }

  appRoot.innerHTML = `
    <section class="rts-shell" aria-label="Wambasa Fishing Wars RTS shell">
      <div class="rts-loading-screen" aria-live="polite" aria-busy="true">
        <div class="rts-loading-panel">
          <div class="rts-loading-title">Wambasa Fishing Wars</div>
          <p id="loading-status">Loading PixiJS command shell...</p>
          <div class="rts-loading-meter" aria-hidden="true"><span></span></div>
        </div>
      </div>
      <main id="rts-game" class="rts-game" aria-label="RTS game viewport" tabindex="0">
        <div id="viewport-hud" class="rts-viewport-hud" aria-hidden="true">
          <div id="boot-status" class="rts-viewport-mode">Loading PixiJS command shell...</div>
          <div id="viewport-mode-readout" class="rts-viewport-mode">Command online</div>
          <div id="viewport-selection-readout" class="rts-viewport-selection">No unit selected</div>
          <div id="viewport-hotkey-readout" class="rts-viewport-hotkeys">LMB Select | RMB Order | A Attack-Move | T Attack | H Hold | S Stop</div>
        </div>
        <div id="mobile-command-tray" class="rts-mobile-command-tray" aria-label="Mobile command modes" hidden>
          <button id="mobile-select-command-button" type="button" aria-pressed="true">Select</button>
          <button id="mobile-smart-command-button" type="button" aria-pressed="false">Order</button>
          <button id="mobile-move-command-button" type="button" aria-pressed="false">Move</button>
          <button id="mobile-attack-command-button" type="button" aria-pressed="false">Attack</button>
          <button id="mobile-menu-command-button" type="button" aria-pressed="false">Menu</button>
        </div>
      </main>
      <section id="pause-menu-panel" class="rts-pause-panel" aria-live="polite" hidden>
        <div class="rts-panel-title">Skirmish Menu</div>
        <p class="rts-pause-copy">Start the match here. During play, press F10 to reopen this menu for pause and settings.</p>
        <div class="rts-pause-actions">
          <button id="start-button" class="rts-primary" type="button" aria-label="Start Skirmish Shell" disabled>Start</button>
          <button id="resume-skirmish-button" class="rts-primary" type="button" hidden>Resume</button>
          <button id="pause-restart-button" class="rts-secondary" type="button">Restart Skirmish</button>
        </div>
        <div class="rts-settings-panel" aria-label="Settings">
          <label for="music-volume-slider">Music <span id="music-volume-readout">28%</span></label>
          <input id="music-volume-slider" type="range" min="0" max="100" value="28" />
          <label for="sfx-volume-slider">SFX <span id="sfx-volume-readout">72%</span></label>
          <input id="sfx-volume-slider" type="range" min="0" max="100" value="72" />
          <label for="ui-scale-slider">UI Scale <span id="ui-scale-readout">100%</span></label>
          <input id="ui-scale-slider" type="range" min="85" max="115" value="100" />
          <label for="scroll-speed-slider">Scroll Speed <span id="scroll-speed-readout">130%</span></label>
          <input id="scroll-speed-slider" type="range" min="80" max="180" value="130" />
          <label class="rts-toggle-label" for="edge-scroll-toggle">Edge Scroll <input id="edge-scroll-toggle" type="checkbox" checked /></label>
          <label for="difficulty-select">Difficulty</label>
          <select id="difficulty-select">
            <option value="easy">Easy</option>
            <option value="normal" selected>Normal</option>
            <option value="hard">Hard</option>
          </select>
          <div class="rts-save-actions" aria-label="Save game controls">
            <button id="save-game-button" class="rts-secondary" type="button">Save</button>
            <button id="load-game-button" class="rts-secondary" type="button">Load</button>
            <button id="export-save-button" class="rts-secondary" type="button">Export</button>
            <button id="import-save-button" class="rts-secondary" type="button">Import</button>
            <input id="import-save-input" class="rts-visually-hidden" type="file" accept="application/json,.json" />
          </div>
        </div>
      </section>
      <aside class="rts-side-panel" aria-live="polite">
        <button id="pause-toggle-button" class="rts-visually-hidden" type="button" aria-label="Pause Skirmish" tabindex="-1">Pause</button>
        <section id="match-result-panel" class="rts-result-panel" aria-live="assertive" hidden>
          <div id="match-result-title" class="rts-panel-title">Skirmish Result</div>
          <p id="match-result-reason">Skirmish in progress.</p>
          <p id="match-result-advice" class="rts-result-advice">Recommendation: keep your economy protected and pressure the rival shoreline.</p>
          <dl id="match-result-summary" class="rts-result-summary"></dl>
          <button id="restart-match-button" class="rts-secondary" type="button">Restart Skirmish</button>
        </section>
        <section class="rts-minimap-panel" aria-label="RTS minimap">
          <div class="rts-panel-title">Radar</div>
          <canvas id="rts-minimap" class="rts-minimap" width="320" height="204"></canvas>
          <div id="economy-readout" class="rts-economy-readout">Metal 0 | Cash 0 | Crew 0/0</div>
        </section>
        <section class="rts-command-panel" aria-label="Command panel">
          <div class="rts-command-header">
            <div class="rts-panel-title">Command</div>
            <div id="command-hint" class="rts-command-hint">Select a unit or building. Right-click to order.</div>
          </div>
          <div id="selection-readout" class="rts-selection-readout" hidden></div>
          <div class="rts-command-grid" aria-label="Context actions">
            <div id="factory-command-panel" class="rts-factory-commands" hidden>
              <div class="rts-command-group-title">Factory Orders</div>
              <button id="produce-worker-button" data-command-icon="WK" data-command-tone="econ" type="button" aria-label="Build Worker - 45 cash">Build Worker<br><span>45 cash</span></button>
              <button id="produce-truck-button" data-command-icon="TR" data-command-tone="econ" type="button" aria-label="Build Truck - 105 metal + 45 cash">Build Truck<br><span>105 metal + 45 cash</span></button>
              <button id="sell-reels-button" data-command-icon="$$" data-command-tone="cash" type="button" aria-label="Sell stored reels">Sell Reels<br><span>Cash from inventory</span></button>
              <button id="toggle-autosell-button" data-command-icon="AU" data-command-tone="cash" type="button" aria-label="Toggle reel autosell">Auto Sell<br><span>Off</span></button>
              <div class="rts-inline-adjuster" aria-label="Factory crew release controls">
                <button id="release-factory-crew-less-button" class="rts-adjuster-button" data-adjuster-tone="utility" type="button" aria-label="Release fewer workers">-</button>
                <div id="release-factory-crew-count" class="rts-adjuster-readout" aria-live="polite">Crew 0/10<br><span>Assign workers first</span></div>
                <button id="release-factory-crew-button" data-command-icon="RL" data-command-tone="utility" type="button" aria-label="Send workers out from factory crew">Send Out<br><span>To rally point</span></button>
                <button id="release-factory-crew-more-button" class="rts-adjuster-button" data-adjuster-tone="utility" type="button" aria-label="Release more workers">+</button>
              </div>
              <div id="production-readout" class="rts-production-readout">Queue empty</div>
              <div id="factory-reel-readout" class="rts-production-readout">Workshop idle</div>
            </div>
            <div id="barracks-command-panel" class="rts-factory-commands" hidden>
              <div class="rts-command-group-title">Barracks Orders</div>
              <button id="produce-guard-button" data-command-icon="GD" data-command-tone="combat" type="button" aria-label="Build Guard - 90 metal + 30 cash">Build Guard<br><span>90 metal + 30 cash</span></button>
              <button id="produce-saboteur-button" data-command-icon="SB" data-command-tone="combat" type="button" aria-label="Build Saboteur - 110 metal + 25 cash">Build Saboteur<br><span>110 metal + 25 cash</span></button>
              <div id="barracks-production-readout" class="rts-production-readout">Queue empty</div>
            </div>
            <div id="dock-command-panel" class="rts-dock-commands" hidden>
              <div class="rts-command-group-title">Dock Orders</div>
              <button id="produce-boat-button" data-command-icon="FB" data-command-tone="econ" type="button" aria-label="Build Fishing Boat - 100 metal + 25 cash">Build Fishing Boat<br><span>100 metal + 25 cash</span></button>
              <button id="produce-attack-boat-button" data-command-icon="AB" data-command-tone="combat" type="button" aria-label="Build Attack Boat - 135 metal + 50 cash">Build Attack Boat<br><span>135 metal + 50 cash</span></button>
              <div id="dock-production-readout" class="rts-production-readout">Queue empty</div>
            </div>
            <div id="tech-lab-command-panel" class="rts-dock-commands" hidden>
              <div class="rts-command-group-title">Tech Lab</div>
              <button id="upgrade-cnc-button" data-command-icon="CNC" data-command-tone="econ" type="button" aria-label="Upgrade CNC Machines">Upgrade CNC<br><span>Factory throughput</span></button>
              <button id="upgrade-military-button" data-command-icon="MIL" data-command-tone="combat" type="button" aria-label="Upgrade Military">Upgrade Military<br><span>Tougher guards</span></button>
              <button id="upgrade-boats-button" data-command-icon="BOT" data-command-tone="econ" type="button" aria-label="Upgrade Boats">Upgrade Boats<br><span>Faster tougher hulls</span></button>
              <button id="upgrade-reels-button" data-command-icon="REL" data-command-tone="cash" type="button" aria-label="Upgrade Reels">Upgrade Reels<br><span>More cash per reel</span></button>
              <div id="tech-lab-readout" class="rts-production-readout">No research completed</div>
            </div>
            <div id="worker-command-panel" class="rts-worker-commands" hidden>
              <div class="rts-command-group-title">Worker Build Menu</div>
              <button id="place-house-button" data-command-icon="HS" data-command-tone="build" type="button" aria-label="House - 90 metal" title="House - 90 metal | +8 crew cap">House<br><span>90 metal</span></button>
              <button id="place-dock-button" data-command-icon="DK" data-command-tone="build" type="button" aria-label="Dock - 120 metal">Dock<br><span>120 metal</span></button>
              <button id="place-guard-tower-button" data-command-icon="GT" data-command-tone="combat" type="button" aria-label="Guard Tower - 150 metal">Guard Tower<br><span>150 metal</span></button>
              <button id="place-tech-lab-button" data-command-icon="TL" data-command-tone="utility" type="button" aria-label="Tech Lab - 190 metal">Tech Lab<br><span>190 metal</span></button>
              <button id="place-barracks-button" data-command-icon="BR" data-command-tone="combat" type="button" aria-label="Barracks - 180 metal">Barracks<br><span>180 metal</span></button>
              <button id="place-factory-button" data-command-icon="CC" data-command-tone="econ" type="button" aria-label="Command Center - 420 metal">Command Center<br><span>420 metal</span></button>
              <button id="assign-factory-crew-button" data-command-icon="CR" data-command-tone="utility" type="button" aria-label="Assign selected workers to factory crew">Crew Factory<br><span>Right-click factory</span></button>
              <button id="equip-reel-button" data-command-icon="RE" data-command-tone="cash" type="button" aria-label="Equip reel on selected workers">Equip Reel<br><span>Boost shoreline fishing</span></button>
              <div id="worker-build-details" class="rts-build-details" aria-label="Worker building details"></div>
              <div id="placement-readout" class="rts-placement-readout">No placement active</div>
            </div>
            <div id="tactical-command-panel" class="rts-tactical-commands" hidden>
              <div class="rts-command-group-title">Combat Orders</div>
              <button id="stop-command-button" data-command-icon="ST" data-command-tone="utility" type="button" aria-label="Stop (S)">Stop<br><span>S</span></button>
              <button id="attack-command-button" data-command-icon="AT" data-command-tone="combat" type="button" aria-label="Attack Target (T)">Attack<br><span>T</span></button>
              <button id="hold-command-button" data-command-icon="HD" data-command-tone="combat" type="button" aria-label="Hold Position (H)">Hold<br><span>H</span></button>
              <button id="attack-move-command-button" data-command-icon="AM" data-command-tone="combat" type="button" aria-label="Attack-Move (A)">Attack Move<br><span>A</span></button>
            </div>
            <div id="building-command-panel" class="rts-tactical-commands" hidden>
              <div class="rts-command-group-title">Building Orders</div>
              <button id="sell-building-command-button" data-command-icon="SL" data-command-tone="cash" type="button" aria-label="Sell selected building">Sell<br><span>Refund metal</span></button>
            </div>
          </div>
          <section class="rts-intel-panel" aria-label="Battlefield intel">
            <div class="rts-objective-panel" aria-label="Skirmish objectives">
              <div class="rts-command-group-title">Mission</div>
              <ol id="objective-list" class="rts-objective-list"></ol>
            </div>
            <div id="alert-feed" class="rts-alert-feed" aria-label="Recent battlefield alerts" role="log"></div>
          </section>
        </section>
      </aside>
    </section>
  `;

  const shellElement = requiredElement<HTMLElement>('.rts-shell');
  const elements = {
    rootElement: shellElement,
    gameElement: requiredElement<HTMLDivElement>('#rts-game'),
    statusElement: requiredElement<HTMLParagraphElement>('#boot-status'),
    skirmishButton: requiredElement<HTMLButtonElement>('#start-button'),
    pauseToggleButtonElement: requiredElement<HTMLButtonElement>('#pause-toggle-button'),
    mobileCommandTrayElement: requiredElement<HTMLDivElement>('#mobile-command-tray'),
    mobileSelectButtonElement: requiredElement<HTMLButtonElement>('#mobile-select-command-button'),
    mobileSmartButtonElement: requiredElement<HTMLButtonElement>('#mobile-smart-command-button'),
    mobileMoveButtonElement: requiredElement<HTMLButtonElement>('#mobile-move-command-button'),
    mobileAttackButtonElement: requiredElement<HTMLButtonElement>('#mobile-attack-command-button'),
    mobileMenuButtonElement: requiredElement<HTMLButtonElement>('#mobile-menu-command-button'),
    minimapElement: requiredElement<HTMLCanvasElement>('#rts-minimap'),
    commandHintElement: requiredElement<HTMLDivElement>('#command-hint'),
    alertFeedElement: requiredElement<HTMLDivElement>('#alert-feed'),
    selectionElement: requiredElement<HTMLDivElement>('#selection-readout'),
    viewportHudElement: requiredElement<HTMLDivElement>('#viewport-hud'),
    viewportModeElement: requiredElement<HTMLDivElement>('#viewport-mode-readout'),
    viewportSelectionElement: requiredElement<HTMLDivElement>('#viewport-selection-readout'),
    viewportHotkeyElement: requiredElement<HTMLDivElement>('#viewport-hotkey-readout'),
    economyElement: requiredElement<HTMLDivElement>('#economy-readout'),
    musicSliderElement: requiredElement<HTMLInputElement>('#music-volume-slider'),
    sfxSliderElement: requiredElement<HTMLInputElement>('#sfx-volume-slider'),
    musicReadoutElement: requiredElement<HTMLSpanElement>('#music-volume-readout'),
    sfxReadoutElement: requiredElement<HTMLSpanElement>('#sfx-volume-readout'),
    uiScaleSliderElement: requiredElement<HTMLInputElement>('#ui-scale-slider'),
    uiScaleReadoutElement: requiredElement<HTMLSpanElement>('#ui-scale-readout'),
    scrollSpeedSliderElement: requiredElement<HTMLInputElement>('#scroll-speed-slider'),
    scrollSpeedReadoutElement: requiredElement<HTMLSpanElement>('#scroll-speed-readout'),
    edgeScrollToggleElement: requiredElement<HTMLInputElement>('#edge-scroll-toggle'),
    difficultySelectElement: requiredElement<HTMLSelectElement>('#difficulty-select'),
    saveGameButtonElement: requiredElement<HTMLButtonElement>('#save-game-button'),
    loadGameButtonElement: requiredElement<HTMLButtonElement>('#load-game-button'),
    exportSaveButtonElement: requiredElement<HTMLButtonElement>('#export-save-button'),
    importSaveButtonElement: requiredElement<HTMLButtonElement>('#import-save-button'),
    importSaveInputElement: requiredElement<HTMLInputElement>('#import-save-input'),
    factoryCommandsElement: requiredElement<HTMLDivElement>('#factory-command-panel'),
    workerButtonElement: requiredElement<HTMLButtonElement>('#produce-worker-button'),
    truckButtonElement: requiredElement<HTMLButtonElement>('#produce-truck-button'),
    sellReelsButtonElement: requiredElement<HTMLButtonElement>('#sell-reels-button'),
    toggleAutoSellButtonElement: requiredElement<HTMLButtonElement>('#toggle-autosell-button'),
    releaseFactoryCrewDecreaseButtonElement: requiredElement<HTMLButtonElement>('#release-factory-crew-less-button'),
    releaseFactoryCrewCountElement: requiredElement<HTMLDivElement>('#release-factory-crew-count'),
    releaseFactoryCrewButtonElement: requiredElement<HTMLButtonElement>('#release-factory-crew-button'),
    releaseFactoryCrewIncreaseButtonElement: requiredElement<HTMLButtonElement>('#release-factory-crew-more-button'),
    productionElement: requiredElement<HTMLDivElement>('#production-readout'),
    factoryReelReadoutElement: requiredElement<HTMLDivElement>('#factory-reel-readout'),
    barracksCommandsElement: requiredElement<HTMLDivElement>('#barracks-command-panel'),
    guardButtonElement: requiredElement<HTMLButtonElement>('#produce-guard-button'),
    saboteurButtonElement: requiredElement<HTMLButtonElement>('#produce-saboteur-button'),
    barracksProductionElement: requiredElement<HTMLDivElement>('#barracks-production-readout'),
    dockCommandsElement: requiredElement<HTMLDivElement>('#dock-command-panel'),
    boatButtonElement: requiredElement<HTMLButtonElement>('#produce-boat-button'),
    attackBoatButtonElement: requiredElement<HTMLButtonElement>('#produce-attack-boat-button'),
    dockProductionElement: requiredElement<HTMLDivElement>('#dock-production-readout'),
    techLabCommandsElement: requiredElement<HTMLDivElement>('#tech-lab-command-panel'),
    cncUpgradeButtonElement: requiredElement<HTMLButtonElement>('#upgrade-cnc-button'),
    militaryUpgradeButtonElement: requiredElement<HTMLButtonElement>('#upgrade-military-button'),
    boatsUpgradeButtonElement: requiredElement<HTMLButtonElement>('#upgrade-boats-button'),
    reelsUpgradeButtonElement: requiredElement<HTMLButtonElement>('#upgrade-reels-button'),
    techLabReadoutElement: requiredElement<HTMLDivElement>('#tech-lab-readout'),
    workerCommandsElement: requiredElement<HTMLDivElement>('#worker-command-panel'),
    placeHouseButtonElement: requiredElement<HTMLButtonElement>('#place-house-button'),
    placeDockButtonElement: requiredElement<HTMLButtonElement>('#place-dock-button'),
    placeGuardTowerButtonElement: requiredElement<HTMLButtonElement>('#place-guard-tower-button'),
    placeTechLabButtonElement: requiredElement<HTMLButtonElement>('#place-tech-lab-button'),
    placeBarracksButtonElement: requiredElement<HTMLButtonElement>('#place-barracks-button'),
    placeFactoryButtonElement: requiredElement<HTMLButtonElement>('#place-factory-button'),
    assignFactoryCrewButtonElement: requiredElement<HTMLButtonElement>('#assign-factory-crew-button'),
    equipReelButtonElement: requiredElement<HTMLButtonElement>('#equip-reel-button'),
    workerBuildDetailsElement: requiredElement<HTMLDivElement>('#worker-build-details'),
    placementElement: requiredElement<HTMLDivElement>('#placement-readout'),
    tacticalCommandsElement: requiredElement<HTMLDivElement>('#tactical-command-panel'),
    buildingCommandsElement: requiredElement<HTMLDivElement>('#building-command-panel'),
    sellBuildingButtonElement: requiredElement<HTMLButtonElement>('#sell-building-command-button'),
    stopButtonElement: requiredElement<HTMLButtonElement>('#stop-command-button'),
    attackButtonElement: requiredElement<HTMLButtonElement>('#attack-command-button'),
    holdButtonElement: requiredElement<HTMLButtonElement>('#hold-command-button'),
    attackMoveButtonElement: requiredElement<HTMLButtonElement>('#attack-move-command-button'),
    resultPanelElement: requiredElement<HTMLElement>('#match-result-panel'),
    resultTitleElement: requiredElement<HTMLDivElement>('#match-result-title'),
    resultReasonElement: requiredElement<HTMLParagraphElement>('#match-result-reason'),
    resultAdviceElement: requiredElement<HTMLParagraphElement>('#match-result-advice'),
    resultSummaryElement: requiredElement<HTMLDListElement>('#match-result-summary'),
    restartButtonElement: requiredElement<HTMLButtonElement>('#restart-match-button'),
    pausePanelElement: requiredElement<HTMLElement>('#pause-menu-panel'),
    resumeButtonElement: requiredElement<HTMLButtonElement>('#resume-skirmish-button'),
    pauseRestartButtonElement: requiredElement<HTMLButtonElement>('#pause-restart-button'),
    objectiveListElement: requiredElement<HTMLOListElement>('#objective-list'),
  };
  const minimapContext = elements.minimapElement.getContext('2d');
  if (!minimapContext) {
    throw new Error('Unable to create minimap canvas context.');
  }

  return { ...elements, minimapContext };
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing RTS shell element: ${selector}`);
  }
  return element;
}
