Navy has a comprehensive suite of integration tests.

These tests run directly on the host via `npm run integration`. The script (`scripts/integration.sh`) creates a fresh temporary directory and points `HOME` at it for the lifetime of the run, so navy's state directory (`~/.navy`) is isolated and your real `~/.navy` is never touched. The tests do, however, talk to your host's Docker daemon directly - any test navies / containers will be created and torn down against that daemon.

## Prerequisites

- Node.js matching the version range in `package.json` (`engines.node`).
- A running Docker daemon reachable from your shell (Docker Desktop, Colima, or a native daemon).
- `docker compose` v2 (preferred) or `docker-compose` v1 available on `PATH`.

## Running

```sh
npm ci
npm run integration
```

Any extra arguments are forwarded to `cucumber-js`, for example to run a single feature:

```sh
npm run integration -- ./test/integration/features/config.feature
```

To run a single scenario, set the `SCENARIO` environment variable to a regular expression that matches the scenario name (this maps to `cucumber-js --name`):

```sh
SCENARIO='Stopping a service should stop it' npm run integration
```

## CI

In GitHub Actions, the matrix in `.github/workflows/build.yaml` drives the Node, Docker engine, and Docker Compose versions via `actions/setup-node`, `docker/setup-docker-action`, and `docker/setup-compose-action` respectively, and then runs `npm test` directly on the runner.
