# RepoPilot

**RepoPilot — GitHub work, in your words.**

RepoPilot is a workflow skill for using GitHub from ChatGPT. It turns natural-language requests into repository research, code changes, issues, pull requests, reviews and CI investigation—with evidence-backed reporting and honest limits.

## Status

The ChatGPT plugin is in private beta. The public website does not mean the plugin is publicly installable; access depends on ChatGPT availability and the connected GitHub permissions.

## Website

**Live site:** https://jordan-thirkle.github.io/RepoPilot/

The responsive landing page is hosted on GitHub Pages from `main` via GitHub Actions. GitHub Pages has been configured to use GitHub Actions as its source. The static-site verification and latest deployment workflow both passed.

The site uses static HTML, CSS and JavaScript, with no build dependencies, analytics scripts, paid hosting or third-party runtime dependencies.

## Deploy and verify

The `.github/workflows/pages.yml` workflow checks the source and deploys it from `main`. It also supports manual runs via **Actions → Verify and deploy RepoPilot Pages → Run workflow**.

A successful commit is not proof of a successful deployment. Check the Actions run and the deployment URL it reports.

For local checks, use Node.js 20+:

```sh
npm run verify
```

## Project links

- Repository: https://github.com/jordan-thirkle/RepoPilot
- RepoPilot in ChatGPT (private beta): https://chatgpt.com/plugins/plugins_6adcd2f31dc08191b79ad455e7d81e94

## License

MIT. See [LICENSE](LICENSE).
