FROM node:22-bookworm-slim AS slides
WORKDIR /deck
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY slides.md style.css ./
COPY public ./public
RUN npm run build -- --base /talk/

FROM node:22-bookworm-slim AS game
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY trading-floor/package*.json ./
RUN npm ci --no-audit --no-fund
COPY trading-floor ./
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=game /app/.next/standalone ./
COPY --from=game /app/.next/static ./.next/static
COPY --from=game /app/public ./public
COPY --from=slides /deck/dist ./public/talk
USER node
EXPOSE 3000
CMD ["node","server.js"]
