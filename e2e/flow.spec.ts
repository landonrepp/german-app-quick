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

  // Export: capture current rows, download CSV, validate content, then ensure rows disappear
  const rows = page.locator('tbody tr');
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(0);

  // Snapshot fronts/backs from UI
  const uiPairs: { front: string; back: string }[] = [];
  for (let i = 0; i < rowCount; i++) {
    const r = rows.nth(i);
    const f = await r.locator('textarea').nth(0).inputValue();
    const b = await r.locator('textarea').nth(1).inputValue();
    uiPairs.push({ front: f, back: b });
  }

  // Trigger download
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'export' }).click(),
  ]);

  // Save and read CSV
  const outPath = path.resolve('.tmp', `e2e_export_${Date.now()}.csv`);
  await download.saveAs(outPath);
  const csv = fs.readFileSync(outPath, 'utf8');
  expect(csv.length).toBeGreaterThan(0);

  const lines = csv.split(/\r?\n/).filter((l) => l.length > 0);
  expect(lines.length).toBe(rowCount);

  function textToHtmlMinified(s: string): string {
    return (s || '').replace(/\r\n|\r|\n/g, '<br/>').trim();
  }

  function parseLine(line: string): [string, string, string] {
    const trimmed = line.trim();
    expect(trimmed.startsWith('"')).toBeTruthy();
    expect(trimmed.endsWith('"')).toBeTruthy();
    const inner = trimmed.slice(1, -1);
    const parts = inner.split('","');
    expect(parts.length).toBe(3);
    const [id, csvFront, csvBack] = parts.map((p) => p.replace(/""/g, '"')) as [string, string, string];
    // Compare against HTML-minified values (newline -> <br/>)
    expect(
      uiPairs.some(
        (u) => textToHtmlMinified(u.front) === csvFront && textToHtmlMinified(u.back) === csvBack
      )
    ).toBeTruthy();
    return [id, csvFront, csvBack];
  }

  for (const line of lines) parseLine(line);

  // After export, the list should be empty (cards marked exported)
  await expect(page.getByText('No cards yet.')).toBeVisible({ timeout: 10000 });
});
