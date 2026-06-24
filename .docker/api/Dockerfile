# syntax=docker/dockerfile:1

# ---- Build stage: install all deps and compile TypeScript -> dist ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN yarn build

# ---- Runtime stage: production deps + compiled output only ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Install only production dependencies for a small, secure image.
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production && yarn cache clean

# Copy compiled JS from the build stage.
COPY --from=build /app/dist ./dist

# Run as the built-in non-root user.
USER node

EXPOSE 3000
# Default command runs the API; the worker service overrides it in compose.
CMD ["node", "dist/main.js"]
