# Base image
FROM oven/bun:1.2-alpine AS app
VOLUME /app
ARG USER_ID=1000
ARG GROUP_ID=1000
RUN getent passwd ${USER_ID} || ( addgroup -g ${GROUP_ID} app \
  && adduser -D -G app -u ${USER_ID} app )

# ---

# Client dependencies
FROM app AS client-builder
# Need to install nodejs, as bun doesn't exit after building
# https://github.com/web-infra-dev/rspack/issues/7067
RUN apk update && apk add --no-cache nodejs \
  && rm -rf /var/cache/apk/*
USER ${USER_ID}
WORKDIR /app/client
COPY ./client/package.json ./client/bun.lockb* ./
RUN bun install --frozen-lockfile \
  && rm -f bun.lockb
COPY ./client/ ./
RUN ./node_modules/.bin/rsbuild build

# Client runtime
FROM caddy:2.10.0-builder-alpine AS caddy-builder
RUN xcaddy build --with github.com/caddy-dns/cloudflare
FROM caddy:2.10.0-alpine AS client
WORKDIR /app/client
COPY --from=caddy-builder /usr/bin/caddy /usr/bin/caddy
COPY --from=client-builder /app/client/dist ./dist/

# ---

# Server runtime
FROM app AS server
RUN  mkdir -p /mnt/documents /mnt/artifacts \
  && chmod 755 /mnt/documents /mnt/artifacts \
  && chown -R ${USER_ID}:${GROUP_ID} /mnt/documents /mnt/artifacts
USER ${USER_ID}
WORKDIR /app/server
COPY ./server/package.json ./server/bun.lockb ./
RUN bun install --production --frozen-lockfile \
  && rm -f bun.lockb
COPY ./server/ ./
ENTRYPOINT ["/app/server/bin/docker-entrypoint.sh"]
CMD ["api"]

