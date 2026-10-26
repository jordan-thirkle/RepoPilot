import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const rawUrl = process.argv[2];
const expectedSha = process.env.EXPECTED_SHA;
const expectedRunId = process.env.EXPECTED_RUN_ID ?? null;
const maxAttempts = Number(process.env.SMOKE_MAX_ATTEMPTS ?? 6);
const retryDelayMs = Number(process.env.SMOKE_RETRY_DELAY_MS ?? 5000);

assert.ok(rawUrl, 'GitHub Pages deployment URL input is required');
assert.match(expectedSha ?? '', /^[0-9a-f]{40}$/i, 'EXPECTED_SHA must be a full Git commit SHA');
assert.ok(Number.isInteger(maxAttempts) && maxAttempts >= 1 && maxAttempts <= 12, 'SMOKE_MAX_ATTEMPTS must be 1–12');

const baseUrl = new URL(rawUrl);
assert.equal(baseUrl.protocol, 'https:', 'deployment URL must use HTTPS');
assert.equal(baseUrl.hostname, 'jordan-thirkle.github.io', 'unexpected deployment host');
assert.ok(baseUrl.pathname === '/RepoPilot/' || baseUrl.pathname === '/RepoPilot', 'unexpected Pages base path');
baseUrl.pathname = '/RepoPilot/';
baseUrl.search = '';
baseUrl.hash = '';

const resources = [
  { path: '', name: 'homepage' },
  { path: 'styles.css', name: 'stylesheet' },
  { path: 'assets/favicon.svg', name: 'favicon' },
  { path: 'robots.txt', name: 'robots.txt' },
  { path: 'sitemap.xml', name: 'sitemap.xml' },
  { path: 'deployment-info.json', name: 'deployment metadata' }
];

async function fetchResource(resource) {
  const url = new URL(resource.path, baseUrl);
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(8000),
    headers: { 'user-agent': 'RepoPilot-PostDeploy-Smoke/1.0', 'cache-control': 'no-cache', pragma: 'no-cache' }
  });
  assert.equal(new URL(response.url).origin, baseUrl.origin, `${resource.name} unexpectedly redirected to another origin`);
  assert.ok(response.ok, `${resource.name} returned HTTP ${response.status}`);
  const body = await response.text();
  assert.ok(body.length > 0, `${resource.name} returned an empty response`);
  return { resource, body, status: response.status };
}

async function validateLiveSite() {
  const responses = await Promise.all(resources.map(fetchResource));
  const bodyByPath = new Map(responses.map(({ resource, body }) => [resource.path, body]));
  const html = bodyByPath.get('');
  const css = bodyByPath.get('styles.css');
  const favicon = bodyByPath.get('assets/favicon.svg');
  const robots = bodyByPath.get('robots.txt');
  const sitemap = bodyByPath.get('sitemap.xml');
  const info = JSON.parse(bodyByPath.get('deployment-info.json'));

  assert.match(html, /<title>RepoPilot \| GitHub coding assistant for ChatGPT<\/title>/, 'live homepage title mismatch');
  assert.match(html, /name="description" content="[^"]*GitHub bugs[^"]*GitHub Actions/, 'live homepage SEO description is missing key use cases');
  assert.match(html, /<h1[^>]*>A GitHub coding assistant for ChatGPT\.<\/h1>/, 'live homepage product heading is unclear');
  assert.match(html, /Private beta/i, 'live homepage must retain the private-beta disclosure');
  assert.match(html, /application\/ld\+json/, 'live homepage software metadata is missing');
  assert.doesNotMatch(html, /app\.js|data-copy=/, 'live homepage must not load or reference old prompt-copy JavaScript');
  assert.match(css, /:focus-visible/, 'live CSS does not contain expected accessibility focus styles');
  assert.match(favicon, /<svg\b/, 'live favicon is not SVG');
  assert.match(robots, /Sitemap:\s*https:\/\/jordan-thirkle\.github\.io\/RepoPilot\/sitemap\.xml/i, 'live robots.txt sitemap declaration is missing');
  assert.match(sitemap, /https:\/\/jordan-thirkle\.github\.io\/RepoPilot\//, 'live sitemap is missing the canonical Pages URL');
  assert.equal(info.repository, 'jordan-thirkle/RepoPilot', 'live deployment belongs to an unexpected repository');
  assert.equal(info.sourceRevision, expectedSha, `live deployment revision mismatch: expected ${expectedSha}, saw ${info.sourceRevision}`);
  if (expectedRunId) assert.equal(String(info.workflowRunId), String(expectedRunId), 'live deployment workflow run ID mismatch');

  return responses.map(({ resource, status }) => ({ path: resource.path || '/', status }));
}

let lastError;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    const checks = await validateLiveSite();
    console.log(`Live Pages smoke test passed on attempt ${attempt}; revision ${expectedSha}; run ${expectedRunId ?? 'unknown'}.`);
    for (const check of checks) console.log(`PASS HTTP ${check.status} ${check.path}`);
    process.exitCode = 0;
    break;
  } catch (error) {
    lastError = error;
    console.error(`Smoke attempt ${attempt}/${maxAttempts} failed: ${error instanceof Error ? error.message : String(error)}`);
    if (attempt < maxAttempts) await delay(retryDelayMs);
  }
}
if (lastError && process.exitCode !== 0) {
  console.error('Live deployment did not satisfy the smoke checks.');
  process.exitCode = 1;
}
