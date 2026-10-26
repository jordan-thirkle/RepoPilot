import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function isProtectedBranch(branch) {
  return branch?.protected === true;
}

export function requireProtectedBranch(branch, branchName = 'main') {
  if (!isProtectedBranch(branch)) {
    throw new Error(`Branch ${branchName} is not reported as protected by GitHub; refuse production delivery until an active branch protection rule or ruleset is enabled.`);
  }
  return true;
}

async function checkMainProtection() {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository)) {
    throw new Error('GITHUB_REPOSITORY is missing or malformed; refusing to infer protection.');
  }
  const apiRoot = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const response = await fetch(`${apiRoot}/repos/${repository}/branches/main`, { headers });
  if (!response.ok) {
    throw new Error(`GitHub branch metadata request failed with HTTP ${response.status}; refusing production delivery because protection cannot be verified.`);
  }
  const branch = await response.json();
  requireProtectedBranch(branch, 'main');
  console.log('PASS: GitHub reports main protected; delivery may proceed to the remaining checks.');
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  checkMainProtection().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
