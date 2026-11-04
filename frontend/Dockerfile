# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# Passed in from docker-compose so the built JS points at the right backend
ARG VITE_API_URL=http://localhost:8000
ARG VITE_WS_URL=ws://localhost:8000/ws/telemetry
ARG VITE_API_KEY=
ARG VITE_MEDIAMTX_URL=http://localhost:8888
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_API_KEY=$VITE_API_KEY
ENV VITE_MEDIAMTX_URL=$VITE_MEDIAMTX_URL
RUN NODE_OPTIONS="--max-old-space-size=768" npm run build

# --- Serve stage ---
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
