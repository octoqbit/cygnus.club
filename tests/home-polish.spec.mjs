import {test, expect} from '@playwright/test';

async function home(page) {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  const events = ['Robotics workshop', 'Build with your team', 'Explore connected devices'].map((title, index) => ({
    id: `event-${index}`, kind: 'event', slug: `workshop-${index}`, title,
    summary: 'Meet fellow makers and build something together at our next hands-on workshop.',
    image: '/about-assets/robot-workbench-720.webp', image_alt: 'Robotics workbench',
    tags: ['Robotics', 'Workshop'], data: {homeBeyond: true, date: 'November 15, 2026'},
  }));
  await page.route('https://sac-test.supabase.co/**', route => {
    const url = new URL(route.request().url());
    return route.fulfill({contentType: 'application/json', body: JSON.stringify(
      url.pathname.endsWith('/content') && url.searchParams.get('kind') === 'eq.event' ? events : []
    )});
  });
  await page.goto('/');
  await expect(page.locator('.home-event-count')).toHaveText('01 / 03');
}

test('event carousel gives readers time and preserves manual and reduced-motion controls', async ({page}) => {
  await page.clock.install();
  await home(page);
  const count = page.locator('.home-event-count');
  const viewport = page.locator('.home-event-viewport');
  await viewport.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(150); // Allow viewport visibility to reach the observer.
  await page.clock.runFor(4000);
  await expect(count).toHaveText('01 / 03');
  await page.clock.runFor(2100);
  await expect(count).toHaveText('02 / 03');
  await viewport.hover();
  await page.clock.runFor(12000);
  await expect(count).toHaveText('02 / 03');
  await page.mouse.move(0, 0);
  await page.clock.runFor(6100);
  await expect(count).toHaveText('03 / 03');
  await page.getByRole('button', {name: 'Pause automatic slides', exact: true}).click();
  await viewport.hover();
  await page.mouse.move(0, 0);
  await page.clock.runFor(12000);
  await expect(count).toHaveText('03 / 03');
  await page.getByRole('button', {name: 'Next event', exact: true}).click();
  await expect(count).toHaveText('01 / 03');
  await page.getByRole('button', {name: 'Start automatic slides', exact: true}).click();
  await page.clock.runFor(6100);
  await expect(count).toHaveText('02 / 03');
  await page.emulateMedia({reducedMotion: 'reduce'});
  await expect(page.getByRole('button', {name: 'Start automatic slides', exact: true})).toBeVisible();
  await page.clock.runFor(12000);
  await expect(count).toHaveText('02 / 03');
  await page.getByRole('button', {name: 'Next event', exact: true}).click();
  await expect(count).toHaveText('03 / 03');
});

for (const width of [360, 768, 1440]) {
  test(`populated homepage remains readable within ${width}px`, async ({page}, info) => {
    await page.setViewportSize({width, height: 1000});
    await page.emulateMedia({reducedMotion: 'reduce'});
    await home(page);
    await page.locator('.s2-content-grid').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    for (const selector of ['.home-builder-card', '.home-event-copy', '.home-event-controls']) {
      const boxes = await page.locator(selector).evaluateAll(elements => elements.map(el => ({width: el.clientWidth, content: el.scrollWidth})));
      for (const box of boxes) expect(box.content).toBeLessThanOrEqual(box.width + 1);
    }
    await page.locator('.s2-content-grid').screenshot({path: info.outputPath(`home-cards-${width}.png`)});
  });
}
