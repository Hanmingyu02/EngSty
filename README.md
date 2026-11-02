# EngSty

한국어를 상황에 맞는 자연스러운 영어로 번역하고 표현을 학습하는 웹입니다. Node.js 백엔드가 DeepSeek API를 호출하며 API 키는 브라우저에 전달하지 않습니다. 외부 npm 의존성이 없습니다.

## 로컬 실행 (Node.js 24)

```sh
cp .env.example .env
# .env의 DEEPSEEK_API_KEY를 본인의 키로 설정
node --env-file=.env --watch server/index.js
```

브라우저에서 로컬 5173 포트로 접속합니다. 이미 환경변수가 주입되어 있다면 `npm run dev` 또는 `npm start`로 실행합니다. `npm` 명령은 `.env`를 자동으로 읽지 않습니다.

- `DEEPSEEK_API_KEY`: 서버 전용 API 키, 필수
- `DEEPSEEK_MODEL`: 기본 `deepseek-chat`
- `PORT`: 기본 `5173`, 호스팅 서비스가 주입하는 값을 지원
- `ALLOWED_ORIGINS`: 허용할 프론트엔드 origin을 쉼표로 구분. Pages는 `https://hanmingyu02.github.io` (경로나 마지막 `/` 없이)
- `BACKEND_URL`: GitHub Pages 빌드에만 사용하는 공개 HTTPS 백엔드 origin. 비밀값이 아닙니다.

## API

`GET /api/health` → `{ "status": "ok", "translationConfigured": true }`. 키 존재만 확인하며 실제 계정의 잔액·권한은 보장하지 않습니다.

`POST /api/translate` (`Content-Type: application/json`):

```json
{"text":"오늘 회의를 다음 주로 미뤄도 될까요?","situation":"work","tone":"polite"}
```

상황은 `daily`, `work`, `travel`, 말투는 `casual`, `polite`입니다. 응답은 `{ko, en, polite, explain, alts, source}`이며 `alts`는 `[영어, 한국어 의미]` 두 쌍입니다. 입력 문장과 선택한 상황·말투를 DeepSeek에 전송합니다. 입력이나 API 키를 서버 로그에 기록하지 않습니다.

입력 300자/본문 8KB 제한, 제공자 응답 검증, 20초 타임아웃, CORS 허용 목록, 연결 IP당 분당 20회 제한을 적용했습니다. 제한은 단일 프로세스 메모리 기준이며 `X-Forwarded-For`를 신뢰하지 않습니다. 리버스 프록시에서는 여러 사용자가 같은 제한을 공유할 수 있습니다. 대규모 공개 서비스에는 호스팅의 인증·WAF/공유 rate limiter를 추가해야 합니다. CORS 자체는 인증이 아닙니다.

## 기능과 저장

일상·직장·여행, 말투별 번역, 한국어 뉘앙스 설명, 대체 표현, 브라우저 음성 합성, 복사, 표현집과 복습을 지원합니다. 표현집은 현재 브라우저 localStorage에 저장합니다. 로그인·기기 간 동기화·서버 DB는 포함하지 않습니다. AI 번역은 오류가 있을 수 있습니다.

## 테스트

```sh
npm test
npm run build
```

실제 HTTP API, 프론트 클라이언트, DeepSeek 어댑터의 계약, 입력 검증, 오류 처리, CORS와 요청 제한을 검사합니다. 테스트는 제공자 응답을 모의하므로 키나 과금이 필요하지 않습니다. 실제 번역 품질·계정 접근 검증은 별도로 유효한 DeepSeek 키가 필요합니다.

## 백엔드 배포

GitHub Pages는 서버를 실행하지 못합니다. Node.js 웹 서비스(Render, Railway 등) 또는 포함된 Dockerfile로 별도 배포하세요.

- Node.js 24, 설치 명령 없음, 시작 명령 `npm start`
- 서버 환경변수에 `DEEPSEEK_API_KEY`를 비밀값으로 등록
- `ALLOWED_ORIGINS=https://hanmingyu02.github.io`
- 헬스체크 경로 `/api/health`
- 서버 전체를 배포하면 같은 주소에서 프론트엔드도 사용할 수 있습니다.

```sh
docker build -t engsty .
docker run --rm --env-file .env -e PORT=8080 -p 8080:8080 engsty
```

Docker 빌드는 제공된 구성일 뿐 별도 Docker 실행 검증이 필요합니다.

## GitHub Pages 연결

저장소 Settings → Secrets and variables → Actions → **Variables**에 `BACKEND_URL`을 배포한 서버 origin(예: `https://your-service.example.com`)으로 등록합니다. API 키를 이 변수에 넣지 마세요. Pages 워크플로를 다시 실행하면 프론트엔드가 해당 서버에 연결합니다. `BACKEND_URL`이 없으면 기존 12개 예시 체험 모드를 유지합니다. 실제 모드에서 API 오류가 발생하면 오류를 표시하며 예시 결과로 대체하지 않습니다.

`main` 푸시는 테스트·정적 빌드 후 Pages에 배포됩니다. Pages Source는 GitHub Actions여야 합니다. 정적 파일은 상대 경로를 사용하여 `/EngSty/`에서도 동작합니다.
