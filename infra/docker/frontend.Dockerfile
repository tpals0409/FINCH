# frontend 빌드 + nginx 서빙 (결정: Nginx가 정적 파일 직접 서빙)
# 빌드 컨텍스트는 저장소 루트: docker compose 의 context: .. 기준 경로다.
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Vite 는 빌드 시점에 값을 번들에 박는다. 런타임 환경변수로는 바뀌지 않는다.
# .dockerignore 가 **/.env 를 제외하므로 이 경로 말고는 값이 들어올 곳이 없다.
#
# 빌더가 이 ARG/ENV 에 SecretsUsedInArgOrEnv 경고를 낸다 — 오탐이다. 카카오 REST API
# 키는 공개 client_id 라 번들에 실려도 되는 값이고(infra/.env.example 참고), Vite 가
# 빌드 시점에 값을 박는 구조상 secret mount(RUN --mount=type=secret)로는 애초에 안 된다.
ARG VITE_KAKAO_REST_API_KEY
ENV VITE_KAKAO_REST_API_KEY=$VITE_KAKAO_REST_API_KEY
RUN npm run build

# k8s 의 기본 securityContext(runAsNonRoot, runAsUser 1000)로 뜬다. 표준 nginx 이미지는
# /var/cache/nginx·/var/run/nginx.pid 가 root 소유라 UID 1000 이 쓰지 못하고 죽는다.
# unprivileged 계열은 그 경로들을 비루트 쓰기 가능(gid 0)으로 만들어 둔 이미지라 그대로 뜬다.
# 대신 1024 미만 포트를 못 열어 nginx.conf 가 8080 을 듣는다.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY infra/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
