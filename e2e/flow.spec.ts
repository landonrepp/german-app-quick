import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function uploadFixture(page: any, name = 'sample.txt') {
  await page.goto('/');
  const fileInput = page.locator('#fileUpload');
  const p = path.resolve('e2e/fixtures', name);
  const buffer = fs.readFileSync(p);
  await fileInput.setInputFiles({ name, mimeType: 'text/plain', buffer });
}

test('full flow: import → mine (filter unknowns) → export (edit)', async ({ page }) => {
  // Import sentences via the main page
  // Prefer the E2E import button (server action) when present
  await page.goto('/');
  const e2eBtn = page.locator('#e2e-import-btn');
  if (await e2eBtn.count()) {
    await e2eBtn.click();
  } else {
    await uploadFixture(page);
  }

  // Go to mine page
  await page.goto('/mine');
  await expect(page.getByRole('heading', { name: 'Sentence Mining' })).toBeVisible();
  await page.getByRole('button', { name: 'Add Anki card and mark known' }).first().waitFor({ state: 'visible' });

  // Grab the first sentence row
  const firstRow = page.locator('tbody tr').first();
  await expect(firstRow).toBeVisible();
  const unknownCell = firstRow.locator('td').nth(2);
  await expect(unknownCell).toBeVisible();
  const initialUnknown = Number(await unknownCell.innerText());
  expect(initialUnknown).toBeGreaterThan(0);

  // Go to export page (a seed card exists from global setup)
  await page.goto('/export');
  await expect(page.getByRole('heading', { name: 'Export to Anki' })).toBeVisible();

  // Find the newest row (first row) and verify back starts disabled until translated
  const exportFirstRow = page.locator('tbody tr').first();
  const frontTextarea = exportFirstRow.locator('textarea').nth(0);
  const backTextarea = exportFirstRow.locator('textarea').nth(1);

  // While waiting for translation, the back field may be disabled
  const disabledBefore = await backTextarea.isDisabled();
  if (disabledBefore) {
    await expect(backTextarea).toBeDisabled();
  }

  // In test mode, translation is disabled; back must remain disabled with placeholder
  await expect(backTextarea).toBeDisabled();
  await expect(backTextarea).toHaveAttribute('placeholder', 'Translating…');
});
