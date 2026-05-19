# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: epic1-rts-foundation.spec.ts >> Epic 4 worker building placement foundation >> selecting a worker reveals building actions and starts House placement preview
- Location: tests\e2e\epic1-rts-foundation.spec.ts:826:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('#worker-command-panel')
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('#worker-command-panel')
    14 × locator resolved to <div hidden="" id="worker-command-panel" class="rts-worker-commands">…</div>
       - unexpected value "hidden"

```

```yaml
- region "Wambasa Fishing Wars RTS shell":
  - paragraph: PixiJS RTS foundation ready.
  - main "RTS game viewport"
  - text: Skirmish Menu
  - paragraph: Start the match here. During play, press F10 to reopen this menu for pause and settings.
  - button "Start Skirmish Shell": Start
  - button "Restart Skirmish"
  - text: Music 28%
  - slider "Music 28%": "28"
  - text: SFX 72%
  - slider "SFX 72%": "72"
  - text: UI Scale 100%
  - slider "UI Scale 100%": "100"
  - text: Scroll Speed 130%
  - slider "Scroll Speed 130%": "130"
  - text: Edge Scroll
  - checkbox "Edge Scroll" [checked]
  - text: Difficulty
  - combobox "Difficulty":
    - option "Easy"
    - option "Normal" [selected]
    - option "Hard"
  - complementary:
    - button "Pause Skirmish" [pressed]: Resume
    - region "RTS minimap": Radar Metal 280 Cash 100 Crew 6/10
    - region "Command panel":
      - text: Command Paused. Resume to keep issuing orders.
      - region "Battlefield intel":
        - text: Mission
        - list:
          - listitem: "Active: Select your crew"
        - log "Recent battlefield alerts": No alerts yet
```

# Test source

```ts
  731 |         harvesting: expect.objectContaining({ fieldId: 'player-metal-a', phase: 'to-field' }),
  732 |       }),
  733 |     );
  734 |   });
  735 | 
  736 |   test('rejects harvest command when no truck is selected', async ({ page }) => {
  737 |     await page.goto('/');
  738 |     const worker = await worldToScreen(page, 850, 695);
  739 |     await page.mouse.click(worker.x, worker.y);
  740 | 
  741 |     const metalField = await worldToScreen(page, 370, 980);
  742 |     await page.mouse.click(metalField.x, metalField.y, { button: 'right' });
  743 | 
  744 |     await expect(page.getByText('Select a metal hauler truck before harvesting metal.')).toBeVisible();
  745 |     const state = await getDebugState(page);
  746 |     expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: false, kind: 'harvestMetal', reason: 'wrong-unit' }));
  747 |   });
  748 | 
  749 |   test('factory spends metal, queues a worker, shows progress, and spawns it', async ({ page }) => {
  750 |     await page.goto('/');
  751 |     const factory = await worldToScreen(page, 767, 825);
  752 |     await page.mouse.click(factory.x, factory.y);
  753 | 
  754 |     await expect(page.locator('#factory-command-panel')).toBeVisible();
  755 |     await expect(page.getByText('Factory Orders')).toBeVisible();
  756 |     await page.getByRole('button', { name: 'Build Worker - 80 metal' }).click();
  757 | 
  758 |     await expect(page.locator('#economy-readout')).toHaveText('Metal: 200 | Cash: 100 | Crew: 6/6');
  759 |     await expect(page.locator('#production-readout')).toContainText('Worker');
  760 |     let state = await getDebugState(page);
  761 |     expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'produce', product: 'worker' }));
  762 |     expect(state.lastProductionEvent).toEqual(expect.objectContaining({ kind: 'queued', product: 'worker', stockpile: 200 }));
  763 |     expect(state.entities.find((entity) => entity.id === 'player-factory')?.productionQueue?.[0]).toEqual(
  764 |       expect.objectContaining({ product: 'worker', cost: 80 }),
  765 |     );
  766 |     expect(state.entities.find((entity) => entity.id === 'player-factory')?.renderPolish).toEqual(
  767 |       expect.objectContaining({ hasProductionActivity: true }),
  768 |     );
  769 | 
  770 |     await page.waitForFunction(() => window.__wambasaRts?.lastProductionEvent?.kind === 'spawned', null, { timeout: 4000 });
  771 |     state = await getDebugState(page);
  772 |     expect(state.lastProductionEvent).toEqual(expect.objectContaining({ kind: 'spawned', product: 'worker' }));
  773 |     expect(state.entities.some((entity) => entity.id === state.lastProductionEvent?.entityId && entity.kind === 'worker')).toBe(true);
  774 |     expect(state.entities.find((entity) => entity.id === 'player-factory')?.productionQueue).toEqual([]);
  775 |     await expect(page.locator('#production-readout')).toHaveText('Queue empty');
  776 |   });
  777 | 
  778 |   test('barracks can train a new guard for base defense', async ({ page }) => {
  779 |     await page.goto('/');
  780 |     const barracks = await worldToScreen(page, PLAYER_BARRACKS.x, PLAYER_BARRACKS.y);
  781 |     await page.mouse.click(barracks.x, barracks.y);
  782 | 
  783 |     await expect(page.getByRole('button', { name: 'Build Guard - 120 metal + 20 cash' })).toBeVisible();
  784 |     await page.getByRole('button', { name: 'Build Guard - 120 metal + 20 cash' }).click();
  785 | 
  786 |     await expect(page.locator('#economy-readout')).toHaveText('Metal: 160 | Cash: 80 | Crew: 6/6');
  787 |     await expect(page.locator('#barracks-production-readout')).toContainText('Guard');
  788 |     let state = await getDebugState(page);
  789 |     expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'produce', product: 'guard' }));
  790 |     expect(state.lastProductionEvent).toEqual(expect.objectContaining({ kind: 'queued', product: 'guard', stockpile: 160 }));
  791 |     expect(state.entities.find((entity) => entity.id === 'player-barracks')?.productionQueue?.[0]).toEqual(
  792 |       expect.objectContaining({ product: 'guard', cost: 120 }),
  793 |     );
  794 | 
  795 |     await page.waitForFunction(() => window.__wambasaRts?.lastProductionEvent?.kind === 'spawned', null, { timeout: 4000 });
  796 |     state = await getDebugState(page);
  797 |     expect(state.lastProductionEvent).toEqual(expect.objectContaining({ kind: 'spawned', product: 'guard' }));
  798 |     expect(state.entities.some((entity) => entity.id === state.lastProductionEvent?.entityId && entity.kind === 'guard' && entity.commandable)).toBe(true);
  799 |     await expect(page.locator('#barracks-production-readout')).toHaveText('Queue empty');
  800 |   });
  801 | 
  802 |   test('blocks unaffordable Factory production with readable feedback', async ({ page }) => {
  803 |     await page.goto('/');
  804 |     const factory = await worldToScreen(page, 767, 825);
  805 |     await page.mouse.click(factory.x, factory.y);
  806 | 
  807 |     await page.getByRole('button', { name: 'Build Truck - 180 metal' }).click();
  808 |     await expect(page.locator('#economy-readout')).toHaveText('Metal: 100 | Cash: 100 | Crew: 6/6');
  809 |     await expect(page.getByRole('button', { name: 'Build Truck - 180 metal' })).toBeDisabled();
  810 | 
  811 |     await page.evaluate(() => {
  812 |       const button = document.querySelector<HTMLButtonElement>('#produce-truck-button');
  813 |       if (button) {
  814 |         button.disabled = false;
  815 |         button.click();
  816 |       }
  817 |     });
  818 | 
  819 |     const state = await getDebugState(page);
  820 |     expect(page.getByRole('button', { name: 'Build Truck - 180 metal' })).toBeDisabled();
  821 |     expect(state.resources.metal).toBe(100);
  822 |   });
  823 | });
  824 | 
  825 | test.describe('Epic 4 worker building placement foundation', () => {
  826 |   test('selecting a worker reveals building actions and starts House placement preview', async ({ page }) => {
  827 |     await page.goto('/');
  828 |     const worker = await worldToScreen(page, 760, 1000);
  829 |     await page.mouse.click(worker.x, worker.y);
  830 | 
> 831 |     await expect(page.locator('#worker-command-panel')).toBeVisible();
      |                                                         ^ Error: expect(locator).toBeVisible() failed
  832 |     await expect(page.getByText('Worker Build Menu')).toBeVisible();
  833 |     await expect(page.getByRole('button', { name: 'Plan House - 120 metal' })).toBeEnabled();
  834 |     await expect(page.locator('#worker-build-details')).toContainText('Prerequisite: select a worker.');
  835 |     await expect(page.locator('#worker-build-details')).toContainText('Guard Tower: 150 metal | 2.0s build | 260 range | targets enemy raiders');
  836 | 
  837 |     await page.getByRole('button', { name: 'Plan House - 120 metal' }).click();
  838 |     const validPlacement = await worldToScreen(page, 950, 1050);
  839 |     await page.mouse.move(validPlacement.x, validPlacement.y);
  840 | 
  841 |     await expect(page.locator('#placement-readout')).toContainText('House foundation: valid');
  842 |     await expect(page.locator('#placement-readout')).toContainText('120 metal | 1.8s build | +4 crew cap');
  843 |     const state = await getDebugState(page);
  844 |     expect(state.placement).toEqual(
  845 |       expect.objectContaining({
  846 |         active: true,
  847 |         building: 'house',
  848 |         valid: true,
  849 |         reason: 'valid',
  850 |       }),
  851 |     );
  852 |     expect(state.overlayLabels).toContain('placement-preview-overlay');
  853 |   });
  854 | 
  855 |   test('blocks invalid House placement over terrain blockers without spending metal', async ({ page }) => {
  856 |     await page.goto('/');
  857 |     const worker = await worldToScreen(page, 760, 1000);
  858 |     await page.mouse.click(worker.x, worker.y);
  859 | 
  860 |     await page.getByRole('button', { name: 'Plan House - 120 metal' }).click();
  861 |     const blockedPlacement = await worldToScreen(page, 1100, 1000);
  862 |     await page.mouse.move(blockedPlacement.x, blockedPlacement.y);
  863 | 
  864 |     await expect(page.locator('#placement-readout')).toContainText('blocked - blocked terrain');
  865 |     await page.mouse.click(blockedPlacement.x, blockedPlacement.y);
  866 | 
  867 |     await expect(page.getByText('Placement blocked: blocked terrain.')).toBeVisible();
  868 |     const state = await getDebugState(page);
  869 |     expect(state.resources.metal).toBe(280);
  870 |     expect(state.lastCommandResult).toEqual(
  871 |       expect.objectContaining({ ok: false, kind: 'placement', reason: 'invalid-placement' }),
  872 |     );
  873 |     expect(state.placement).toEqual(
  874 |       expect.objectContaining({
  875 |         active: true,
  876 |         building: 'house',
  877 |         valid: false,
  878 |         reason: 'blocked terrain',
  879 |       }),
  880 |     );
  881 |   });
  882 | 
  883 |   test('confirms valid House placement, spends metal, and assigns the worker to build', async ({ page }) => {
  884 |     await page.goto('/');
  885 |     const worker = await worldToScreen(page, 760, 1000);
  886 |     await page.mouse.click(worker.x, worker.y);
  887 | 
  888 |     await page.getByRole('button', { name: 'Plan House - 120 metal' }).click();
  889 |     const validPlacement = await worldToScreen(page, 950, 1050);
  890 |     await page.mouse.move(validPlacement.x, validPlacement.y);
  891 |     await page.mouse.click(validPlacement.x, validPlacement.y);
  892 | 
  893 |     await expect(page.getByText('House foundation started. Dockyard Worker is moving to build.')).toBeVisible();
  894 |     await expect(page.locator('#placement-readout')).toHaveText('No placement active');
  895 |     const state = await getDebugState(page);
  896 |     expect(state.resources.metal).toBe(160);
  897 |     expect(state.lastCommandResult).toEqual(expect.objectContaining({ ok: true, kind: 'placement', building: 'house' }));
  898 |     expect(state.placement).toEqual({ active: false });
  899 |     expect(state.entities).toEqual(
  900 |       expect.arrayContaining([
  901 |         expect.objectContaining({
  902 |           id: expect.stringMatching(/^house-site-/),
  903 |           kind: 'house',
  904 |           commandable: false,
  905 |           animationState: 'build',
  906 |           animationProfile: 'building',
  907 |           animationFrameCount: 5,
  908 |           renderPolish: expect.objectContaining({ hasConstructionActivity: true, constructionProgress: 0 }),
  909 |           construction: expect.objectContaining({ building: 'house', complete: false, builderId: 'worker-1' }),
  910 |         }),
  911 |         expect.objectContaining({
  912 |           id: 'worker-1',
  913 |           movementState: 'moving',
  914 |           animationState: 'move',
  915 |           buildJob: expect.objectContaining({ phase: 'to-site' }),
  916 |         }),
  917 |       ]),
  918 |     );
  919 |   });
  920 | 
  921 |   test('worker completes House construction and expands crew capacity', async ({ page }) => {
  922 |     await page.goto('/');
  923 |     const worker = await worldToScreen(page, 760, 1000);
  924 |     await page.mouse.click(worker.x, worker.y);
  925 | 
  926 |     await page.getByRole('button', { name: 'Plan House - 120 metal' }).click();
  927 |     const validPlacement = await worldToScreen(page, 950, 1050);
  928 |     await page.mouse.move(validPlacement.x, validPlacement.y);
  929 |     await page.mouse.click(validPlacement.x, validPlacement.y);
  930 | 
  931 |     await page.waitForFunction(() => window.__wambasaRts?.crew.capacity === 10, null, { timeout: 8000 });
```