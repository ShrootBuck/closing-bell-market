FROM node:22-bookworm-slim AS slides
WORKDIR /deck
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY slides.md style.css global-top.vue ./
COPY components ./components
COPY public ./public
RUN npm run build -- --base /talk/

FROM node:22-bookworm-slim AS game
WORKDIR /game
COPY game/package*.json ./
RUN npm ci --no-audit --no-fund
COPY game ./
RUN npx tsc --noEmit && npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data PUBLIC_DIR=/app/public
COPY --from=game /game/dist/server.mjs ./server.mjs
COPY --from=game /game/dist/public ./public
COPY --from=slides /deck/dist ./public/talk
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
