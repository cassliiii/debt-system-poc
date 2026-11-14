FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG VITE_USE_MOCK=false
ARG VITE_USE_MOCK_INGESTA=true
ARG VITE_INGESTA_BASE_URL=""
ARG VITE_MAX_UPLOAD_MB=500

ENV VITE_USE_MOCK=$VITE_USE_MOCK
ENV VITE_USE_MOCK_INGESTA=$VITE_USE_MOCK_INGESTA
ENV VITE_INGESTA_BASE_URL=$VITE_INGESTA_BASE_URL
ENV VITE_MAX_UPLOAD_MB=$VITE_MAX_UPLOAD_MB

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
