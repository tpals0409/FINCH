# infra

Dockerfile 3종, 로컬 개발용 compose, frontend 이미지의 nginx 설정.

**배포 상태의 단일 진실 공급원은 이 디렉터리가 아니다.** k8s 매니페스트·Helm·ArgoCD 는
[`finch-gitops`](https://github.com/tpals0409/finch-gitops) 에 있다. 여기 있는 compose 는
로컬에서만 쓴다. 둘을 평행으로 유지하려 하지 않는다.

파트 지침은 `infra/CLAUDE.md` 다. 이 문서는 손으로 돌리는 절차만 적는다.

## 이미지

| Dockerfile | 이미지 | 빌드 컨텍스트 |
|---|---|---|
| `docker/backend.Dockerfile` | `ghcr.io/tpals0409/finch-backend` | 저장소 루트 |
| `docker/frontend.Dockerfile` | `ghcr.io/tpals0409/finch-frontend` | 저장소 루트 |
| `docker/ai.Dockerfile` | `ghcr.io/tpals0409/finch-ai` | 저장소 루트 |

만드는 것은 `.github/workflows/images.yml` 이다. PR 에서는 빌드만 하고, master push 에서
GHCR 에 올린 뒤 finch-gitops 의 `apps/prod/<서비스>/values.yaml` 태그를 갱신한다.
태그는 `sha-<커밋 12자리>` — 가변 태그를 GitOps 에 넣으면 매니페스트가 그대로인데 이미지
내용만 바뀌어 Argo CD 가 변화를 보지 못한다.

손으로 확인할 때 (컨텍스트가 루트라 저장소 루트에서 실행한다):

```bash
docker build -f infra/docker/frontend.Dockerfile -t finch-frontend:test .
```

## 로컬 스택

```bash
cd infra
cp .env.example .env    # DB 계정·JWT·카카오 키 작성
cp ../ai/.env.example ai.env
docker compose up -d --wait && docker compose ps
```

호스트에 여는 것은 nginx 80 하나다. `http://localhost` 로 SPA 가 뜨고 `/api` 는 nginx 가
backend 로 넘긴다. **이 프록시는 compose 전용이다** — k8s 에서는 Ingress 가 같은 일을 한다
(`nginx/nginx.conf` 주석 참고).

프런트만 고칠 때는 compose 대신 vite dev 서버가 빠르다. `frontend/vite.config.ts` 가
`/api` 를 `http://localhost:8080` 으로 프록시한다.

nginx 설정을 고쳤으면 문법 검사부터:

```bash
docker run --rm -v "$PWD/nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  nginx:1.27-alpine nginx -t
```

## 백업

`scripts/backup-db.sh` · `scripts/restore-db.sh` 는 compose 의 `a101-postgres-*` 컨테이너를
상대로 동작한다. 자동으로 부르는 것은 없다 — cron 을 걸던 `setup-server.sh` 는 Sprint 3 에서
지웠다. 운영 DB 백업은 k8s 로 옮길 때 다시 정한다.

## 관측 스택

`docker-compose.observability.yml` (prometheus · loki · alloy · grafana).
앱과 분리해 띄우므로 앱을 재배포해도 지표 이력이 남는다.

```bash
cd infra && docker compose -f docker-compose.observability.yml up -d
```

Grafana·Prometheus 는 `127.0.0.1` 에만 바인딩한다. `GRAFANA_ADMIN_PASSWORD` 가 비면
Grafana 는 기동을 거부한다 — 설정을 빠뜨린 배포가 `admin/admin` 으로 뜨는 것을 막는
의도적 설계다.

### 왜 지표와 로그를 둘 다 두는가

지표는 "언제 이상한가"에, 로그는 "왜 그런가"에 답한다. 대체재가 아니다.
지연이 튀는 것은 지표에서만 보이고, 그 순간 무슨 예외가 났는지는 로그에만 있다.

Loki 는 로그 본문을 색인하지 않고 **라벨만** 색인한다. 먼저 라벨로 좁힌 뒤 본문을 훑는다.

```logql
{service="backend"}                     # 백엔드 로그
{stack="a101"} |= "ERROR"                # 앱 스택 전체에서 ERROR
{job="docker"} |= "3fa85f64-5717-4562"   # 요청 ID 로 backend 와 ai 교차 조회
```

마지막 것이 중요하다. 분산 추적을 도입하지 않기로 한 대신 `X-Request-Id` 로 서비스 간
로그를 잇는다. 홉이 최대 3단계라 이 방법으로 충분하다.

설정을 고쳤으면 각 도구로 검증한다. 잘못된 설정은 컨테이너가 조용히 재시작 루프에 빠지는
형태로 나타난다.

```bash
cd infra/observability
docker run --rm --entrypoint promtool -v $PWD/prometheus.yml:/p.yml prom/prometheus:v3.1.0 check config /p.yml
docker run --rm -v $PWD/loki-config.yml:/c.yml grafana/loki:3.3.2 -config.file=/c.yml -verify-config
docker run --rm -v $PWD/alloy-config.alloy:/c.alloy grafana/alloy:v1.5.1 fmt /c.alloy
```

### 남은 것

- **AI 애플리케이션 지표** — FastAPI 가 `/metrics` 를 노출하지 않는다(실측 404). 계측은 앱 코드에
  들어가야 하는데 `ai/` 는 AI 파트 소유라 인프라가 직접 넣을 수 없다. AI 파트에 요청해야 한다 —
  인프라만으로는 컨테이너·호스트 지표까지가 한계다
- **관측 스택 자체를 finch-gitops 로** — 컨테이너·대시보드 이름이 아직 `a101` 이다.
  옮기면서 같이 고친다
