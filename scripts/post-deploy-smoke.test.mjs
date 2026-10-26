import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = process.cwd();
const smokeScript = resolve(root, 'scripts/post-deploy-smoke.mjs');
const mockFetch = resolve(root, 'scripts/test-support/mock-smoke-fetch.mjs');
const baseUrl = 'https://jordan-thirkle.github.io/RepoPilot/';
const goodRevision = 'a'.repeat(40);
const wrongRevision = 'b'.repeat(40);
const runId = '12345';

function runSmoke(mode, expectedRevision = goodRevision) {
  return spawnSync(process.execPath, ['--import', mockFetch, smokeScript, baseUrl], {
    cwd: root,
    encoding: 'utf8',
    timeout: 10000,
    env: {
      ...process.env,
      EXPECTED_SHA: expectedRevision,
      EXPECTED_RUN_ID: runId,
      SMOKE_MAX_ATTEMPTS: '1',
      SMOKE_RETRY_DELAY_MS: '0',
      REPOPILOT_SMOKE_TEST_MODE: mode,
      REPOPILOT_SMOKE_TEST_REVISION: goodRevision,
      REPOPILOT_SMOKE_TEST_RUN_ID: runId
    }
  });
}

const healthy = runSmoke('success');
assert.equal(healthy.error, undefined, healthy.error?.message);
assert.equal(healthy.status, 0, `healthy deployment was rejected:\n${healthy.stdout}\n${healthy.stderr}`);
assert.match(healthy.stdout, /Live Pages smoke test passed/, 'success case should report a successful smoke test');
assert.match(healthy.stdout, /PASS HTTP 200 \/\n/, 'success case should confirm the homepage');

const stale = runSmoke('success', wrongRevision);
assert.equal(stale.error, undefined, stale.error?.message);
assert.notEqual(stale.status, 0, 'smoke test must reject stale deployment metadata');
assert.match(stale.stderr, /live deployment revision mismatch/, 'stale revision rejection should be explicit');

const brokenAsset = runSmoke('http-error');
assert.equal(brokenAsset.error, undefined, brokenAsset.error?.message);
assert.notEqual(brokenAsset.status, 0, 'smoke test must fail when a critical asset returns HTTP 503');
assert.match(brokenAsset.stderr, /application script returned HTTP 503/, 'asset failure should identify the broken resource');

console.log('Post-deploy smoke behavior passed: healthy deployment accepted; stale revision and failing critical asset rejected (no network used).');
