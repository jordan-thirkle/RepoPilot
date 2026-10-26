import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'styles.css'), 'utf8');
const js = readFileSync(join(root, 'app.js'), 'utf8');
const workflow = readFileSync(join(root, '.github/workflows/pages.yml'), 'utf8');
const gitignore = readFileSync(join(root, '.gitignore'), 'utf8');
const responsiveScript = readFileSync(join(root, 'scripts/responsive-smoke.mjs'), 'utf8');
const postDeploySmoke = readFileSync(join(root, 'scripts/post-deploy-smoke.mjs'), 'utf8');
const siteBuilder = readFileSync(join(root, 'scripts/prepare-site.mjs'), 'utf8');
const distVerifier = readFileSync(join(root, 'scripts/verify-dist.mjs'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
const robots = readFileSync(join(root, 'robots.txt'), 'utf8');

assert.match(html, /<!doctype html>/i, 'HTML5 doctype is required');
assert.match(html, /<html lang="en">/i, 'document language is required');
assert.match(html, /name="viewport"/, 'responsive viewport metadata is required');
assert.match(html, /name="description"/, 'SEO description is required');
assert.match(html, /rel="canonical"/, 'canonical URL is required');
assert.match(html, /property="og:title"/, 'social preview title is required');
assert.match(html, /name="twitter:card"/, 'social card metadata is required');
assert.equal([...html.matchAll(/<h1\b/g)].length, 1, 'the page must have exactly one primary heading');
assert.match(html, /Private beta/, 'plugin availability must be stated honestly');
assert.match(html, /permissions/, 'access and permission requirements must be disclosed');
assert.match(html, /id="main"/, 'main landmark must be identified');
assert.match(html, /href="#main"/, 'skip link must be present');
assert.match(html, /role="group" aria-label="Illustrative RepoPilot task preview"/, 'illustrative preview must be clearly labelled');
assert.match(html, /aria-label="Main navigation"/, 'desktop navigation must be labelled');
assert.match(html, /aria-label="Mobile navigation"/, 'mobile navigation must be labelled');
assert.match(html, /aria-live="polite"/, 'copy feedback must be announced politely');
assert.equal([...html.matchAll(/data-copy="/g)].length, 3, 'three copyable prompt examples should be present');
assert.match(html, /rel="noopener noreferrer"/, 'new-tab links must protect the opener context');
assert.doesNotMatch(html, /<script[^>]+src="https?:\/\//i, 'runtime scripts must not load from third parties');
assert.doesNotMatch(html, /google-analytics|googletagmanager|plausible\.io|hotjar/i, 'site must remain free of tracking scripts');

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
const idSet = new Set(ids);
const links = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/g)].map((match) => match[0]);
for (const anchor of links) {
  const href = anchor.match(/\bhref="([^"]+)"/)?.[1];
  assert.ok(href, 'every anchor must have an href');
  if (href.startsWith('#')) assert.ok(idSet.has(href.slice(1)), 'broken in-page link: ' + href);
  else assert.ok(href.startsWith('https://') || href.startsWith('./'), 'unexpected anchor target: ' + href);
  if (/target="_blank"/.test(anchor)) assert.match(anchor, /rel="[^"]*noopener/, 'new-tab link lacks noopener: ' + href);
}

const localAssets = [...html.matchAll(/(?:href|src)="\.\/([^"#?]+)"/g)].map((match) => match[1]);
for (const asset of localAssets) {
  assert.ok(existsSync(join(root, asset)), 'missing local asset: ' + asset);
}
assert.ok(existsSync(join(root, '.nojekyll')), '.nojekyll marker must exist');
assert.ok(existsSync(join(root, 'assets/favicon.svg')), 'SVG favicon must exist');
assert.match(sitemap, /<loc>https:\/\/jordan-thirkle\.github\.io\/RepoPilot\/<\/loc>/, 'sitemap must contain the live Pages URL');
assert.match(robots, /Sitemap:\s+https:\/\/jordan-thirkle\.github\.io\/RepoPilot\/sitemap\.xml/, 'robots.txt must advertise the sitemap');

assert.match(css, /clamp\(/, 'fluid typography should be used');
assert.match(css, /minmax\(/, 'layouts should use flexible grid sizing');
assert.match(css, /@media\s*\(max-width:\s*48rem\)/, 'mobile navigation/layout breakpoint is required');
assert.match(css, /@media\s*\(max-width:\s*25rem\)/, 'small-screen layout breakpoint is required');
assert.match(css, /prefers-color-scheme:\s*dark/, 'dark colour scheme should be supported');
assert.match(css, /prefers-reduced-motion:\s*reduce/, 'reduced motion preferences must be respected');
assert.match(css, /:focus-visible/, 'keyboard focus indicators should be visible');
assert.match(css, /min-height:\s*2\.875rem/, 'interactive targets should be comfortably touchable');
assert.match(css, /overflow-wrap:\s*anywhere/, 'long technical tokens must wrap safely');

assert.match(js, /navigator\.clipboard\.writeText/, 'clipboard API should be used where supported');
assert.match(js, /execCommand\('copy'\)/, 'a basic clipboard fallback should be available');
assert.match(js, /event\.key === 'Escape'/, 'mobile navigation must support Escape');
assert.match(js, /originalAriaLabel/, 'copy control must restore its accessible label');

assert.match(workflow, /actions\/upload-pages-artifact@v4/, 'Pages artifact action must be configured');
assert.match(workflow, /actions\/deploy-pages@v4/, 'Pages deployment action must be configured');
assert.match(workflow, /github\.ref == 'refs\/heads\/main'/, 'deployment must be restricted to main');

// Screenshot evidence is generated by the existing browser job and stays in
// the same repository's short-lived CI artifact; it is not published to Pages.
assert.match(responsiveScript, /page\.screenshot\(/, 'browser checks should capture visual evidence');
assert.match(responsiveScript, /fullPage:\s*true/, 'visual evidence should include full-page captures');
assert.match(responsiveScript, /mobile-390x844/, 'mobile screenshot should be generated');
assert.match(responsiveScript, /desktop-1440x900/, 'desktop screenshot should be generated');
assert.match(responsiveScript, /manifest\.json/, 'screenshot artifact should include a manifest');
assert.match(responsiveScript, /headRevision:/, 'manifest should identify the PR head revision');
assert.match(responsiveScript, /baseRevision:/, 'manifest should identify the PR base revision');
assert.match(responsiveScript, /workflowRunId:/, 'manifest should identify the workflow run');
assert.match(workflow, /REPOPILOT_HEAD_SHA:/, 'browser job should pass the PR head SHA to the manifest');
assert.match(workflow, /REPOPILOT_BASE_SHA:/, 'browser job should pass the PR base SHA to the manifest');
assert.match(workflow, /actions\/upload-artifact@v\d+/, 'browser job should upload screenshot evidence');
assert.match(workflow, /retention-days:\s*3/, 'screenshot evidence should have short retention');
assert.match(workflow, /path:\s*artifacts\/screenshots\//, 'only the screenshot output folder should be uploaded');
assert.match(workflow, /if:\s*always\(\)/, 'screenshots should be uploaded even when browser tests fail');


assert.doesNotMatch(workflow, /^concurrency:\s*$/m, 'pull request runs must not share a global cancellation group');
assert.match(workflow, /concurrency:\n\s+group: pages-production-\$\{\{ github\.repository \}\}\n\s+cancel-in-progress: false/, 'production deployments must serialize without cancelling the in-progress deployment');
assert.equal((workflow.match(/persist-credentials: false/g) ?? []).length, 3, 'checkout credentials must not persist into script execution');
assert.match(gitignore, /^dist\/$/m, 'generated deployment output must be ignored');
assert.match(workflow, /run: npm run build:site/, 'deployment must build the explicit site allowlist');
assert.match(workflow, /path: dist\//, 'deployment artifact must exclude repository and CI source files');
assert.match(workflow, /Smoke-test the live deployment/, 'successful deploy must be followed by a live smoke test');
assert.match(workflow, /post-deploy-smoke\.mjs/, 'post-deploy smoke script must be invoked');
assert.equal(packageJson.scripts['build:site'], 'node scripts/prepare-site.mjs', 'site allowlist build command must be defined');
assert.match(packageJson.scripts.verify, /node --check scripts\/post-deploy-smoke\.mjs/, 'post-deploy script syntax must be checked in CI');
assert.match(packageJson.scripts.verify, /verify-dist\.mjs/, 'verify must validate the built deployment output');
assert.match(siteBuilder, /deployment-info\.json/, 'published site must carry revision metadata for release verification');
assert.match(siteBuilder, /assets\/favicon\.svg/, 'site builder must copy only the explicitly public favicon asset');
assert.match(distVerifier, /deployment-info\.json/, 'built output verifier must validate revision metadata');
assert.match(postDeploySmoke, /EXPECTED_SHA/, 'live smoke test must compare deployed revision');
assert.match(postDeploySmoke, /deployment-info\.json/, 'live smoke test must verify deployment revision metadata');
assert.match(packageJson.scripts.verify, /node scripts\/post-deploy-smoke\.test\.mjs/, 'live smoke behavior tests must be included in verification');

console.log('Static checks passed: ' + ids.length + ' unique IDs, ' + links.length + ' local asset references; screenshot and release-safety contracts present.');
