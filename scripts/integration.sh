set -e

echo ""
echo "SETTING UP ENVIRONMENT"
echo "This may take several minutes to build the necessary docker containers..."
echo "This will only take a while the first time you run the tests, subsequent runs should be faster"
echo ""
echo ""

DOCKER_TAG=${DOCKER_TAG:-17.03-dind}
DOCKER_COMPOSE_VERSION=${DOCKER_COMPOSE_VERSION:-1.12.0}
NODE_VERSION=${TRAVIS_NODE_VERSION:-6}

docker run -d --name navy-test-runner-daemon --privileged \
  -v $(pwd):/usr/src/app \
  docker:$DOCKER_TAG --storage-driver=aufs

clean_daemon() {
  docker rm --force navy-test-runner-daemon
}
trap clean_daemon EXIT

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
