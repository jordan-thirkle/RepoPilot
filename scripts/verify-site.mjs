import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'styles.css'), 'utf8');
const js = readFileSync(join(root, 'app.js'), 'utf8');
const workflow = readFileSync(join(root, '.github/workflows/pages.yml'), 'utf8');
const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
const robots = readFileSync(join(root, 'robots.txt'), 'utf8');
const expectedSections = ['workflow', 'capabilities', 'prompts'];

assert.match(html, /<!doctype html>/i, 'index.html must declare HTML5');
assert.match(html, /<html lang="en">/i, 'page language must be declared');
assert.match(html, /name="viewport"/, 'responsive viewport metadata is required');
assert.match(html, /name="description"/, 'SEO description is required');
assert.match(html, /rel="canonical"/, 'canonical URL is required for the intended Pages deployment');
assert.match(html, /<h1[^>]*>GitHub work\.<br><span>In your words\.<\/span><\/h1>/, 'primary product promise is required');
assert.match(html, /Private beta/, 'availability must be stated honestly');
assert.match(html, /permissions/, 'permission limits must be disclosed');
for (const id of expectedSections) assert.match(html, new RegExp(`id="${id}"`), `missing section: ${id}`);
assert.match(html, /aria-label="Main navigation"/, 'main navigation must be labelled');
assert.match(html, /aria-live="polite"/, 'copy feedback must be announced to assistive tech');
assert.match(css, /@media\s*\(max-width:\s*680px\)/, 'mobile layout is required');
assert.match(css, /prefers-reduced-motion/, 'reduced-motion preferences must be respected');
assert.match(css, /:focus-visible/, 'visible keyboard focus is required');
assert.match(js, /navigator\.clipboard\.writeText/, 'copy prompt interaction is required');
assert.match(js, /aria-expanded/, 'mobile navigation state must be accessible');

const localAssets = [...html.matchAll(/(?:href|src)="\.\/([^"#?]+)"/g)].map((m) => m[1]);
for (const asset of localAssets) {
  if (asset.startsWith('http')) continue;
  assert.ok(existsSync(join(root, asset)), `missing local asset: ${asset}`);
}
assert.ok(existsSync(join(root, '.nojekyll')), '.nojekyll marker should exist for Pages');
assert.ok(existsSync(join(root, '.github/workflows/pages.yml')), 'GitHub Pages workflow is required');
assert.ok(readdirSync(join(root, 'assets')).includes('favicon.svg'), 'favicon must exist');
assert.match(sitemap, /<loc>https:\/\/jordan-thirkle\.github\.io\/RepoPilot\/<\/loc>/, 'sitemap must contain the intended GitHub Pages URL');
assert.match(robots, /Sitemap:\s+https:\/\/jordan-thirkle\.github\.io\/RepoPilot\/sitemap\.xml/, 'robots.txt must link the sitemap');
assert.match(workflow, /actions\/upload-pages-artifact@v4/, 'Pages artifact action must be configured');
assert.match(workflow, /actions\/deploy-pages@v4/, 'Pages deployment action must be configured');
assert.match(workflow, /github\.ref == 'refs\/heads\/main'/, 'Pages deployment must be restricted to main');

console.log(`RepoPilot Pages site checks passed (${expectedSections.length} sections, ${localAssets.length} local asset references).`);
