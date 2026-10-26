import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'styles.css'), 'utf8');
const workflow = readFileSync(join(root, '.github/workflows/pages.yml'), 'utf8');
const gitignore = readFileSync(join(root, '.gitignore'), 'utf8');
const responsiveScript = readFileSync(join(root, 'scripts/responsive-smoke.mjs'), 'utf8');
const postDeploySmoke = readFileSync(join(root, 'scripts/post-deploy-smoke.mjs'), 'utf8');
const siteBuilder = readFileSync(join(root, 'scripts/prepare-site.mjs'), 'utf8');
const distVerifier = readFileSync(join(root, 'scripts/verify-dist.mjs'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const packageLock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
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
assert.match(html, /<title>RepoPilot \| GitHub coding assistant for ChatGPT<\/title>/, 'page title must clearly describe the product');
assert.match(html, /<h1[^>]*>A GitHub coding assistant for ChatGPT\.<\/h1>/, 'main heading must clearly say what RepoPilot is');
assert.match(html, /name="description" content="[^"]*GitHub bugs[^"]*GitHub Actions/, 'SEO description must use natural product/search language');
assert.match(html, /fix bugs/i, 'common bug-fixing use case must be clear');
assert.match(html, /open pull requests/i, 'pull-request use case must be clear');
assert.match(html, /troubleshoot GitHub Actions/i, 'GitHub Actions use case must be clear');
assert.match(html, /existing GitHub connection/i, 'the integration model must be explained plainly');
assert.match(html, /which checks actually ran/i, 'evidence-based reporting must be explained plainly');
assert.match(html, /Private beta/, 'plugin availability must be stated honestly');
assert.match(html, /permissions/i, 'access and permission requirements must be disclosed');
assert.match(html, /id="main"/, 'main landmark must be identified');
assert.match(html, /href="#main"/, 'skip link must be present');
assert.match(html, /aria-label="Main navigation"/, 'primary navigation must be labelled');
assert.match(html, /href="https:\/\/github\.com\/jordan-thirkle\/RepoPilot"/, 'repository source link must remain available');
assert.match(html, /Open RepoPilot in ChatGPT/, 'primary action must clearly state its destination');
assert.doesNotMatch(html, /data-copy=|copy-feedback|mobile-nav|data-menu-toggle/, 'redundant prompt-copy and mobile-menu UI must not return');
assert.match(html, /application\/ld\+json/, 'software metadata should be available to search engines');
assert.match(html, /SoftwareApplication/, 'structured software metadata must describe the product');
assert.doesNotMatch(html, /<script[^>]+src=/i, 'the static landing page must not load a client-side JavaScript bundle');
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
assert.match(css, /@media\s*\(max-width:\s*40rem\)/, 'small-screen layout breakpoint is required');
assert.match(css, /@media\s*\(max-width:\s*25rem\)/, 'small-screen layout breakpoint is required');
assert.match(css, /prefers-color-scheme:\s*dark/, 'dark colour scheme should be supported');
assert.match(css, /prefers-reduced-motion:\s*reduce/, 'reduced motion preferences must be respected');
assert.match(css, /:focus-visible/, 'keyboard focus indicators should be visible');
assert.match(css, /min-height:\s*2\.875rem/, 'interactive targets should be comfortably touchable');
assert.match(css, /overflow-wrap:\s*anywhere/, 'long technical tokens must wrap safely');

assert.doesNotMatch(html, /app\.js|data-copy=/, 'unused JavaScript and prompt-copy code must not be shipped');
assert.doesNotMatch(siteBuilder, /app\.js/, 'the public asset allowlist should not ship unused JavaScript');

const pinnedActions = [
  ['actions/checkout', '3d3c42e5aac5ba805825da76410c181273ba90b1', 'v7.0.1'],
  ['actions/setup-node', '949feb2413d6458794dcd2491c4babbbce0c15c1', 'v7.1.0'],
  ['actions/configure-pages', '45bfe0192ca1faeb007ade9deae92b16b8254a0d', 'v6.0.0'],
  ['actions/upload-pages-artifact', 'fc324d3547104276b827a68afc52ff2a11cc49c9', 'v5.0.0'],
  ['actions/deploy-pages', '368f82528645a54fb793d4d04e342629a3f51346', 'v5.0.1'],
  ['actions/upload-artifact', 'cf430e030ddbb5b0abf93d22962f4752f3646cd9', 'v7.0.2']
];
for (const [action, sha, version] of pinnedActions) {
  assert.ok(workflow.includes(`uses: ${action}@${sha} # ${version}`), `${action} must be pinned to the reviewed ${version} commit SHA`);
}
assert.doesNotMatch(workflow, /uses:\s+[^\n]+@(v\d+|main|master)\b/, 'workflow actions must not use floating version tags or branches');
assert.match(workflow, /run: npm ci/, 'browser dependencies must be installed using the committed lockfile');
assert.doesNotMatch(workflow, /npm install --no-save/, 'ad-hoc browser dependency resolution must not be used');
assert.equal(packageLock.lockfileVersion, 3, 'npm lockfile v3 is required');
assert.deepEqual(packageLock.packages[''].devDependencies, packageJson.devDependencies, 'lockfile and manifest development dependencies must match');
assert.equal(packageJson.devDependencies.playwright, '1.64.1', 'Playwright must be pinned exactly');
assert.equal(packageJson.devDependencies['axe-core'], '4.13.0', 'axe-core must be pinned exactly');
assert.equal(packageLock.packages['node_modules/playwright'].version, '1.64.1', 'lockfile must pin Playwright package version');
assert.equal(packageLock.packages['node_modules/playwright-core'].version, '1.64.1', 'lockfile must pin Playwright core version');
assert.equal(packageLock.packages['node_modules/axe-core'].version, '4.13.0', 'lockfile must pin axe-core version');
assert.equal(packageJson.engines.node, '>=24', 'Node runtime must match the GitHub Actions Node 24 floor');
assert.match(workflow, /github\.ref == 'refs\/heads\/main'/, 'deployment must be restricted to main');

// Screenshot evidence is generated by the existing browser job and stays in
// the same repository's short-lived CI artifact; it is not published to Pages.
assert.match(responsiveScript, /page\.screenshot\(/, 'browser checks should capture visual evidence');
assert.match(responsiveScript, /runAxeAudit/, 'browser checks should run automated axe-core WCAG scans');
assert.match(responsiveScript, /response\.status\(\) >= 400/, 'browser checks should fail for local HTTP error responses');
assert.match(responsiveScript, /consoleErrors/, 'browser checks should collect console errors');
assert.match(responsiveScript, /page\.locator\('\.hero-actions \.button-primary'\)/, 'browser checks should test the primary CTA');
assert.match(responsiveScript, /darkViolations/, 'browser checks should scan the dark theme for accessibility violations');
assert.match(responsiveScript, /fullPage:\s*true/, 'visual evidence should include full-page captures');
assert.match(responsiveScript, /mobile-390x844/, 'mobile screenshot should be generated');
assert.match(responsiveScript, /desktop-1440x900/, 'desktop screenshot should be generated');
assert.match(responsiveScript, /manifest\.json/, 'screenshot artifact should include a manifest');
assert.match(responsiveScript, /headRevision:/, 'manifest should identify the PR head revision');
assert.match(responsiveScript, /baseRevision:/, 'manifest should identify the PR base revision');
assert.match(responsiveScript, /workflowRunId:/, 'manifest should identify the workflow run');
assert.match(workflow, /REPOPILOT_HEAD_SHA:/, 'browser job should pass the PR head SHA to the manifest');
assert.match(workflow, /REPOPILOT_BASE_SHA:/, 'browser job should pass the PR base SHA to the manifest');
assert.match(workflow, /actions\/upload-artifact@[a-f0-9]{40} # v7\.0\.2/, 'browser job should upload screenshot evidence through the pinned Node 24 action');
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
