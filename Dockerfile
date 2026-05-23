FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/

RUN npm ci

COPY . .

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/backend
RUN npm run build --workspace=packages/frontend

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/backend/package.json packages/backend/
COPY --from=builder /app/packages/frontend/package.json packages/frontend/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/frontend/dist ./packages/frontend/dist

RUN npm prune --omit=dev

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "packages/backend/dist/index.js"]
