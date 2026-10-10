import type { DocumentAnalysis } from '../../frontend/src/domain/types';
import { test, expect } from '@playwright/test';

test('analyze a fresh synthetic example through the actual document service', async ({ page }) => {
  await page.goto('/workspace');
  await page.getByRole('button', { name: 'Open workspace' }).first().click();
  const response = page.waitForResponse(r => r.url().endsWith('/api/analyze') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Analyze example document', exact: true }).click();
  const analyzed = await response;
  expect(analyzed.ok()).toBe(true);
  const result = await analyzed.json() as DocumentAnalysis;
  expect(['model', 'deterministic']).toContain(result.method);
  if (process.env.REQUIRE_MODEL === '1') expect(result.method).toBe('model');
  expect(result.text).toContain('Project Address: 120 Example Lane');
  expect(Object.values(result.fields).some((f) => f.value.includes('120 Example Lane') && f.evidence.includes(f.value))).toBe(true);
  const document = page.locator('.doc-list > li').filter({ hasText: 'Example project description.txt' });
  await expect(document).toBeVisible({ timeout: 45_000 });
  await expect(document).toContainText('Synthetic');
  await document.getByRole('button', { name: 'Evidence detail', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(/Project address:/i);
  await expect(page.getByRole('dialog')).toContainText('120 Example Lane');
});
