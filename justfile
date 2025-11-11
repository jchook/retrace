set positional-arguments := true

# List all the commands
list:
  just --list

build:
  cd client && bun run build

# Drizzle Kit shortcut
db *args="--help":
  docker compose exec api bun drizzle-kit "$@"

# Generate OpenAPI spec and other code
gen:
  cd server && just gen
  cd client && just gen

# View docker logs
logs:
  docker compose logs -f

# Interactive shell on the api server
sh:
  docker compose exec api bash

# Start the server
up:
  docker compose up --build

prod *args="up":
  docker compose -f docker-compose.prod.yml "$@"

rsync:
  rsync -av --delete \
    --exclude node_modules \
    --exclude .git \
    --exclude .env \
    --exclude server/storage/ \
    ./ retrace.sh:app/

deploy: rsync
  ssh retrace.sh "cd app && just prod up --build -d"
