import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('registration and login remain keyboard-accessible', async ({ page }) => {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Password', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await expect(page.getByLabel('Full name')).toBeVisible();
  await page.waitForTimeout(800);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
});

test('approved public auth design has a desktop baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/auth');
  await page.waitForTimeout(800);
  await page.addStyleTag({ content: '* { animation: none !important; caret-color: transparent !important; }' });
  await expect(page).toHaveScreenshot('auth-desktop.png', { animations: 'allow', fullPage: true, maxDiffPixelRatio: 0.01 });
});

test('approved public auth design has a mobile baseline', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/auth');
  await page.waitForTimeout(800);
  await page.addStyleTag({ content: '* { animation: none !important; caret-color: transparent !important; }' });
  await expect(page).toHaveScreenshot('auth-mobile.png', { animations: 'allow', fullPage: true, maxDiffPixelRatio: 0.01 });
});
