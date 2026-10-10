import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

const fixture = (name: string) => resolve('deliverables/qa', name);

test('documents tab surfaces real analysis provenance for an uploaded file', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/workspace');
  await expect(page.getByText('Juniper Studio storefront renovation', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open workspace' }).first().click();
  await page.getByRole('tab', { name: /Documents/ }).click();

  // Samples live OUTSIDE the clickable dropzone (separate section, 44px+ links).
  const samples = page.locator('.tab-stack > .di-samples');
  await samples.getByText('Try synthetic sample files', { exact: true }).click();
  await expect(samples.getByText('Download synthetic samples')).toBeVisible();
  expect(await samples.locator('a').first().evaluate((el) => el.closest('.dropzone') === null)).toBe(true);

  await page.locator('input[type=file]').setInputFiles(fixture('A-201-Elevations.pdf'));
  const uploaded = page.locator('.doc-list > li').filter({ hasText: 'A-201-Elevations.pdf' });
  await expect(uploaded).toBeVisible({ timeout: 30_000 });

  // Provenance badge + analysis summary reflect the real doc.analysis values.
  await expect(uploaded.locator('.di-analysis')).toBeVisible();
  await expect(uploaded.locator('.di-analysis')).toContainText(/AI analysis|Text extraction/);
  // Golden-path controls keep their names.
  await expect(uploaded.getByRole('button', { name: 'Evidence detail' })).toBeVisible();
  await expect(uploaded.getByRole('button', { name: /Confirm type|Confirmed/ }).first()).toBeVisible();
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
