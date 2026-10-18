import { test, expect } from '@playwright/test';

async function home(page) {
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.route('https://sac-test.supabase.co/**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
    await page.goto('/index.html');
    await expect(page.getByRole('button', { name: 'Dark mode', exact: true })).toBeVisible();
}

test('homepage always starts light, even after a saved dark preference or reload', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.addInitScript(() => localStorage.setItem('cygnus-home-theme', 'dark'));
    await home(page);
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(237, 236, 232)');
    await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(9, 10, 12)');
    await page.reload();
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(237, 236, 232)');
    await expect(page.getByRole('button', { name: 'Dark mode', exact: true })).toBeVisible();
});

test('premium skin covers the whole page and keeps content and the transparent robot intact', async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await home(page);
    await expect(page.locator('#projects-slider')).toContainText('New projects are on the way.');
    const content = () => page.locator('.page-wrapper').evaluate(el => ({ text: el.textContent, links: [...el.querySelectorAll('a')].map(link => link.getAttribute('href')) }));
    const before = await content();
    await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
    expect(await content()).toEqual(before);
    for (const selector of ['.section-two', '.section-four', '.section-five', '.club-identity']) {
        await expect(page.locator(selector)).toHaveCSS('background-color', 'rgb(16, 18, 21)');
    }
    await expect(page.locator('.home-memories')).toHaveCSS('background-color', 'rgb(24, 27, 32)');
    await expect(page.locator('.hero-main iframe')).toHaveCSS('color-scheme', 'light');
    await expect(page.locator('.navbar .cygnus-name')).toHaveCSS('background-image', /cygnus-dark-web/);
    await page.screenshot({ path: info.outputPath('premium-dark-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: 'Light mode', exact: true }).focus();
    await page.keyboard.press('Space');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(237, 236, 232)');
});

test('theme stays outside the header on the left, separate from robot pause', async ({ page }, info) => {
    await home(page);
    await page.mouse.move(700, 500);
    const robot = page.locator('.cursor-robo-toggle');
    await expect(robot).toBeVisible();
    const theme = page.locator('.home-theme-toggle');
    await expect(page.locator('header .home-theme-toggle')).toHaveCount(0);
    await expect(theme).toHaveCSS('position', 'fixed');
    for (const width of [901, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        const themeBox = await theme.boundingBox();
        const robotBox = await robot.boundingBox();
        expect(themeBox.x).toBeLessThan(32);
        expect(themeBox.x + themeBox.width + 24).toBeLessThan(robotBox.x);
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('[data-page-repair]')).toBeHidden();
    await expect(robot).toBeHidden();
    await theme.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: info.outputPath('premium-dark-mobile.png') });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('second-section video plays visibly in dark mode', async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await home(page);
    await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
    const video = page.locator('.section-two video');
    await video.scrollIntoViewIfNeeded();
    await expect.poll(() => video.evaluate(el => el.readyState)).toBeGreaterThanOrEqual(2);
    const start = await video.evaluate(el => el.currentTime);
    await expect.poll(() => video.evaluate(el => el.currentTime)).toBeGreaterThan(start + 0.2);
    await page.screenshot({ path: info.outputPath('second-section-dark.png') });
    await expect(video).not.toHaveCSS('mix-blend-mode', 'multiply');
});
