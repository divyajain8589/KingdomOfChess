# syntax=docker/dockerfile:1

# ---- build: compile TypeScript -> dist/ ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---- prod deps only ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- runtime ----
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --from=build --chown=node:node /app/dist ./dist
# dist/db/migrate.js resolves migrations at ../../drizzle -> /app/drizzle
COPY --chown=node:node drizzle ./drizzle
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
USER node
EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
