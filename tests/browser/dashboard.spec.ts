import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('dashboard uses live projects, searchable views and a real summary export', async ({ page }, info) => {
  await page.goto('/workspace');
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Project summary' })).toContainText('Total projects');
  await page.getByRole('searchbox', { name: 'Search projects' }).fill('no matching synthetic project');
  await expect(page.getByText('No projects found', { exact: true })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search projects' }).fill('Juniper');
  await expect(page.getByRole('button', { name: /Open workspace/ })).toBeVisible();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export summary', exact: true }).click();
  const download = await downloading;
  const filename = info.outputPath('project-summary.csv');
  await download.saveAs(filename);
  const csv = await readFile(filename, 'utf8');
  expect(csv).toContain('Juniper Studio storefront renovation');
  expect(csv).not.toContain('The corner café');
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await menu.isVisible()) {
    const nav = page.getByRole('complementary', { name: 'Dashboard navigation' });
    await expect(nav).toBeHidden();
    await menu.click();
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Overview', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(nav).toBeHidden();
    await expect(menu).toBeFocused();
    await menu.click();
  }
  await page.getByRole('complementary', { name: 'Dashboard navigation' }).getByRole('button', { name: /^Activity$/ }).click();
  await expect(page.getByRole('heading', { name: 'Your workspace, in motion.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('keyboard project facts change verified conditional requirements', async ({ page }) => {
  await page.goto('/workspace');
  await page.getByRole('button', { name: /Open workspace/ }).first().click();
  const walls = page.getByRole('radiogroup', { name: 'Exterior wall work?', exact: true });
  await expect(walls.getByRole('radio', { name: 'Yes', exact: true })).toBeChecked();
  await walls.getByRole('radio', { name: 'Yes', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(walls.getByRole('radio', { name: 'No', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Save facts & re-evaluate', exact: true }).click();
  const gaps = page.locator('.stat-row').getByText('Possible gaps', { exact: true }).locator('..').locator('dd');
  await expect(gaps).toHaveText('0');
  await page.getByRole('tab', { name: 'Requirements', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search requirements' }).fill('Building Elevations');
  await expect(page.locator('.req-list > li').filter({ hasText: 'Building Elevations' })).toContainText('Not applicable');
});
