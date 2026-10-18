import { test, expect } from '@playwright/test';

const pages = ['index', 'about', 'projects', 'events', 'team', 'join'];
const destinations = [['Home', 'index.html'], ['About', 'about.html'], ['Projects', 'projects.html'], ['Events', 'events.html'], ['Team', 'team.html']];

async function mockSession(page, { signedIn = false, status = 'approved', expired = false, avatar = 'rocket', role = 'member', pronouns = 'she/her' } = {}) {
    const id = '00000000-0000-4000-8000-000000000002';
    const user = { id, email: 'member@example.test', email_confirmed_at: '2026-01-01', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01' };
    const session = { access_token: 'test-access-token', refresh_token: 'test-refresh-token', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user };
    if (signedIn) await page.addInitScript(session => localStorage.setItem('sb-sac-test-auth-token', JSON.stringify(session)), { ...session, expires_at: expired ? Math.floor(Date.now() / 1000) - 3600 : session.expires_at });
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.route('https://sac-test.supabase.co/**', route => {
        const url = new URL(route.request().url());
        let data = [];
        if (url.pathname.endsWith('/token')) data = session;
        else if (url.pathname.endsWith('/user')) data = user;
        else if (url.pathname.endsWith('/logout')) data = {};
        else if (url.pathname.endsWith('/profiles')) data = { id, name: 'New Maker', email: user.email, status, role, avatar, submitted_at: '2026-01-01', department: 'CS', study_year: '2', interests: [], pronouns };
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
    });
    return session;
}

async function expectHeaderFits(page, width) {
    await expect(page.locator('header')).toHaveCount(1);
    await expect(page.locator('[data-mobile-account]')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    const header = page.locator('header').first();
    const brand = await header.locator('.cygnus-brand').boundingBox();
    const account = await header.locator('[data-mobile-account]').boundingBox();
    const menu = await header.getByRole('button', { name: /navigation/ }).boundingBox();
    expect(brand.x).toBeGreaterThanOrEqual(0);
    expect(menu.x + menu.width).toBeLessThanOrEqual(width);
    expect(menu.width).toBeGreaterThanOrEqual(44);
    if (account) {
        expect(account.width).toBeGreaterThanOrEqual(44);
        expect(brand.x + brand.width).toBeLessThanOrEqual(account.x);
        expect(account.x + account.width).toBeLessThanOrEqual(menu.x);
    }
}

for (const signedIn of [false, true]) {
    test(`${signedIn ? 'new applicants' : 'visitors'} keep all mobile page links`, async ({ page }, info) => {
        test.setTimeout(90000);
        await mockSession(page, { signedIn, status: 'pending' });
        for (const name of pages) {
            await page.setViewportSize({ width: 375, height: 812 });
            await page.goto(`/${name}.html`);
            const account = page.getByRole('link', { name: 'Your account', exact: true });
            if (signedIn) {
                await expect(account).toBeVisible();
                await expect(account.getByRole('img', { name: 'Rocket' })).toHaveText('🚀');
            }
            else await expect(account).toBeHidden();
            const menu = page.getByRole('button', { name: 'Open navigation' });
            await menu.click();
            const nav = page.getByRole('navigation', { name: 'Main navigation' });
            for (const [label, href] of destinations) {
                await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
                await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', href);
            }
            for (const label of ['Sign in', 'Join CYGNUS']) {
                if (signedIn) await expect(nav.getByRole('link', { name: label, exact: true })).toBeHidden();
                else await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
            }
            await page.keyboard.press('Escape');
            await expect(nav).toBeHidden();
            await expect(menu).toBeFocused();
            for (const width of [320, 375, 768, 900]) {
                await page.setViewportSize({ width, height: 812 });
                await expectHeaderFits(page, width);
            }
            if (name === 'index') {
                await expect(page.locator('.hero-left a:visible')).toHaveCount(1);
                await expect(page.locator('.hero-left a:visible')).toHaveAttribute('href', signedIn ? 'projects.html' : 'join.html');
                await expect(page.locator('.hero-left a:visible')).toContainText(signedIn ? 'EXPLORE' : 'JOIN CLUB');
                await expect(page.locator('[data-page-repair]')).toBeHidden();
                await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
                await expectHeaderFits(page, 900);
                for (const width of [901, 1440]) {
                    await page.setViewportSize({ width, height: 1000 });
                    await expect(page.locator('.hero-left a:visible')).toHaveCount(1);
                    await expect(page.locator('.hero-left a:visible')).toHaveAttribute('href', 'projects.html');
                    await expect(page.locator('[data-nav-page="about"]')).toHaveCSS('border-left-width', '1px');
                    await expect(page.locator('[data-nav-page="about"]')).toHaveCSS('border-left-style', 'solid');
                }
                if (!signedIn) await page.screenshot({ path: info.outputPath('desktop-guest-header.png') });
                await page.setViewportSize({ width: 375, height: 812 });
                await expect(page.locator('.hero-left a:visible')).toHaveAttribute('href', signedIn ? 'projects.html' : 'join.html');
            }
            if (signedIn && ['index', 'projects', 'events'].includes(name)) {
                await page.setViewportSize({ width: 375, height: 812 });
                await page.evaluate(() => document.activeElement?.blur());
                await page.waitForTimeout(400); // Let resize painting and palette transitions settle.
                await page.screenshot({ path: info.outputPath(`${name}-member-header.png`) });
            }
        }
    });
}

test('returning members see the mobile account while their token refreshes', async ({ page }) => {
    const session = await mockSession(page, { signedIn: true, expired: true });
    let releaseRefresh;
    const refreshReady = new Promise(resolve => { releaseRefresh = resolve; });
    let refreshStarted = false;
    await page.route('**/auth/v1/token**', async route => {
        refreshStarted = true;
        await refreshReady;
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(session) });
    });
    await page.setViewportSize({ width: 375, height: 812 });
    try {
        await page.goto('/index.html');
        await expect.poll(() => refreshStarted).toBe(true);
        await expect(page.getByRole('link', { name: 'Your account', exact: true })).toBeVisible({ timeout: 1500 });
        await expectHeaderFits(page, 375);
    } finally {
        releaseRefresh();
    }
    await expect(page.locator('#join-sac-btn')).toHaveAttribute('href', '/account');
});

test('account shortcut updates immediately on sign-in and sign-out', async ({ page }) => {
    await mockSession(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/index.html');
    await page.evaluate(async () => {
        const { supabase } = await import('/lib/supabase.js');
        const { error } = await supabase.auth.signInWithPassword({ email: 'member@example.test', password: 'test-password' });
        if (error) throw error;
    });
    await expect(page.getByRole('link', { name: 'Your account', exact: true })).toBeVisible();
    await expect(page.locator('[data-home-cta="member"]')).toBeVisible();
    await expect(page.locator('[data-home-cta="guest"]')).toBeHidden();
    await expect(page.locator('[data-mobile-account]').getByRole('img', { name: 'Rocket' })).toBeVisible();
    await expect(page.locator('#join-sac-btn')).toHaveAttribute('href', '/account');
    await page.evaluate(async () => {
        const { supabase } = await import('/lib/supabase.js');
        await supabase.auth.signOut();
    });
    await expect(page.getByRole('link', { name: 'Your account', exact: true })).toBeHidden();
    await expect(page.locator('[data-home-cta="guest"]')).toBeVisible();
    await expect(page.locator('[data-home-cta="member"]')).toBeHidden();
    await expect(page.locator('#join-sac-btn')).toHaveAttribute('href', 'join.html');
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
});

test('account and page links navigate, with desktop controls preserved', async ({ page }) => {
    await mockSession(page, { signedIn: true });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/index.html');
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'About', exact: true }).click();
    await expect(page).toHaveURL(/about\.html$/);
    await page.getByRole('link', { name: 'Your account', exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
    await page.goto('/project.html?project=missing');
    await expect(page.getByRole('link', { name: 'Your account', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Open navigation' }).click();
    for (const [label, href] of destinations) {
        await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: label, exact: true })).toHaveAttribute('href', href);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/index.html');
    await expect(page.getByRole('link', { name: 'Your account', exact: true })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeHidden();
    await expect(page.locator('#join-sac-btn')).toHaveText(/ACCOUNT/);
    await expect(page.locator('.hero-left a:visible')).toHaveCount(1);
});

test('dots menu exposes every destination on a short phone in both themes', async ({ page }, info) => {
    await mockSession(page);
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/index.html');
    for (const theme of ['light', 'dark']) {
        if (theme === 'dark') await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
        await page.getByRole('button', { name: 'Open navigation' }).click();
        const nav = page.getByRole('navigation', { name: 'Main navigation' });
        for (const label of [...destinations.map(([label]) => label), 'Sign in', 'Join CYGNUS']) {
            const link = nav.getByRole('link', { name: label, exact: true });
            await expect(link).toBeInViewport({ ratio: 1 });
            await link.click({ trial: true });
        }
        await page.screenshot({ path: info.outputPath(`menu-${theme}.png`) });
        await page.getByRole('button', { name: 'Close navigation' }).click();
    }
    await page.locator('[data-home-cta="guest"]').click();
    await expect(page).toHaveURL(/join\.html$/);
});

test('header uses the same administrator avatar as the profile', async ({ page }) => {
    await mockSession(page, { signedIn: true, role: 'admin', pronouns: 'she/her' });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/index.html');
    const avatar = page.locator('[data-mobile-account]').getByRole('img', { name: 'Administrator technologist' });
    await expect(avatar).toHaveText('👩‍💻');
    await page.reload();
    await expect(avatar).toHaveText('👩‍💻');
    await page.getByRole('link', { name: 'Your account', exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
});

