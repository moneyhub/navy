#!/bin/sh
set -e

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running on the host. Start Docker before running integration tests." >&2
  exit 1
fi

if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
  echo "docker compose (v1 or v2) must be installed on PATH." >&2
  exit 1
fi

if [ -n "${DOCKERHUB_PULL_USERNAME:-}" ]; then
  echo "${DOCKERHUB_PULL_PASSWORD}" | docker login --username "${DOCKERHUB_PULL_USERNAME}" --password-stdin
fi

NAVY_TEST_HOME="$(mktemp -d -t navy-integration-XXXXXX)"
trap 'rm -rf "$NAVY_TEST_HOME"' EXIT

# Preserve the real Docker config so the `docker compose` plugin (typically
# installed under $HOME/.docker/cli-plugins) remains discoverable when we
# point HOME at the temporary test directory below.
REAL_DOCKER_CONFIG="${DOCKER_CONFIG:-$HOME/.docker}"

echo ""
echo "RUNNING INTEGRATION TESTS"
echo "Using isolated HOME: $NAVY_TEST_HOME"
echo "Using DOCKER_CONFIG: $REAL_DOCKER_CONFIG"
echo ""

HOME="$NAVY_TEST_HOME" \
DOCKER_CONFIG="$REAL_DOCKER_CONFIG" \
  ./node_modules/.bin/cucumber-js --publish-quiet \
  -r ./test/integration/preload.js \
  -r ./test/integration/environment.js \
  -r ./test/integration/hooks.js \
  -r ./test/integration/chai.js \
  -r ./test/integration/features \
  -r ./test/integration/steps \
  ./test/integration/features "$@"
