---
title: Make Navy proxy image configurable
branch: make-proxy-image-configurable
baseline: origin/master
---

# Make Navy proxy image configurable

This document captures the intent behind the work on the `make-proxy-image-configurable` branch and provides a high-level map of where each change lives. It is written for reviewers and future maintainers who need to understand why this branch is so large and how the changes group together, without reading every line of the diff.

## Snapshot

| Item | Value |
| --- | --- |
| Branch | `make-proxy-image-configurable` |
| Default branch in this repository | `master` (no `main` exists, so the diff is taken against `origin/master`) |
| Merge baseline (`origin/master`) | `035ecc9fc9fdf25f88cd4d90172cf68ebf7b7983` |
| Branch head | `3d64bfc1ebf3c27181f950f93d183adfe29ae68c` |
| Commits ahead of `master` | 17 |
| Files changed | 190 |
| Approximate line delta | `+25,163 / -10,345` |

## Headline intent

The branch began as a focused product change: allow consumers of Navy to override the Docker image used by the built-in HTTP reverse proxy, instead of being hard-coded to `navycloud/navy-proxy`. While delivering that, the toolchain and continuous-integration setup turned out to be too stale to support a clean release on modern Node, so the work expanded to cover dependency modernisation, a CI overhaul, and a substantial unit-test backfill. There are therefore two distinct strands of intent in this branch:

1. **Product and operations intent.** Make the HTTP proxy image configurable per project and per environment, with a clear precedence order, while preserving the existing default so no consumer is forced to change anything.
2. **Engineering intent.** Bring the repository onto Node 22 and a current dependency set, fix npm-audit findings, stabilise CI so it works reliably with both the `dockerode` client and the `docker compose` CLI, and lift unit-test coverage to a level that lets future changes be made with confidence.

## Configurable proxy image

The user-facing change is the ability to override the proxy image either by setting the `NAVY_HTTP_PROXY_IMAGE` environment variable or by adding an `httpProxyImage` property to `Navyfile.js`. The environment variable wins if both are set, and the historical default `navycloud/navy-proxy` is used when neither is provided, so existing setups are unaffected.

The resolution logic and the related Docker socket helper now live in:

- `packages/navy/src/http-proxy.js` - new `resolveProxyImage` and `resolveDockerSocketPath` helpers, used when generating the proxy compose config.
- `packages/navy/src/__tests__/http-proxy.js` - covers the precedence order, empty-string fall-through, and `reconfigureHTTPProxy` plumbing.
- `packages/navy/src/middleware/add-service-proxy-config.js` - knock-on changes to keep `navyFile` available where it now matters.

The behaviour and precedence rules are documented for end users in:

- `docs/http-proxy.md` - new "Customising the proxy image" section with worked examples.
- `docs/navyfile-config.md` - new `httpProxyImage` entry in the `Navyfile.js` reference, cross-linked from the proxy guide.

A follow-up commit renamed the environment variable from `NAVY_PROXY_IMAGE` to `NAVY_HTTP_PROXY_IMAGE` so it sits alongside the rest of the HTTP proxy surface area.

The branch also adds a generic environment-variable passthrough for the proxy image, on the same precedence model as the image override. Consumers can declare a static map of variables in `Navyfile.js` via `httpProxyEnv`, or forward names from the navy process env via the `NAVY_HTTP_PROXY_ENV` allowlist. The two sources are merged when both are set, with the env-var allowlist winning on key collisions, and the generated compose config omits the `environment:` block entirely when nothing is configured so existing setups are unaffected. This keeps navy agnostic of any specific consumer while letting downstream projects (e.g. those running a customised proxy image) wire in whatever runtime configuration they need.

## HTTPS and proxy reconfiguration correctness

While testing the configurable image, a latent bug surfaced: the HTTPS CLI path called `reconfigureHTTPProxy` without forwarding the resolved `navyFile`, which meant a custom `httpProxyImage` was silently dropped whenever HTTPS was toggled. The fix threads `navyFile` through the call chain and is covered by edge-case tests.

Primary locations:

- `packages/navy/src/cli/https.js` - propagates `navyFile` through `reconfigureHTTPProxy`.
- `packages/navy/src/cli/__tests__/https.js` - new tests for the propagation path.
- `packages/navy/src/__tests__/http-proxy.js` - asserts that `httpProxyImage` survives reconfiguration.

## Toolchain and monorepo modernisation

To get the proxy change to build and test on a current developer environment, the toolchain was lifted to Node 22 and the dependency tree was refreshed. The bulk of the line-count in the diff comes from the regenerated `package-lock.json`, but the meaningful edits are concentrated in:

- `package.json` - `engines.node` set to `>=22`, npm workspaces left in place, new `coverage` and `coverage-no-check` scripts wired up to `c8`.
- `lerna.json`, `babel.config.js`, `.flowconfig`, `flow-libs/` - Babel, Lerna and Flow configuration brought in line with the new toolchain, including refreshed Flow library definitions for current Node and npm modules.
- `.eslintrc.yml`, `.eslintignore` - lint configuration adjusted for the new parser and ignored paths.
- `.c8rc.json` - new coverage configuration enforcing the high coverage thresholds used by the test suite.
- `packages/navy/package.json`, `packages/navy-plugin-nodejs/package.json` - per-package dependency bumps to match the root.

Two commits in this strand are worth calling out: `chore(deps): remediate npm audit vulnerabilities` and `Fix vulnerabilities`, which together clear the audit output that the modernisation initially exposed.

## Unit-test expansion and coverage tooling

The final commit on the branch (`test: add c8 coverage tooling and 100% unit test coverage`) adds `c8` to the toolchain and lifts unit-test coverage close to 100% across the `navy` package. Most of the new test files do not change runtime behaviour, but they pin behaviour that was previously untested and would have made the modernisation risky to land. The new tests sit next to the modules they exercise, in a consistent `__tests__` layout:

- `packages/navy/src/__tests__/` - core flows: `config-provider.js`, `config.js`, `driver-logging.js`, `driver.js`, `errors.js`, `http-proxy.js`, `index.js`, `service.js`.
- `packages/navy/src/cli/__tests__/` - one test file per CLI command (`develop`, `external-ip`, `health`, `https`, `import`, `index`, `lan-ip`, `launch`, `live`, `local-ip`, `logs`, `open`, `program`, `ps`, `refresh-config`, `run`, `status`, `updates`, `wait-for-healthy`).
- `packages/navy/src/cli/config/__tests__/` and `packages/navy/src/cli/doctor/__tests__/` - configuration wrapper and doctor sub-commands.
- `packages/navy/src/cli/util/__tests__/` - shared CLI helpers (`get-or-initialise-navy`, `import`, `index`, `reconfigure`).
- `packages/navy/src/client/registry/__tests__/` - registry client (`get-credentials`, `get-endpoint`, `get-fat-manifest`, `get-token`, `helpers`).
- `packages/navy/src/config-providers/{filesystem,npm}/__tests__/` - configuration providers.
- `packages/navy/src/domain/__tests__/` - new domain helpers for `container-image` and `oci-api-specification`.
- `packages/navy/src/drivers/docker-compose/__tests__/` - driver client and entry point.
- `packages/navy/src/middleware/__tests__/` - all middleware modules (`add-service-proxy-config`, `develop`, `helpers`, `port-override`, `set-env-vars`, `set-image`, `set-logging-driver`, `tag-override`).
- `packages/navy/src/navy/__tests__/` - core orchestration (`default-middleware`, `index`, `middleware`, `plugin-interface`, `state`, `util`).
- `packages/navy/src/util/__tests__/` - utilities (`exec-async`, `external-ip`, `get-lan-ip`, `has-update`, `https`, `navyrc`, `service-host`, `table`).
- `packages/navy-plugin-nodejs/src/{hooks,middleware}/__tests__/` - plugin-side coverage for `rewrite-linked-node-modules` and `mount-user-home`.

The implementation files alongside these tests received small edits in the same commit to make them more easily testable and to address issues uncovered while writing the tests. These edits are deliberately narrow and do not change public behaviour.

## Integration tests and harness

Several integration-test fixes accompany the toolchain change, mostly to keep the suite working after `commander`, `rimraf`, and `nip.io`-style DNS behaviour shifted under newer dependencies. The Docker-based runner under `test/integration/runner/` was retired because the workflow now provisions Docker directly on the runner.

Primary locations:

- `test/integration/` - step definitions and helpers updated for new dependency versions; debug output silenced in spawned CLI processes to stop noisy logs masking failures.
- `scripts/integration.sh` - aligned with the new test layout.
- `test/integration/runner/Dockerfile`, `docker-entrypoint.sh`, `docker-login.sh` - removed; the workflow no longer needs an in-repo container to host the suite.

Relevant commits: `fix: align integration tests with rimraf v5 and commander v12`, `fix: pin dnsLookup to IPv4 to prevent macOS resolver flake`, `fix(test): silence navy CLI debug output in integration spawns`, `fix(test): always silence navy CLI debug in integration spawns`, and `Fix integration tests`.

## Continuous integration

CI now runs on a Node 22 and 24 matrix against two Docker and two Docker Compose versions, using pinned action SHAs. The most subtle change is the routing of `dockerode` and the `docker compose` CLI through the same daemon: `docker/setup-docker-action` is invoked with `set-host: true`, and a runtime helper honours `DOCKER_HOST` when it points at a unix socket so both clients agree on which daemon to talk to. Without this, `dockerode` would silently fall back to `/var/run/docker.sock` and query a different daemon than `docker compose`, producing empty container listings.

Primary locations:

- `.github/workflows/build.yaml` - Node matrix, Docker / Compose matrix, pinned action SHAs, and the `set-host: true` configuration with an explanatory comment.
- `packages/navy/src/http-proxy.js` - `resolveDockerSocketPath` ensures the proxy container mounts the same socket the rest of Navy uses.

Related commits: `Use Moneyhub runners for CICD` and `fix: route navy through DOCKER_HOST socket on setup-docker-action`.

## Commit narrative

The commits below are listed in chronological order and group naturally into the strands above.

- `de29042` chore: modernize dependencies for Node 22 support
- `c01d440` Make Navy proxy image configurable
- `264846b` Fix navyFile propagation and add edge-case tests
- `f374e83` rename NAVY_PROXY_IMAGE env var to NAVY_HTTP_PROXY_IMAGE
- `5f0bd5c` Use Moneyhub runners for CICD
- `453c1a7` style: fix linting issues across navy packages
- `610a66c` fix: restore Flow type-checking under flow-bin 0.311
- `dd504ac` fix: pin dnsLookup to IPv4 to prevent macOS resolver flake
- `310b6ab` fix: align integration tests with rimraf v5 and commander v12
- `abcdf6e` Fix integration tests
- `1680372` fix(test): silence navy CLI debug output in integration spawns
- `a8fe75e` fix(test): always silence navy CLI debug in integration spawns
- `777eb1b` fix: route navy through DOCKER_HOST socket on setup-docker-action
- `70a2d20` Fix vulnerabilities
- `18da0bf` chore(deps): remediate npm audit vulnerabilities
- `13dc678` fix: propagate navyFile through https CLI reconfigureHTTPProxy calls
- `3d64bfc` test: add c8 coverage tooling and 100% unit test coverage
- `feat(http-proxy): allow forwarding custom env vars to the proxy container` - generic `httpProxyEnv` / `NAVY_HTTP_PROXY_ENV` passthrough on the proxy compose service, with the allowlist taking precedence on key collisions.

## Scope appendix - changed files by area

Counts come from `git diff --name-only origin/master...HEAD` aggregated by top-level area, and are useful for orienting reviewers before they open the diff.

| Area | Files changed |
| --- | --- |
| `packages/navy` | 140 |
| `test/integration` | 24 |
| Repository root (config, lockfile, etc.) | 9 |
| `packages/navy-plugin-nodejs` | 6 |
| `website` | 3 |
| `flow-libs` | 3 |
| `scripts` | 2 |
| `docs` | 2 |
| `.github` | 1 |

The heavy concentration in `packages/navy` reflects the unit-test backfill more than any sprawling refactor; the production source changes are narrowly scoped to the proxy-image feature, the HTTPS propagation fix, and small consistency edits that fell out of bringing the test suite to green.
