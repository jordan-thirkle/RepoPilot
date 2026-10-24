import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(process.cwd());
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

const server = createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  const filePath = resolve(root, `.${pathname}`);
  if (filePath !== root && !filePath.startsWith(root + sep)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404).end('Not found');
    return;
  }

  response.writeHead(200, {
    'content-type': mimeTypes[extname(filePath)] || 'application/octet-stream',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  createReadStream(filePath).pipe(response);
});

await new Promise((resolveListen, rejectListen) => {
  server.once('error', rejectListen);
  server.listen(0, '127.0.0.1', resolveListen);
});

const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
let browser;

try {
  browser = await chromium.launch({ headless: true });
  const viewportSizes = [
    [320, 700], [360, 780], [375, 812], [390, 844], [430, 932],
    [540, 900], [600, 900], [768, 1024], [769, 900], [820, 1180],
    [1024, 768], [1280, 800], [1440, 900], [1920, 1080]
  ];

  for (const [width, height] of viewportSizes) {
    const context = await browser.newContext({
      viewport: { width, height },
      colorScheme: 'light',
      reducedMotion: 'reduce'
    });
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseUrl });
    const page = await context.newPage();
    const pageErrors = [];
    const failedLocalRequests = [];
    const externalRequests = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('requestfailed', (request) => {
      if (request.url().startsWith(baseUrl)) failedLocalRequests.push(request.url());
      else externalRequests.push(request.url());
    });
    page.on('request', (request) => {
      if (!request.url().startsWith(baseUrl)) externalRequests.push(request.url());
    });

    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    const metrics = await page.evaluate(() => {
      const title = document.querySelector('h1');
      const titleBox = title.getBoundingClientRect();
      const cta = document.querySelector('.button-primary').getBoundingClientRect();
      return {
        pageTitle: document.title,
        viewport: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        headingCount: document.querySelectorAll('h1').length,
        headingLeft: titleBox.left,
        headingRight: titleBox.right,
        ctaHeight: cta.height,
        background: getComputedStyle(document.body).backgroundColor,
        hasDescription: Boolean(document.querySelector('meta[name="description"]'))
      };
    });

    assert.equal(metrics.headingCount, 1, `Expected one H1 at viewport ${width}px`);
    assert.ok(metrics.hasDescription, `Missing description metadata at ${width}px`);
    assert.ok(metrics.documentWidth <= width + 1, `Horizontal page overflow at ${width}px: document ${metrics.documentWidth}px`);
    assert.ok(metrics.bodyWidth <= width + 1, `Body overflow at ${width}px: body ${metrics.bodyWidth}px`);
    assert.ok(metrics.headingLeft >= -1 && metrics.headingRight <= width + 1, `Heading escapes viewport at ${width}px`);
    assert.ok(metrics.ctaHeight >= 44, `Primary CTA target too short at ${width}px: ${metrics.ctaHeight}px`);
    assert.equal(metrics.pageTitle, 'RepoPilot — GitHub work, in your words');
    assert.deepEqual(pageErrors, [], `JavaScript errors at ${width}px: ${pageErrors.join('; ')}`);
    assert.deepEqual(failedLocalRequests, [], `Local assets failed at ${width}px`);
    assert.deepEqual(externalRequests, [], `Unexpected external network requests at ${width}px`);

    const menu = page.locator('[data-menu-toggle]');
    const desktopNav = page.locator('.desktop-nav');
    const mobileNav = page.locator('#mobile-nav');

    if (width <= 768) {
      assert.equal(await menu.isVisible(), true, `Mobile menu missing at ${width}px`);
      await menu.click();
      assert.equal(await menu.getAttribute('aria-expanded'), 'true', `Menu did not expand at ${width}px`);
      assert.equal(await mobileNav.isVisible(), true, `Expanded navigation is not visible at ${width}px`);
      await page.keyboard.press('Escape');
      assert.equal(await menu.getAttribute('aria-expanded'), 'false', `Escape did not close menu at ${width}px`);
      assert.equal(await mobileNav.isVisible(), false, `Escape did not hide menu at ${width}px`);
      assert.equal(await menu.evaluate((element) => element === document.activeElement), true, `Escape did not restore menu focus at ${width}px`);
    } else {
      assert.equal(await menu.isVisible(), false, `Mobile menu should be hidden at ${width}px`);
      assert.equal(await desktopNav.isVisible(), true, `Desktop navigation should be visible at ${width}px`);
    }

    if (width === 390) {
      const firstCopy = page.locator('[data-copy]').first();
      const copyBounds = await firstCopy.boundingBox();
      assert.ok(copyBounds && copyBounds.width >= 44 && copyBounds.height >= 44, 'Copy prompt button must have a usable touch target');
      await firstCopy.click();
      await page.waitForFunction(
        () => /Prompt copied|Copy was blocked/.test(document.querySelector('#copy-feedback')?.textContent ?? ''),
        null,
        { timeout: 5000 }
      );
      assert.match(await page.locator('#copy-feedback').innerText(), /Prompt copied/, 'Copy action did not report success');
      assert.match(await page.locator('[data-copy]').first().getAttribute('aria-label'), /copied/i, 'Copy action did not announce its state');
      assert.equal(
        await page.evaluate(() => navigator.clipboard.readText()),
        await firstCopy.getAttribute('data-copy'),
        'Clipboard should contain the exact prompt'
      );
    }

    console.log(`PASS ${width}x${height}: no overflow, navigation and CTA layout valid`);
    await context.close();
  }

  const darkContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: 'dark',
    reducedMotion: 'reduce'
  });
  const darkPage = await darkContext.newPage();
  await darkPage.goto(baseUrl, { waitUntil: 'networkidle' });
  const darkBackground = await darkPage.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor);
  assert.equal(darkBackground, 'rgb(17, 20, 15)', `Dark theme did not apply: ${darkBackground}`);
  console.log('PASS dark scheme: system preference is respected');
  await darkContext.close();

  console.log(`Responsive browser checks passed across ${viewportSizes.length} viewport sizes, plus dark mode and menu/copy interactions.`);
} finally {
  if (browser) await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
