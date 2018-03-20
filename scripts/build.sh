#!/bin/sh
set -e

for f in packages/*; do
  if [ -d "$f/src" ]; then
    rm -rf "${f:?}/lib"
    node node_modules/.bin/babel "$f/src" --out-dir "$f/lib" --copy-files $1 &
  fi
done

wait
