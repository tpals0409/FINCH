# 폰트 원본과 변환 절차

이 디렉터리는 **웹에 서빙되지 않는다.** 원본 TTF 와 변환 스크립트만 들어 있다.
브라우저가 받는 파일은 `public/fonts/*.woff2` 이고, 그건 여기서 만들어 낸 산출물이다.

핀로그 `front/fonts-src` 의 파이프라인을 Gmarket Sans 3종에 맞게 옮겼다.
발표자료(FINCH-presentation)와 같은 서체를 앱에도 쓰기로 한 결정에 따른 것이다.

## 왜 원본을 그대로 쓰지 않나

Gmarket Sans TTF 는 한 굵기에 2.3MB 다. `public/` 에 두면 Vite 가 `dist/` 로 통째로 복사해
모바일 첫 진입에 7MB 를 받게 된다. 원본은 서빙되지 않는 이 디렉터리에 두고, 필요한 글자만
뽑아 WOFF2 로 압축한 것만 `public/fonts/` 로 내보낸다.

| 원본                              | → 산출물                                 | 크기     |
| --------------------------------- | ---------------------------------------- | -------- |
| `GmarketSansTTFLight.ttf` (2.3M)  | `public/fonts/gmarket-sans-light.woff2`  | 104K     |
| `GmarketSansTTFMedium.ttf` (2.3M) | `public/fonts/gmarket-sans-medium.woff2` | 112K     |
| `GmarketSansTTFBold.ttf` (2.4M)   | `public/fonts/gmarket-sans-bold.woff2`   | 108K     |
|                                   | **합계**                                 | **324K** |

## 굵기 매핑

Gmarket Sans 는 Light·Medium·Bold 셋뿐이다. `index.css` 의 `@font-face` 가 굵기를 **범위**로 받는다.

| 요청 굵기 | 나오는 얼굴 |
| --------- | ----------- |
| 100~399   | Light       |
| 400~599   | Medium      |
| 600~900   | Bold        |

그래서 토큰의 `--text-title-3--font-weight: 600` 은 Bold, `--text-caption--font-weight: 400` 은 Medium 이
된다. 토큰 값을 바꾸지 않았고, 브라우저가 가짜 굵기를 합성하지도 않는다. 발표자료 `typography.css` 와 같은 방식.

## 다시 만들기

```bash
python3 -m venv fonts-src/.venv && fonts-src/.venv/bin/pip install fonttools brotli
./fonts-src/build.sh
```

`build.sh` 는 `fonts-src/.venv/bin/pyftsubset` 이 있으면 그걸 쓰고, 없으면 PATH 를 본다.
`PYFTSUBSET=경로` 로 직접 지정할 수도 있다. 시스템 파이썬이 PEP 668 로 `pip install` 을 막아서 venv 를 권한다.

산출물은 `public/fonts/` 에 덮어쓴다. **결과 파일도 저장소에 커밋한다.** 빌드 파이프라인에
파이썬 의존을 넣지 않기 위해서다. 폰트는 거의 바뀌지 않는다.

## 서브셋 범위

`charset.py` 하나가 정한다. 현재 **KS X 1001 완성형 한글 2350자 + ASCII + 한글 자모 + 상용 기호 = 2524자**.

- 한글 음절은 유니코드에 11172자가 있지만 실제 표기에는 완성형 2350자가 사실상 전부다. 다 넣으면 파일이 5배가 된다
- 반대로 "지금 화면에 있는 글자만" 넣으면 사용자가 입력하는 종목 메모·논지에서 두부(tofu)가 난다
- 완성형 목록은 하드코딩하지 않고 `euc-kr` 코덱에서 역산한다. 개수가 2350 이 아니면 스크립트가 실패한다
- 범위 밖 음절(옛한글, 희귀 음절)은 폴백 서체로 그려진다

## 라이선스

Gmarket Sans 는 **SIL Open Font License 1.1** 이다. 서브셋·재배포·임베딩이 허용된다.
`public/fonts/LICENSE` 에 고지를 두었고, `build.sh` 의 `--name-IDs` 가 폰트 내부의
저작권·상표·라이선스 필드를 서브셋 결과물에도 보존한다. 이 옵션을 지우면 안 된다.
