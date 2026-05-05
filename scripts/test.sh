#!/bin/sh
set -e

npm run lint
npm run flow
npm run coverage
npm run integration
