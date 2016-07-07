#!/bin/sh
set -e

npm run lint
npm run flow
npm run unit
npm run integration
