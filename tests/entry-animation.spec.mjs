import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.route('https://sac-test.supabase.co/**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
});

test('entrance decodes, reveals the homepage, and only plays once per session', async ({ page }, info) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    const intro = page.getByRole('dialog', { name: 'Welcome to CYGNUS' });
    await expect(intro).toBeVisible();
    await expect(intro.locator('[data-wordmark]')).toHaveText('CYGNUS');
    await expect(intro.locator('[data-stage]')).toHaveText('02 / CORE SYNCHRONIZED');
    await page.screenshot({ path: info.outputPath('entry-desktop.png') });
    await expect(intro).toHaveCount(0, { timeout: 4500 });
    await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Light mode', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Light mode', exact: true })).toBeVisible();
    await expect(intro).toHaveCount(0);
    expect(errors).toEqual([]);
});

test('mobile entrance fits the viewport and reveals automatically without a skip button', async ({ page }, info) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const intro = page.getByRole('dialog', { name: 'Welcome to CYGNUS' });
    await expect(intro).toBeVisible();
    await expect(intro.locator('[data-stage]')).toHaveText('02 / CORE SYNCHRONIZED');
    expect(await intro.evaluate(el => el.scrollWidth <= innerWidth && el.scrollHeight <= innerHeight)).toBe(true);
    await page.screenshot({ path: info.outputPath('entry-mobile.png') });
    await expect(intro.getByRole('button')).toHaveCount(0);
    await expect(intro).toHaveCount(0, { timeout: 4500 });
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.getByRole('button', { name: 'Close navigation' })).toBeVisible();
});

test('Escape releases the page and changing motion preference dismisses the intro', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.cygnus-entry')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.cygnus-entry')).toHaveCount(0);
    await page.evaluate(() => sessionStorage.removeItem('cygnus-entry-seen-v1'));
    await page.reload();
    await expect(page.locator('.cygnus-entry')).toBeVisible();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('.cygnus-entry')).toHaveCount(0);
    await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
});

test('reduced motion and direct section links open without an entrance', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Dark mode', exact: true })).toBeVisible();
    await expect(page.locator('.cygnus-entry')).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/index.html#projects');
    await expect(page.locator('.cygnus-entry')).toHaveCount(0);
    await page.goto('/join.html');
    await expect(page.getByLabel('Choose your password')).toBeVisible();
    await expect(page.locator('.cygnus-entry')).toHaveCount(0);
});
