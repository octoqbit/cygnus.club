import { test, expect } from '@playwright/test';

test.beforeEach(async({page})=>{await page.route('https://sac-test.supabase.co/**',route=>route.fulfill({contentType:'application/json',body:'[]'}));});

for (const width of [375,1440]) {
  test(`CYGNUS branding fits public pages and portals at ${width}px`, async ({page},info) => {
    test.setTimeout(90000);
    await page.setViewportSize({width,height:900});
    await page.route('https://sac-test.supabase.co/rest/v1/**',route=>route.fulfill({
      contentType:'application/json',body:JSON.stringify(route.request().url().includes('/site_content')
        ? [{id:'home-001-0',value:'SENSING & AUTOMATION CLUB'}, {id:'events-043',value:'SAC / SENSING & AUTOMATION CLUB'}] : [])
    }));
    for (const path of ['index','about','join','events','projects','project','team','privacy','cookies','terms','account','admin']) {
      await page.goto(`/${path}.html`);
      const brand=page.locator('.cygnus-brand').first();
      await expect(brand).toBeVisible();
      await expect(brand.locator('.cygnus-name')).toHaveText('CYGNUS');
      await expect(brand.locator('.cygnus-descriptor')).toHaveText('The Technical Club');
      await expect(brand.locator('.cygnus-descriptor')).toBeVisible();
      if (['index','join'].includes(path)) {
        await expect(page.locator('footer .cygnus-descriptor')).toHaveText('The Technical Club');
      } else {
        await expect(page.locator('footer .cygnus-descriptor')).toHaveCount(0);
      }
      await expect(brand.locator('.cygnus-name')).toHaveCSS('background-image', /cygnus-(?:light|dark)-web\.webp/);
      await expect(brand.locator('img')).toHaveJSProperty('complete',true);
      expect(await brand.locator('img').evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
      if (['events','projects','project','account','admin'].includes(path)) {
        await expect(brand.locator('img')).toHaveAttribute('src','/brand/cygnus-dark-web.webp');
        await expect(brand.locator('.cygnus-name')).toHaveCSS('background-image', /cygnus-dark-web\.webp/);
        await expect(brand.locator('.cygnus-name')).toHaveCSS('mix-blend-mode', 'screen');
        await expect(brand.locator('.cygnus-symbol-dark')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
      } else {
        await expect(brand.locator('img')).toHaveAttribute('src','/brand/cygnus-symbol-web.png');
      }
      const box=await brand.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x+box.width).toBeLessThanOrEqual(width);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
      await expect(page).toHaveTitle(/CYGNUS/);
      await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href','/cygnus-favicon.svg');
      if (['index','events','projects','team','account','admin'].includes(path)) await page.screenshot({path:info.outputPath(`${path}-${width}.png`)});
      if(path==='index') {
        await expect(page.locator('[data-cms="home-001"]')).toHaveText('CYGNUS');
        const robot=page.frameLocator('iframe[title="CYGNUS robot assembly"]');
        await expect(robot.locator('.cygnus-chip-wordmark')).toHaveAttribute('aria-label','CYGNUS');
        await expect(robot.locator('.cygnus-chip-wordmark image')).toHaveAttribute('href','../brand/cygnus-dark-web.webp');
      }
      if(path==='events') await expect(page.locator('.ev-footer > a')).toHaveText('CYGNUS');
    }
  });
}

test('Help Center opens on the current page and closes accessibly', async ({ page }, info) => {
  for (const [index, path] of ['index','join','about','events','projects','team','privacy','cookies','terms'].entries()) {
    await page.setViewportSize(index % 2 ? {width:375,height:812} : {width:1440,height:1000});
    await page.goto(`/${path}.html`);
    const url = page.url();
    const trigger = page.getByRole('button', {name:'Help Center',exact:true});
    await trigger.click();
    const banner = page.getByRole('dialog', {name:'Contact Team CYGNUS'});
    await expect(banner).toBeVisible();
    await expect(banner.getByText('cygnus@btkit.org', {exact:true})).toBeVisible();
    await expect(banner.getByRole('link', {name:'cygnus@btkit.org',exact:true})).toHaveAttribute('href', 'mailto:cygnus@btkit.org');
    await expect(page).toHaveURL(url);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const box = await banner.boundingBox();
    const viewport = page.viewportSize();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    if (path==='index' || path==='join') await page.screenshot({path:info.outputPath(`help-${path}.png`)});
    if (index % 2) await banner.getByRole('button', {name:'Close Help Center'}).click();
    else await page.keyboard.press('Escape');
    await expect(banner).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await page.mouse.click(5,5);
    await expect(banner).not.toBeVisible();
    await expect(page).toHaveURL(url);
  }
});

test('policy links work and policy pages fit mobile screens', async ({ page }) => {
  await page.goto('/index.html');
  const footer = page.locator('footer.site-footer');
  await expect(footer.getByRole('button', { name: 'Help Center', exact: true })).toBeVisible();
  for (const [label, path] of [['Privacy Policy','privacy'],['Cookie Policy','cookies'],['Terms of Service','terms']]) {
    await expect(footer.getByRole('link', { name: label })).toHaveAttribute('href', `${path}.html`);
  }
  await page.setViewportSize({width:375,height:812});
  for (const [label, path] of [['Privacy Policy','privacy'],['Cookie Policy','cookies'],['Terms of Service','terms']]) {
    const response = await page.goto(`/${path}.html`);
    expect(response.status()).toBe(200);
    await expect(page.getByRole('heading', {level:1})).toHaveText(label);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://saclub.tech/${path}.html`);
  }
});

test('public SEO assets identify the club in Dwarahat and exclude member portals from sitemap', async ({ page, request }) => {
  await page.goto('/index.html');
  await expect(page).toHaveTitle('CYGNUS | The Technical Club, Dwarahat');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://saclub.tech/index.html');
  const club = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  expect(club.url).toBe('https://saclub.tech/index.html');
  expect(club.alternateName).toContain('CYGNUS Dwarahat');
  expect(club.address.addressLocality).toBe('Dwarahat');
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain('https://saclub.tech/privacy.html');
  expect(await sitemap.text()).toContain('<loc>https://saclub.tech/index.html</loc>');
  expect(await sitemap.text()).not.toMatch(/account|admin/);
  for(const path of ['account','admin']){
    await page.goto(`/${path}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  }
});
