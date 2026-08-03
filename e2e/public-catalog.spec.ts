import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

async function stubPublicCatalog(page: Page) {
  await page.route('**/api/home', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ resources: [], universities: [], contributors: [], categories: [], stats: { resources: 0, students: 0, universities: 0, downloads: 0 } }),
  }));
  await page.route('**/api/catalog/options', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ universities: [], courses: [], categories: [] }),
  }));
  await page.route('**/api/resources/search?*', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ resources: [], page: 1, pageSize: 18, total: 0, totalPages: 0, hasMore: false }),
  }));
  await page.route('**/api/universities?*', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ universities: [], page: 1, pageSize: 24, total: 0, totalPages: 0 }),
  }));
  await page.route('**/api/leaderboard?*', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ contributors: [], page: 1, pageSize: 20, total: 0, totalPages: 0 }),
  }));
}

async function prepare(page: Page, path: string, heading: string) {
  await stubPublicCatalog(page);
  await page.goto(path);
  await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; caret-color: transparent !important; }' });
}

for (const route of [
  { path: '/', heading: 'Find, Share & Learn Together.' },
  { path: '/explore', heading: 'Explore Resources' },
  { path: '/universities', heading: 'Universities' },
  { path: '/leaderboard', heading: 'Top Contributors' },
]) {
  test(`${route.path} has no serious accessibility violations`, async ({ page }) => {
    await prepare(page, route.path, route.heading);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  });

  test(`${route.path} retains its desktop design baseline`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await prepare(page, route.path, route.heading);
    await expect(page).toHaveScreenshot(`${route.heading.toLowerCase().replace(/[^a-z]+/g, '-')}-desktop.png`, { animations: 'allow', maxDiffPixelRatio: 0.01 });
  });

  test(`${route.path} retains its mobile design baseline`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepare(page, route.path, route.heading);
    await expect(page).toHaveScreenshot(`${route.heading.toLowerCase().replace(/[^a-z]+/g, '-')}-mobile.png`, { animations: 'allow', maxDiffPixelRatio: 0.01 });
  });
}
