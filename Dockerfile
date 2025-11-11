# Base image
FROM oven/bun:1.2-alpine AS app
VOLUME /app
ARG USER_ID=1000
ARG GROUP_ID=1000
# Modify the existing bun user/group to match the desired UID/GID
RUN deluser bun \
  && (delgroup bun 2>/dev/null || true) \
  && addgroup -g ${GROUP_ID} app \
  && adduser -D -h /home/app -G app -u ${USER_ID} app

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

# ---

# Development environment
FROM app AS app-dev
RUN apk update \
  && apk add --no-cache \
    zsh git curl wget less openssh neovim fzf \
    zsh-autosuggestions zsh-syntax-highlighting zsh-history-substring-search \
    bash-completion coreutils starship \
  && sed -i 's~:/bin/sh$~:/bin/zsh~' /etc/passwd \
  && ln -s -f /bin/zsh
RUN bun add -g @anthropic-ai/claude-code
ENV STARSHIP_CONFIG=/etc/starship.toml \
  HISTFILE=/home/app/.zsh/zsh_history \
  HISTSIZE=100000 \
  SAVEHIST=100000 \
  TERM=xterm-256color
USER ${USER_ID}
COPY ./server/etc/home/ /home/app/
COPY ./server/etc/starship.toml /etc/starship.toml
WORKDIR /app/server
VOLUME /home/app/.zsh
VOLUME /home/app/.claude
CMD ["/bin/zsh"]
