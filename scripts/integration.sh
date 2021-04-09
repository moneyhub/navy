set -e

echo ""
echo "SETTING UP ENVIRONMENT"
echo "This may take several minutes to build the necessary docker containers..."
echo "This will only take a while the first time you run the tests, subsequent runs should be faster"
echo ""
echo ""

DOCKER_TAG=${DOCKER_TAG:-18.09-dind}
DOCKER_COMPOSE_VERSION=${DOCKER_COMPOSE_VERSION:-1.23.1}
NODE_VERSION=${TRAVIS_NODE_VERSION:-10}

if [ ! -z "${DOCKERHUB_PULL_USERNAME:-}" ]; then
  echo "${DOCKERHUB_PULL_PASSWORD}" | docker login --username "${DOCKERHUB_PULL_USERNAME}" --password-stdin
fi

docker run -d --name navy-test-runner-daemon --privileged \
  -v $(pwd):/usr/src/app \
  docker:$DOCKER_TAG --storage-driver=overlay

docker build \
    -t navy-test-runner \
    -f test/integration/runner/Dockerfile \
    --build-arg DOCKER_COMPOSE_VERSION=$DOCKER_COMPOSE_VERSION \
    --build-arg NODE_VERSION=$NODE_VERSION \
    .

echo ""
echo ""
echo "RUNNING TESTS"
echo ""
echo ""

docker run --rm -it --link \
  navy-test-runner-daemon:docker \
  -v $(pwd)/packages:/usr/src/app/packages \
  -v $(pwd)/test:/usr/src/app/test \
  -v $(pwd)/resources:/usr/src/app/resources \
  -v $(pwd)/.babelrc:/usr/src/app/.babelrc \
  --workdir /usr/src/app/test/integration navy-test-runner \
  ../../node_modules/.bin/cucumberjs --strict --fail-fast \
    -r ./preload.js \
    -r ./environment.js \
    -r ./hooks.js \
    -r ./chai.js \
    -r ./features \
    -r ./steps \
    ./features "$@"

docker rm --force navy-test-runner-daemon
