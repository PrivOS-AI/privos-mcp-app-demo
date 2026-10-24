FROM node:22.23.4-alpine3.23@sha256:6abbcf5dd6b231da109bcde1181db1d92bf78015ae1a9514d9807c1f857869db AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22.23.4-alpine3.23@sha256:6abbcf5dd6b231da109bcde1181db1d92bf78015ae1a9514d9807c1f857869db AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
# Patch base-image openssl (CVE-2026-14456: libcrypto3/libssl3, fixed in 3.5.8-r0)
RUN apk --no-cache upgrade libcrypto3 libssl3 \
    && rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx
# CVE-2026-111497: fail the build on an unpatched Node. Compare the Node version, not process.versions.brotli
# (22.23.4 still reports brotli 1.1.0 because the fix was cherry-picked).
RUN node -e 'const v=process.versions.node.split(".").map(Number);const min={22:[22,23,4],24:[24,22,1],26:[26,12,1]}[v[0]];const ok=min&&(v[1]>min[1]||(v[1]===min[1]&&v[2]>=min[2]));if(!ok){console.error("Node "+process.version+" is below the CVE-2026-111497 minimum for its line");process.exit(1)}'
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/privos-app.json ./privos-app.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/public ./public
ARG PRIVOS_MCP_MANIFEST_JSON
ARG PRIVOS_MCP_MANIFEST_DIGEST
LABEL io.privos.mcp.manifest="${PRIVOS_MCP_MANIFEST_JSON}" \
      io.privos.mcp.manifest-digest="${PRIVOS_MCP_MANIFEST_DIGEST}"
USER node
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- "http://127.0.0.1:${PORT}/ready" >/dev/null || exit 1
CMD ["node_modules/.bin/tsx", "src/server.ts"]
