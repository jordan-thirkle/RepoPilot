import { cp, copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = process.cwd();
const output = resolve(root, 'dist');
const publicFiles = ['index.html', 'styles.css', 'app.js', 'robots.txt', 'sitemap.xml'];

await rm(output, { recursive: true, force: true });
await mkdir(join(output, 'assets'), { recursive: true });

for (const file of publicFiles) {
  await copyFile(join(root, file), join(output, file));
}
await cp(join(root, 'assets'), join(output, 'assets'), { recursive: true });

const deploymentInfo = {
  repository: process.env.GITHUB_REPOSITORY ?? 'local',
  sourceRevision: process.env.GITHUB_SHA ?? 'local',
  workflowRunId: process.env.GITHUB_RUN_ID ?? null,
  eventName: process.env.GITHUB_EVENT_NAME ?? 'local'
};
await writeFile(join(output, 'deployment-info.json'), `${JSON.stringify(deploymentInfo, null, 2)}\n`, 'utf8');

console.log(`Prepared allowlisted Pages output at ${output}`);
console.log(`Public files: ${[...publicFiles, 'assets/**', 'deployment-info.json'].join(', ')}`);
