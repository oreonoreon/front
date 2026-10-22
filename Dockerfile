# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- serve stage ----
FROM nginx:1.27-alpine

# Файлы с расширением .template в /etc/nginx/templates автоматически
# обрабатываются через envsubst и кладутся в /etc/nginx/conf.d при старте
# официального nginx-образа (см. docker-entrypoint.d/20-envsubst-on-templates.sh).
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Значения по умолчанию для локального запуска без Railway.
# На Railway PORT задаётся платформой автоматически, а BACKEND_ORIGIN
# нужно явно прописать в Variables сервиса (публичный URL backend или,
# лучше, приватный Railway-домен вида http://backend.railway.internal:8080).
ENV PORT=8080
ENV BACKEND_ORIGIN=https://myapp-backend.up.railway.app
# Включает встроенный механизм официального nginx-образа: перед стартом
# определяет DNS-resolver из /etc/resolv.conf контейнера и экспортирует
# его в NGINX_LOCAL_RESOLVERS для использования в шаблоне конфига.
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

EXPOSE 8080
