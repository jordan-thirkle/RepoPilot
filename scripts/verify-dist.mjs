import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const output = join(process.cwd(), 'dist');
const expectedEntries = ['assets', 'deployment-info.json', 'index.html', 'robots.txt', 'sitemap.xml', 'styles.css'].sort();
const entries = (await readdir(output)).sort();
assert.deepEqual(entries, expectedEntries, 'deployment output must contain only the explicit public-site allowlist');
assert.deepEqual(await readdir(join(output, 'assets')), ['favicon.svg'], 'only the explicitly allowlisted public favicon may be deployed');

for (const file of ['index.html', 'styles.css', 'robots.txt', 'sitemap.xml', 'deployment-info.json']) {
  const details = await stat(join(output, file));
  assert.ok(details.isFile() && details.size > 0, `missing or empty deployment asset: ${file}`);
}

const html = await readFile(join(output, 'index.html'), 'utf8');
const css = await readFile(join(output, 'styles.css'), 'utf8');
const favicon = await readFile(join(output, 'assets', 'favicon.svg'), 'utf8');
const info = JSON.parse(await readFile(join(output, 'deployment-info.json'), 'utf8'));

assert.match(html, /<title>RepoPilot \| GitHub coding assistant for ChatGPT<\/title>/, 'built homepage title is incorrect');
assert.match(html, /GitHub coding assistant for ChatGPT/, 'built homepage must clearly identify the product');
assert.match(html, /name="description"/, 'built homepage must include SEO metadata');
assert.match(html, /application\/ld\+json/, 'built homepage must include structured software metadata');
assert.match(html, /styles\.css/, 'built homepage must reference CSS');
assert.doesNotMatch(html, /app\.js|data-copy=/, 'built homepage must not include unused JavaScript or prompt-copy UI');
assert.ok(css.length > 100 && /:focus-visible/.test(css), 'built CSS is missing expected site styling');
assert.match(favicon, /<svg\b/, 'built favicon is invalid');
assert.equal(info.sourceRevision, process.env.GITHUB_SHA ?? 'local', 'build revision metadata must match the checked-out commit');
assert.equal(info.repository, process.env.GITHUB_REPOSITORY ?? 'local', 'build repository metadata must match the current repo');
console.log('Built Pages output verified: explicit allowlist and source-revision metadata are correct.');
