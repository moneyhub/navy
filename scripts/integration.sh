set -e

echo ""
echo "SETTING UP ENVIRONMENT"
echo "This may take several minutes to build the necessary docker containers..."
echo "This will only take a while the first time you run the tests, subsequent runs should be faster"
echo ""
echo ""

DOCKER_TAG=${DOCKER_TAG:-19.03.14-dind}
DOCKER_COMPOSE_VERSION=${DOCKER_COMPOSE_VERSION:-1.29.2}
NODE_VERSION=${GITHUB_NODE_VERSION:-12}

DOCKER_TLS_CERTDIR=""

DOCKER_SHARED_DIR=$(mktemp -d)

if [ ! -z "${DOCKERHUB_PULL_USERNAME:-}" ]; then
  echo "${DOCKERHUB_PULL_PASSWORD}" | docker login --username "${DOCKERHUB_PULL_USERNAME}" --password-stdin
fi

echo "Integration environment docker --version:"
docker --version
docker run -d --name navy-test-runner-daemon --privileged \
  -v $(pwd):/usr/src/app \
  -v $DOCKER_SHARED_DIR:/root/.navy/tls-certs \
  -e DOCKER_TLS_CERTDIR \
  docker:$DOCKER_TAG --storage-driver=overlay

docker build \
    -t navy-test-runner \
    -f test/integration/runner/Dockerfile \
    --build-arg DOCKER_COMPOSE_VERSION=$DOCKER_COMPOSE_VERSION \
    --build-arg NODE_VERSION=$NODE_VERSION \
    --build-arg DOCKERHUB_PULL_USERNAME=$DOCKERHUB_PULL_USERNAME \
    --build-arg DOCKERHUB_PULL_PASSWORD=$DOCKERHUB_PULL_PASSWORD \
    .

echo ""
echo ""
echo "RUNNING TESTS"
echo ""
echo ""

docker run --rm --link navy-test-runner-daemon:docker \
  --name navy-test-runner \
  -v $DOCKER_SHARED_DIR:/root/.navy/tls-certs \
  -v $(pwd)/packages:/usr/src/app/packages \
  -v $(pwd)/test:/usr/src/app/test \
  -v $(pwd)/resources:/usr/src/app/resources \
  -v $(pwd)/babel.config.js:/usr/src/app/babel.config.js \
  --workdir /usr/src/app navy-test-runner \
    ./node_modules/.bin/cucumber-js --fail-fast --publish-quiet \
    -r ./test/integration/preload.js \
    -r ./test/integration/environment.js \
    -r ./test/integration/hooks.js \
    -r ./test/integration/chai.js \
    -r ./test/integration/features \
    -r ./test/integration/steps \
    ./test/integration/features "$@"

docker rm --force navy-test-runner-daemon
