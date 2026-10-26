# RepoPilot

**A GitHub coding assistant for ChatGPT.**

RepoPilot helps you work on GitHub repositories from ChatGPT. Describe the task to investigate a bug, make a code change, open a pull request or troubleshoot GitHub Actions. It uses your existing GitHub connection and reports what was actually verified.

## Status

The ChatGPT plugin is in private beta. The public website does not mean the plugin is publicly installable; access depends on ChatGPT availability and the connected GitHub permissions.

## Website

**Live site:** https://jordan-thirkle.github.io/RepoPilot/

The responsive landing page is hosted on GitHub Pages from `main` via GitHub Actions. GitHub Pages has been configured to use GitHub Actions as its source. The static-site verification and latest deployment workflow both passed.

The deployed site uses static HTML and CSS with no client-side JavaScript, third-party runtime dependencies, analytics scripts or paid hosting. Development-only browser-test dependencies are pinned in `package.json` and `package-lock.json`; Playwright runs Chromium, and axe-core scans the light and dark themes for WCAG A/AA issues.

Pull requests also generate short-lived visual evidence from the real browser suite. The `repopilot-visual-evidence` artifact contains desktop and mobile viewport/full-page screenshots plus a manifest recording the tested revision and result. It is stored as a GitHub Actions artifact for three days, is subject to the repository's read permissions, and is not copied into the deployed website.

## Deploy and verify

The `.github/workflows/pages.yml` workflow validates the source, runs browser checks, builds an allowlisted `dist/` directory, and deploys it from `main`. It supports manual runs via **Actions → Verify and deploy RepoPilot Pages → Run workflow**. Pull-request jobs run independently; production deployments serialize without cancelling the deployment already in progress. A separate `Verify main protection` job checks GitHub's branch metadata; production deployment depends on it and fails closed until `main` is protected. Enable the repository ruleset before merging this safeguard, and include `Verify main protection` among the required checks.

The Pages artifact contains only the public HTML/CSS, site metadata and favicon—not the repository README, design source, test scripts or workflow files. The deploy job then smoke-tests the live URL, including its expected commit SHA from `deployment-info.json`, the homepage, core assets, robots.txt and sitemap. A successful commit or provider deployment alone is not proof of a healthy live site; check the full Actions run.

For local checks, use Node.js 24+:

```sh
npm ci
npm run verify
npx playwright install chromium
npm run test:responsive
```

The browser suite tests 14 viewport sizes, primary-action keyboard focus, local HTTP response statuses, console errors, viewport overflow, and axe-core scans against WCAG 2.0/2.1 A/AA plus WCAG 2.2 AA rules on both light and dark themes. Automated checks are a useful regression gate, not a substitute for a full manual accessibility review.

## Project links

- Repository: https://github.com/jordan-thirkle/RepoPilot
- RepoPilot in ChatGPT (private beta): https://chatgpt.com/plugins/plugins_6adcd2f31dc08191b79ad455e7d81e94

## License

MIT. See [LICENSE](LICENSE).
