# AGENTS.md — working constraints for this repository

Guidance for any AI agent or contributor working on CSV Quality Checker. Read `SPEC.md`
for what the project does; this file covers how changes are made.

## Technology constraints

- Vanilla HTML, CSS, and JavaScript only.
- No frameworks, bundlers, transpilers, or runtime dependencies.
- No external CDN scripts or stylesheets. Everything ships from this repository.
- No backend, database, or server-side storage.
- Must remain a static site deployable to GitHub Pages from `main` at the repository root.
- Node.js is used only to run tests, never as a runtime dependency of the site.

## Privacy constraints

- All CSV processing happens in the browser, using the File API.
- Never add code that transmits file contents anywhere: no `fetch`, no `XMLHttpRequest`,
  no analytics, no telemetry, no error reporting service.
- Never commit real datasets. Example files must be small and synthetic.

## Scope discipline

- The MVP is defined in `SPEC.md`. Do not add features outside it while MVP work is
  unfinished.
- Prefer deleting code to adding it. This tool should stay small enough for a student to
  read and explain end to end.
- Keep parsing and metric logic in `csv-utils.js` as pure functions with no DOM access.
  This is what keeps the project testable without a headless browser.

## Change process

- Small, reviewable changes. One concern per commit.
- Descriptive commit messages in the imperative mood, prefixed by type
  (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- Use the GitHub workflow where practical: one issue, one branch, one pull request.
- Keep `main` working at all times. Never push broken code to `main`.

## Testing

- Node's built-in test runner only: `node --test tests/`. No test dependencies.
- Any change to parsing or metric logic needs a test covering it.
- Fixtures must have hand-verified expected values.
- Run the tests before claiming they pass.

## Secrets and data

- No secrets, credentials, tokens, or API keys in the repository.
- No personal or private data in commits, examples, or screenshots.
- There are no credentials of any kind in this project. If a change seems to need one,
  the change is out of scope.

## Honesty requirements

These matter more than anything above.

- Never claim a test passed without executing it and reading the output.
- Never fabricate user feedback, test results, deployment status, or CI runs.
- Never claim the published site is live until the URL has been verified with a real
  request.
- When something cannot be verified, say so plainly and explain what remains unverified.
- When an action requires repository-owner access or authentication, state exactly what
  the owner must do. Never ask for passwords or tokens in chat.

## Out of bounds

- Do not modify unrelated repositories, including `spark-seprep` and `opencode-website`.
- Do not use `sudo` or change system configuration.
