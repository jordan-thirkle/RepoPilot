const mode = process.env.REPOPILOT_SMOKE_TEST_MODE ?? 'success';
const expectedRevision = process.env.REPOPILOT_SMOKE_TEST_REVISION ?? 'a'.repeat(40);
const runId = process.env.REPOPILOT_SMOKE_TEST_RUN_ID ?? '12345';

const contents = new Map([
  ['/RepoPilot/', '<!doctype html><html><head><title>RepoPilot — GitHub work, in your words</title><meta name="description" content="Test"></head><body>Private beta</body></html>'],
  ['/RepoPilot/styles.css', 'a:focus-visible { outline: 2px solid currentColor; }'],
  ['/RepoPilot/app.js', 'navigator.clipboard.writeText("test");'],
  ['/RepoPilot/assets/favicon.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
  ['/RepoPilot/robots.txt', 'Sitemap: https://jordan-thirkle.github.io/RepoPilot/sitemap.xml'],
  ['/RepoPilot/sitemap.xml', '<urlset><loc>https://jordan-thirkle.github.io/RepoPilot/</loc></urlset>'],
  ['/RepoPilot/deployment-info.json', JSON.stringify({
    repository: 'jordan-thirkle/RepoPilot',
    sourceRevision: expectedRevision,
    workflowRunId: runId,
    eventName: 'push'
  })]
]);

globalThis.fetch = async (input) => {
  const url = new URL(input instanceof URL ? input.href : typeof input === 'string' ? input : input.url);
  if (url.origin !== 'https://jordan-thirkle.github.io') {
    throw new Error(`Mock fetch blocked unexpected origin: ${url.origin}`);
  }
  if (!contents.has(url.pathname)) {
    return { url: url.href, ok: false, status: 404, text: async () => 'not found' };
  }
  if (mode === 'http-error' && url.pathname === '/RepoPilot/app.js') {
    return { url: url.href, ok: false, status: 503, text: async () => 'service unavailable' };
  }
  return {
    url: url.href,
    ok: true,
    status: 200,
    text: async () => contents.get(url.pathname)
  };
};
