set positional-arguments := true

# List all the commands
list:
  just --list

build:
  cd client && bun run build

# Generate OpenAPI spec and SDK
gen:
  cd server && just gen && cd ../client && just gen

# ---

client *args="zsh":
  docker compose exec client "$@"

server *args="zsh":
  docker compose exec api "$@"

db *args="--help":
  docker compose exec api bun drizzle-kit "$@"

logs:
  docker compose logs -f

prod *args="up":
  docker compose -f docker-compose.prod.yml "$@"

root *args="ash":
  docker compose exec -u root api "$@"

sh:
  docker compose exec api zsh

up *args="--menu":
  HOST_UID=$(id -u) HOST_GID=$(id -g) docker compose up --build --wait "$@"

# ---

rsync:
  rsync -av --delete \
    --exclude node_modules \
    --exclude .git \
    --exclude .env \
    --exclude server/storage/ \
    ./ retrace.sh:app/

deploy: rsync
  ssh retrace.sh "cd app && just prod up --build -d"
