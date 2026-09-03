FROM node:20-alpine AS builder

# VITE_API_URL is baked into the SPA at build time. Default is the same-origin
# relative path /api, which nginx routes to the backend at runtime (so the
# browser never needs to know the backend host). Override with a
# --build-arg / Render env var only for deployments that call the backend
# directly from the browser.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

# Runtime defaults for the nginx template (frontend/nginx.conf).
#  - Docker Compose: "backend" resolves via Docker's embedded DNS
#    (127.0.0.11) and the service listens on 80 (compose maps 80:80).
#  - Render (split services): Render injects PORT; render.yaml overrides
#    BACKEND_UPSTREAM with the backend service URL and NGINX_RESOLVER with a
#    public resolver. nginx starts even before that host is reachable.
ENV PORT=80 BACKEND_UPSTREAM=http://backend:8000 NGINX_RESOLVER=127.0.0.11

# The official nginx entrypoint renders every *.template in /etc/nginx/templates/
# with envsubst into /etc/nginx/conf.d/ before starting nginx.
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
