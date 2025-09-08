import { test, expect } from '@playwright/test';

test('serves homepage and static assets', async ({ page, request, baseURL }) => {
  const url = baseURL || 'http://127.0.0.1:3335';
  const resp = await request.get(url + '/');
  expect(resp.ok()).toBeTruthy();

  // Basic UI smoke: heading or file upload label should be present
  await page.goto(url + '/');
  await expect(page.getByText('Lang App')).toBeVisible();
  await expect(page.getByText('Choose a file to sentence mine')).toBeVisible();

  // Probe one known static asset path from build output if available
  const chunkResp = await request.get(url + '/_next/static/chunks/964-02efbd2195ef91bd.js');
  expect(chunkResp.status(), 'chunk js should be served').toBe(200);
});

