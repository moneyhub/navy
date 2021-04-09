#!/bin/sh
set -e

if [ ! -z "${DOCKERHUB_PULL_USERNAME:-}" ]; then
  echo "${DOCKERHUB_PULL_PASSWORD}" | docker login --username "${DOCKERHUB_PULL_USERNAME}" --password-stdin
fi
