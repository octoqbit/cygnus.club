import {test, expect} from '@playwright/test';

async function publicData(page) {
  await page.route('https://sac-test.supabase.co/rest/v1/**', route => route.fulfill({contentType:'application/json', body:'[]'}));
}

for (const width of [360, 768, 1366]) {
  test(`optimized public pages fit ${width}px without broken assets`, async ({page}, info) => {
    await publicData(page);
    await page.setViewportSize({width, height:900});
    const failures = [], originals = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('response', response => {
      if (response.url().startsWith('http://127.0.0.1:5178/') && response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
    });
    page.on('request', request => {
      if (/cygnus-(?:light-original|dark-original|symbol)\.png|college-logo\.png|(?:crew|banner_notext|project-atlas)\.jpg/.test(request.url())) originals.push(request.url());
    });
    for (const path of ['index','about','events','projects','team','join']) {
      await page.goto(`/${path}.html`);
      await expect(page.locator('.cygnus-brand').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBe(true);
      if (path === 'team') {
        const image = page.locator('.crew-hero-image');
        await image.scrollIntoViewIfNeeded();
        await expect(image).toHaveJSProperty('complete', true);
        expect(await image.evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
        if (width === 360) expect(await image.evaluate(img => img.currentSrc)).toMatch(/crew-640.*\.webp/);
      }
      if (['events','team'].includes(path)) await page.screenshot({path:info.outputPath(`${path}-${width}.png`)});
    }
    expect(failures).toEqual([]);
    expect(originals).toEqual([]);
  });
}

test('hero stops offscreen and reduced motion waits for explicit playback', async ({page}) => {
  await publicData(page);
  await page.goto('/');
  const video = page.frameLocator('iframe[title="CYGNUS robot assembly"]').locator('video');
  await expect(video).toHaveJSProperty('paused', false);
  await page.locator('footer.site-footer').scrollIntoViewIfNeeded();
  await expect(video).toHaveJSProperty('paused', true);
  await page.evaluate(() => window.scrollTo({top:0, behavior:'instant'}));
  await expect(video).toHaveJSProperty('paused', false);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(video).toHaveJSProperty('paused', true);
  const play = page.frameLocator('iframe[title="CYGNUS robot assembly"]').getByRole('button', {name:'Play animation'});
  await play.click();
  await expect(video).toHaveJSProperty('paused', false);
});

test('favicon stays small', async ({request}) => {
  const favicon = await request.get('/cygnus-favicon.svg');
  expect(favicon.ok()).toBe(true);
  expect((await favicon.body()).length).toBeLessThan(35000);
});

test('offscreen memories do not advance or fetch the next photo', async ({page}) => {
  await publicData(page);
  await page.goto('/');
  await expect(page.locator('.poster-count')).toHaveText('01 / 04');
  await page.clock.install();
  await page.clock.runFor(6000);
  await expect(page.locator('.poster-count')).toHaveText('01 / 04');
});
