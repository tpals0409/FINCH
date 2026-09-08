# FINCH 모바일 셸

Capacitor 기반의 얇은 WebView 셸이다. 운영 웹앱은 `https://app.finchapp.org`만 로드하며 앱 ID는 스토어 등록 전 임시값 `org.finchapp.mobile`이다.

## 범위

- 허용 origin: `https://app.finchapp.org` 단일 origin
- HTTP/mixed content 및 비허용 navigation 차단
- 허용되지 않은 HTTP(S) 링크는 시스템 외부 링크로 분리
- Android 뒤로가기: WebView history가 있으면 뒤로 이동, root에서는 앱 종료
- WebView main-frame 오류를 위한 `offline.html` error path와 수동 재시도
- Capacitor 기본 브리지 외 커스텀 브리지 없음
- 로그에는 이벤트·플랫폼 등 비민감 필드만 기록하며 token/cookie/query/fragment/password 계열 키를 제거

## 로컬 검증

```bash
npm install
npm run build
npm test
npm run check
npx cap sync android
```

CI와 로컬 검증의 단일 진입점은 `scripts/check.sh`다. Android APK 빌드는 별도 도구체인 게이트로 실행한다.

Android debug APK:

```bash
cd android
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
./gradlew assembleDebug
```

생성물은 `android/app/build/outputs/apk/debug/app-debug.apk`이며, 빌드 후 다음으로 해시를 기록한다.

```bash
shasum -a 256 android/app/build/outputs/apk/debug/app-debug.apk
```

Capacitor Android 의존성이 Java 21 소스 레벨을 요구하므로 Android 빌드는 JDK 21을 사용한다. API 35 arm64 AVD `finch-api35`에 설치 후 `org.finchapp.mobile/.MainActivity` 실행과 WebView 화면을 확인했다. Android 13+ predictive-back과 key-event fallback을 등록했으며, 최종 일반 BACK 재확인은 AVD 재기동 불안정으로 별도 게이트다. 스토어 게시, 운영 서명, iOS 배포는 범위 밖이다.
