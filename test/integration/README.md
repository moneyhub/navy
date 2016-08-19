Navy has a comprehensive suite of integration tests.
These tests are supposed to be run inside an isolated environment as it will hijack the home directory and simulate a users environment.

When running the tests with `npm run integration`, `scripts/integration.sh` will build a Docker container to run the tests in. This container is linked to another Docker container. This other container uses the `docker:dind` image, which has a Docker Daemon running inside of it. This essentially means that the entire test suite is testing against an isolated, disposable Docker instance, which means your local Docker won't get hijacked.
