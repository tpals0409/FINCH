# FINCH 첫 배포 런북

서버 상주 에이전트(**Pico**)가 따라 하는 절차다. 브리핑은 `docs/ops/pico.md` 에 있고,
이 문서는 그중 **최초 부트스트랩 한 번**만 다룬다.

**배포 자체는 ArgoCD 가 한다.** 여기 있는 것은 ArgoCD 에게 일을 시작시키는 절차이고,
이 뒤로는 `master` 에 머지하면 이미지가 빌드되고 태그가 갱신되고 알아서 반영된다.

---

## 0. 시작 전 조건

아래가 전부 참이어야 한다. 하나라도 아니면 **멈추고 보고한다.**

| 확인할 것 | 이래야 한다 |
|---|---|
| `kubectl -n argocd get statefulset argocd-application-controller` | `READY 1/1` |
| `kubectl -n kube-system get deploy sealed-secrets-controller` | Running |
| `kubectl get crd sealedsecrets.bitnami.com` | 있음 |
| `kubectl get crd servicemonitors.monitoring.coreos.com` | 있음 |
| `finch-gitops` 저장소 | **public 이다** (2026-09-06 전환). 자격증명이 필요 없다 |
| `kubectl get storageclass` | 기본 StorageClass 가 있음 (k3s 는 `local-path`) |

**StorageClass 가 특히 조용히 막는 자리다.** postgres 두 대가 각각 10Gi PVC 를 요구하는데
기본 StorageClass 가 없으면 PVC 가 `Pending` 에 머물고 파드는 영원히 `ContainerCreating` 이다.
에러가 아니라 정지라서 뭘 기다리는지 보이지 않는다 — `kubectl -n finch-prod describe pvc` 가
그때 답을 준다.

또 하나 — `platform/data/` 에 아래 봉인본이 다 있어야 한다. 없으면 그 Secret 을 기다리는
파드가 `CreateContainerConfigError` 로 멈춘다.

```
sealed-postgres-backend.yaml
sealed-backend-secrets.yaml
sealed-origin-tls.yaml
```

`sealed-ghcr-pull.yaml` 은 GHCR 패키지가 public 이면 없어도 된다.

---

> ## ⚠️ 봉인 전에 apply 하지 마라
>
> "일단 postgres 만 띄워서 파이프라인을 시험해보자" 가 안 되는 이유가 있다.
>
> `seal.sh` 는 `postgres-backend-secret` 과 `backend-secrets` 를 **같은 비밀번호로 새로**
> 만든다. 봉인된 값은 되읽을 수 없어서 그 방법밖에 없다. 그런데 postgres 가 이미 한 번
> 떴다면 **PVC 안의 DB 는 그때 받은 옛 비밀번호를 그대로 들고 있다** — 새 Secret 이 와도
> DB 자신의 비밀번호는 안 바뀐다. 그때부터 백엔드가 `password authentication failed` 로
> 붙지 못하고, 고치려면 PVC 를 지워야 한다(= 데이터를 버린다).
>
> **`keys.md` 를 다 채우고 `seal.sh` 를 돌린 뒤에 시작한다.**

## 1. AppProject 를 먼저 apply 한다

```bash
kubectl apply -f https://raw.githubusercontent.com/tpals0409/finch-gitops/main/argocd/projects/finch.yaml
```
(저장소가 비공개면 클론해서 로컬 경로로 apply 한다)

**루트 앱보다 먼저여야 한다.** 루트 앱이 `project: finch` 를 참조하는데, 루트 앱은 자기
관리 범위에서 `projects/*` 를 제외해 두었다 — ArgoCD 가 자기 자신을 관리하려다 꼬이는 것을
막으려는 설계다. 그 대가로 이 하나는 사람이 넣어야 한다.

확인:
```bash
kubectl -n argocd get appproject finch
```

---

## 2. 루트 앱을 apply 한다

```bash
kubectl apply -f .../argocd/root/root-app.yaml
```

이것 하나면 나머지는 git 에서 자동으로 따라온다 — 네임스페이스, 데이터 계층(postgres·redis),
그리고 `apps/prod/*` 를 훑어 서비스 Application 을 만드는 ApplicationSet 까지.

**첫 동기화에서 CPU 가 튄다.** 이전 실측에서 컨트롤러가 순간 `1269m` 까지 갔다. 2 vCPU
(allocatable 1750m) 환경이라 잠깐 느려지지만 죽지는 않는다. 놀라지 말 것.

---

## 3. 지켜본다

```bash
kubectl -n argocd get applications -w
kubectl -n finch-prod get pods -w
```

떠야 하는 것 — `postgres-backend` · `postgres-ai` · `redis` · `backend` · `frontend`.
**`ai` 는 안 뜨는 게 정상이다.** 첫 배포에서 껐다(`apps/prod/ai/values.yaml` 의
`application.enabled: false`). 이유는 그 파일 주석에 있다.

`backend` 는 기동이 느리다. JVM 이고 Flyway 마이그레이션이 먼저 돈다.
`startupProbe` 가 그만큼을 기다리게 돼 있으니 `Running` 이 될 때까지 둔다.

---

## 4. 확인

```bash
kubectl -n finch-prod get pods
curl -sI https://app.finchapp.org/
curl -s -o /dev/null -w "%{http_code}\n" "https://app.finchapp.org/api/v1/stocks/search?keyword=삼성"
```

마지막이 **`401` 이면 성공이다.** 인증이 필요한 엔드포인트가 인증을 요구한다는 것은
백엔드가 살아서 응답한다는 뜻이다. `200` 이 아니라 `401` 을 기대한다.

인증서도 본다 — issuer 가 `TRAEFIK DEFAULT CERT` 가 아니라 Cloudflare Origin CA 여야 한다.
```bash
echo | openssl s_client -connect app.finchapp.org:443 -servername app.finchapp.org 2>/dev/null \
  | openssl x509 -noout -issuer
```

---

## 5. 그다음 — KIS 토큰 발급

**이번 배포의 진짜 목적이다.** 이 서버에서 한국투자증권 API 에 토큰을 발급해
**IP 화이트리스트가 필요한지 판명한다.** 로컬에서는 망이 막혀 한 번도 확인하지 못했다.

백엔드 파드 안에서 모의투자 토큰 엔드포인트(`/oauth2/tokenP`)를 호출한다.
성공하면 화이트리스트가 필요 없는 것이고, 거절되면 egress IP `223.130.147.160` 을
증권사에 등록해야 한다.

**응답 본문에 토큰이 실려 있다. 로그에도 보고에도 옮겨 적지 말 것** — 성공/실패와
상태 코드만 알려주면 된다.

---

## 막혔을 때

| 증상 | 원인 | 할 일 |
|---|---|---|
| 루트 앱 `repository not accessible` | 저장소를 못 읽음 | 0번 마지막 줄. 공개 전환 또는 자격증명 |
| `ImagePullBackOff` | GHCR 접근 | 패키지 public 전환 또는 `ghcr-pull` 봉인 |
| `FailedToRetrieveImagePullSecret` 경고만 뜨고 파드는 정상 | 패키지를 public 으로 돌려 `ghcr-pull` 이 없는 상태 | **정상이다.** 공개 이미지는 자격증명 없이 당겨진다. 거슬리면 values 의 `imagePullSecrets` 두 줄을 지운다 |
| `CreateContainerConfigError` | Secret 이 없음 | `platform/data/` 의 봉인본 확인 |
| 브라우저에 `526` | 원본 인증서 | `finch-origin-tls` 가 있는지, Cloudflare 가 Full (strict) 인지 |
| 브라우저에 `52x` | 원본에 못 닿음 | Traefik 과 Ingress 확인 |
| backend `CrashLoopBackOff` | 비밀값 누락 | 로그에 어느 환경변수인지 나온다. **값은 옮겨 적지 말고 이름만** |
| Grafana 에 지표가 안 보임 | **우리 문제 아니다** | Grafana·Alertmanager 가 누락 Secret 으로 비정상이다. 지표는 Prometheus 쿼리로 본다 |

**어느 경우에도 `kubectl edit` 으로 고치지 않는다.** ArgoCD 가 self-heal 로 되돌리고,
되돌아가는 사이에 우리는 고쳤다고 믿게 된다. 무엇이 어긋났는지만 보고하면 저장소를 고친다.
