
# Stage 1: Install dependencies
FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci


# Stage 2: Generate Prisma Client
FROM dependencies AS build

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY src ./src

RUN npx prisma generate


# Stage 3: Install production dependencies only
FROM node:22-alpine AS runtime-dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev


# Stage 4: Production API image
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --chown=node:node package*.json ./
COPY --from=runtime-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/src ./src

USER node

EXPOSE 3000

CMD ["npm", "start"]


# Stage 5: Database migration image
FROM build AS migrate

CMD ["npx", "prisma", "migrate", "deploy"]
