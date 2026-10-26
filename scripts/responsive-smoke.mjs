import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const axeCorePath = require.resolve('axe-core');

async function runAxeAudit(page) {
  await page.addScriptTag({ path: axeCorePath });
  return page.evaluate(async () => {
    const results = await window.axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
      }
    });
    return results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.map((node) => node.target.join(' '))
    }));
  });
}

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
const screenshotDirectory = join(root, 'artifacts', 'screenshots');
await mkdir(screenshotDirectory, { recursive: true });
const screenshotManifest = {
  repository: process.env.GITHUB_REPOSITORY ?? 'local',
  // For pull_request events GITHUB_SHA is the merge ref actually tested;
  // headRevision/baseRevision identify the PR source and target for comparison.
  sourceRevision: process.env.GITHUB_SHA ?? 'unknown',
  headRevision: process.env.REPOPILOT_HEAD_SHA ?? process.env.GITHUB_SHA ?? 'unknown',
  baseRevision: process.env.REPOPILOT_BASE_SHA || null,
  eventName: process.env.GITHUB_EVENT_NAME ?? 'local',
  ref: process.env.GITHUB_REF ?? 'unknown',
  workflowRunId: process.env.GITHUB_RUN_ID ?? null,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT ? Number(process.env.GITHUB_RUN_ATTEMPT) : null,
  captures: []
};
let suitePassed = false;
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
    const consoleErrors = [];
    const httpErrors = [];
    const failedLocalRequests = [];
    const externalRequests = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('response', (response) => {
      if (response.url().startsWith(baseUrl) && response.status() >= 400) {
        httpErrors.push(`${response.status()} ${response.url()}`);
      }
    });
    page.on('requestfailed', (request) => {
      if (request.url().startsWith(baseUrl)) failedLocalRequests.push(request.url());
      else externalRequests.push(request.url());
    });
    page.on('request', (request) => {
      if (!request.url().startsWith(baseUrl)) externalRequests.push(request.url());
    });

    const documentResponse = await page.goto(baseUrl, { waitUntil: 'networkidle' });
    assert.equal(documentResponse?.status(), 200, `Homepage must return HTTP 200 at ${width}px`);

    // Keep a compact visual record at one real mobile and desktop size.
    // Capture before assertions so a broken layout can still be inspected in CI.
    if (width === 390 || width === 1440) {
      const profile = width === 390 ? 'mobile-390x844' : 'desktop-1440x900';
      const viewportFile = `${profile}-viewport.png`;
      const fullPageFile = `${profile}-full.png`;
      await page.screenshot({
        path: join(screenshotDirectory, viewportFile),
        fullPage: false,
        animations: 'disabled'
      });
      await page.screenshot({
        path: join(screenshotDirectory, fullPageFile),
        fullPage: true,
        animations: 'disabled'
      });
      screenshotManifest.captures.push(
        { file: viewportFile, viewport: { width, height }, fullPage: false, colorScheme: 'light' },
        { file: fullPageFile, viewport: { width, height }, fullPage: true, colorScheme: 'light' }
      );
    }

    const metrics = await page.evaluate(() => {
      const title = document.querySelector('h1');
      const titleBox = title.getBoundingClientRect();
      const cta = document.querySelector('.button-primary').getBoundingClientRect();
      return {
        pageTitle: document.title,
        viewport: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
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
    if ((width === 390 && height === 844) || (width === 1440 && height === 900)) {
      assert.ok(metrics.documentHeight <= height + 1, `Compact layout should fit one viewport at ${width}x${height}: page is ${metrics.documentHeight}px tall`);
    }
    assert.deepEqual(pageErrors, [], `JavaScript errors at ${width}px: ${pageErrors.join('; ')}`);
    assert.deepEqual(consoleErrors, [], `Console errors at ${width}px: ${consoleErrors.join('; ')}`);
    assert.deepEqual(httpErrors, [], `Local HTTP error responses at ${width}px: ${httpErrors.join('; ')}`);
    assert.deepEqual(failedLocalRequests, [], `Local assets failed at ${width}px`);
    assert.deepEqual(externalRequests, [], `Unexpected external network requests at ${width}px`);

    if (width === 390) {
      const violations = await runAxeAudit(page);
      assert.deepEqual(violations, [], `axe-core WCAG violations on the light theme: ${JSON.stringify(violations)}`);
      console.log('PASS axe-core: no WCAG 2.0/2.1 A/AA or WCAG 2.2 AA violations on the light theme');
    }

    const primaryNav = page.locator('.primary-nav');
    const sourceLink = page.locator('.site-footer .footer-links a[href="https://github.com/jordan-thirkle/RepoPilot"]');
    const chatCta = page.locator('.nav-cta');
    assert.equal(await primaryNav.isVisible(), true, `Primary navigation must stay visible at ${width}px`);
    assert.equal(await sourceLink.isVisible(), true, `Repository link must stay available at ${width}px`);
    const chatCtaBounds = await chatCta.boundingBox();
    assert.ok(chatCtaBounds && chatCtaBounds.height >= 44, `Header CTA target is too short at ${width}px`);

    if (width === 390) {
      const firstCopy = page.locator('[data-copy]').first();
      const copyBounds = await firstCopy.boundingBox();
      assert.ok(copyBounds && copyBounds.width >= 44 && copyBounds.height >= 44, 'Copy prompt button must have a usable touch target');
      await firstCopy.focus();
      await page.keyboard.press('Enter');
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
  const darkPageErrors = [];
  const darkConsoleErrors = [];
  const darkHttpErrors = [];
  darkPage.on('pageerror', (error) => darkPageErrors.push(error.message));
  darkPage.on('console', (message) => { if (message.type() === 'error') darkConsoleErrors.push(message.text()); });
  darkPage.on('response', (response) => {
    if (response.url().startsWith(baseUrl) && response.status() >= 400) darkHttpErrors.push(`${response.status()} ${response.url()}`);
  });
  const darkResponse = await darkPage.goto(baseUrl, { waitUntil: 'networkidle' });
  assert.equal(darkResponse?.status(), 200, 'Homepage must return HTTP 200 in dark mode');
  const darkBackground = await darkPage.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor);
  assert.equal(darkBackground, 'rgb(17, 20, 15)', `Dark theme did not apply: ${darkBackground}`);
  const darkViolations = await runAxeAudit(darkPage);
  assert.deepEqual(darkViolations, [], `axe-core WCAG violations on the dark theme: ${JSON.stringify(darkViolations)}`);
  assert.deepEqual(darkPageErrors, [], `JavaScript errors in dark mode: ${darkPageErrors.join('; ')}`);
  assert.deepEqual(darkConsoleErrors, [], `Console errors in dark mode: ${darkConsoleErrors.join('; ')}`);
  assert.deepEqual(darkHttpErrors, [], `Local HTTP errors in dark mode: ${darkHttpErrors.join('; ')}`);
  console.log('PASS dark scheme and axe-core: preference is respected with no scanned WCAG violations');
  await darkContext.close();

  console.log(`Responsive browser checks passed across ${viewportSizes.length} viewport sizes, plus dark mode and menu/copy interactions.`);
  suitePassed = true;
} finally {
  try {
    if (browser) await browser.close();
  } finally {
    screenshotManifest.checksPassed = suitePassed;
    screenshotManifest.finishedAt = new Date().toISOString();
    await writeFile(join(screenshotDirectory, 'manifest.json'), `${JSON.stringify(screenshotManifest, null, 2)}\n`, 'utf8');
    await new Promise((resolveClose) => server.close(resolveClose));
  }
}
