#!/bin/sh
set -e

TYPE=${1:-api}

# Run the appropriate process
if [ "$TYPE" = "api" ]; then
  if [ "$NODE_ENV" = "development" ]; then
    echo "Running API in development mode"
    bun install >&2
    exec bun run --watch src/index.ts
  else
    echo "Running API in production mode"
    exec bun run src/index.ts
  fi
elif [ "$TYPE" = "worker" ]; then
  if [ "$NODE_ENV" = "development" ]; then
    echo "Running worker in development mode"
    exec bun run --watch src/worker.ts
  else
    echo "Running worker in production mode"
    exec bun run src/worker.ts
  fi
else
  echo "Running custom command: $*"
  exec "$@"
fi
