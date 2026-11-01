# Web Notepad BFF

[web-notepad](https://github.com/org-mora-go-lab-notepad/web-notepad)의 개인 이력·공유 그룹·게시판 API와 Turso 저장을 담당합니다. 카카오 OAuth, 세션 발급·검증·로그아웃은 프런트 저장소에 유지합니다.

## 로컬 실행

```sh
npm ci
npm run dev
```

BFF는 `http://localhost:3001`, 프런트는 `http://localhost:3000`에서 실행합니다. 개발 모드에서만 공통 로컬 서명 키와 `file:web-notepad-local.db`를 기본 사용합니다. 기존 로컬 DB를 이어 쓰려면 BFF의 `TURSO_DATABASE_URL`에 기존 파일의 절대 경로를 지정합니다. DB를 복사하거나 비우는 작업은 필요하지 않습니다.

기존 AUTH_SECRET을 모르는 경우에도 연동할 수 있습니다. 세션·공유 링크의 검증과 서명은 프런트에 유지하며 기존 키를 변경하지 않습니다. BFF에는 AUTH_SECRET·Kakao 키·SHARE_TOKEN_SECRET이 필요하지 않습니다. 로컬 실행기도 이 키들을 BFF에 전달하지 않습니다.

## API 경계

브라우저 → web-notepad `/api/...` → 서명된 서버 요청 → web-notepad-bff `/api/...` → 기존 Turso DB.

| 경로                                      | 메서드      | 책임                                  |
| ----------------------------------------- | ----------- | ------------------------------------- |
| `/api/notepad/history`                    | GET, POST   | 개인 이력, 충돌 검증, 탭 보존         |
| `/api/groups`                             | GET         | 참여 중인 공유 그룹                   |
| `/api/groups/share`                       | POST        | 공유 링크 ID·버전 제공                |
| `/api/groups/join`                        | POST        | 공유 참여                             |
| `/api/groups/update`                      | POST        | 공유 데이터 변경·충돌 검증            |
| `/api/groups/leave`, `/api/groups/revoke` | POST        | 참여 해제·공유 취소                   |
| `/api/groups/notifications`               | GET, DELETE | 알림 조회·정리                        |
| `/api/groups/notifications/read`          | POST        | 알림 읽음                             |
| `/api/board`                              | GET         | 게시판 목록                           |
| `/api/health`                             | GET         | DB를 변경하지 않는 프로세스 상태 확인 |

인증 관련 `/api/auth/**`는 이 서비스에 없습니다. health·OpenAPI 문서를 제외한 API는 프런트 서버 서명이 필요합니다. 브라우저가 BFF를 직접 호출하거나 임의 사용자 ID를 헤더에 담아 호출하는 방식은 지원하지 않습니다. CORS나 공유 쿠키 도메인 설정은 필요하지 않습니다.

## 환경 변수

| 변수                                     | 위치·용도                                 |
| ---------------------------------------- | ----------------------------------------- |
| `NOTEPAD_BFF_SECRET`                     | 양쪽 서버에 동일한 별도 비밀키, 운영 필수 |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | 기존 DB 연결, BFF 서버 전용               |
| `NOTEPAD_BFF_URL`                        | 프런트 서버에만 설정하는 BFF HTTPS origin |

서명은 사용자 프로필, 원래 URL·Origin, 메서드, 본문 SHA-256, 발급 시간을 포함합니다. BFF는 60초 이내 요청만 수신하며 원래 요청을 복원해 기존 동일 출처 검증과 공유 링크 주소를 유지합니다. 게이트웨이 키는 카카오 세션 키와 분리하고 브라우저에 노출하지 않습니다. HTTPS가 전송 보안을 제공합니다. 쓰기 요청은 전송 실패 시 프록시에서 자동 재시도하지 않습니다.

## 데이터와 배포

[이관 및 배포 절차](docs/migration.md)를 따릅니다. DB 스키마·원문·ID·revision은 동일하게 유지하며 이관을 위한 운영 DB 변경·정리·삭제는 하지 않습니다. 기존 누락 탭 보호, 이동 대상 저장 확인, 충돌 409, 삭제 직전 백업을 그대로 유지합니다.

## 검증

```sh
npm run format:check
npm run lint
npx tsc --noEmit
npm run test:e2e:structure
npm run build
npx playwright install chromium
npm run test:e2e
```

BE 전용 48개 시나리오와 대응 문서를 이관하고 서버 신뢰 경계 10개, 개인·공유 동시 저장 1개, Swagger 문서 3개를 추가했습니다. 총 62개입니다. BFF E2E는 독립 실행하며 테스트 DB만 사용합니다. UI·카카오 인증·프런트/BFF 통합 E2E는 web-notepad에 남습니다. [PRD](PRD.md), [테스트 정책](tests/README.md), [원본→이관 파일 대응](tests/migration.json)을 참고하세요.

`src/4-entity/notepad`에는 API가 사용하는 데이터 계약·정규화 함수만 포함합니다. UI에서도 필요한 순수 모델은 프런트에 유지했으며 서버의 DB·라우트 구현은 이 저장소만 소유합니다. 데이터 계약 변경 시 양쪽 호환성과 프런트 통합 E2E를 함께 검증해야 합니다.

로컬 SQLite는 개인·공유 API가 요청 단위 대기열을 공유해 동시 쓰기 잠금과 트랜잭션 중 조회 충돌을 방지합니다. 원격 Turso 연결과 트랜잭션·삭제 보호 규칙은 유지합니다.

## Swagger

- [http://localhost:3001/docs](http://localhost:3001/docs): Swagger UI
- [http://localhost:3001/api/openapi](http://localhost:3001/api/openapi): OpenAPI 3.0 JSON
- 프런트와 함께 실행: web-notepad에서 `npm run dev:local`. [http://localhost:3000/docs](http://localhost:3000/docs)에서는 프런트에 로그인한 세션으로 Try it out을 사용할 수 있습니다. 카카오 인증·Origin 검증은 기존 API가 수행합니다.
- BFF 직접 호출은 health 외에 컨텍스트·본문·메서드에 대한 요청별 HMAC 서명이 필요합니다. 서버 비밀키를 Swagger 입력란에 입력하지 않습니다.
- UI 자산은 npm의 swagger-ui-dist를 로컬에서 제공하며 외부 CDN이나 외부 명세 검증 서버를 호출하지 않습니다. [공식 설치 문서](https://swagger.io/docs/open-source-tools/swagger-ui/usage/installation/)의 서버용 배포 방식을 사용합니다.

## 브랜치와 버전

`main`은 배포 기준, 최신 `x.y.z` 브랜치는 개발 기준입니다. 현재 개발 버전은 `1.0.1`입니다. 기존 main(1.0.0)에서 1.0.1을 만들고 package.json과 package-lock.json을 함께 올렸습니다.

main PR 병합 후에는 main 최신 커밋에서 다음 패치 버전 브랜치를 만들고 패키지 버전을 올립니다. 원격·로컬·GitHub Desktop에는 main과 최신 버전 브랜치만 유지합니다. 병합되지 않은 작업을 삭제하지 않으며, 이전 버전 브랜치는 병합·보존 여부를 확인한 뒤 정리합니다. 커밋과 push는 mora-go 계정을 사용합니다.

## 기존 인증 키를 모르는 경우의 연결

프런트는 기존 세션으로 확인한 사용자 ID와 기존 키로 검증한 공유 링크의 `{ groupId, version }`을 `NOTEPAD_BFF_SECRET`으로 서명합니다. BFF는 본문 해시·경로·메서드·60초 유효 시간을 검증하고, 공유 참여 시 DB의 활성 상태와 토큰 버전을 확인합니다. 브라우저의 임의 검증 헤더는 프런트가 전달하지 않습니다.

공유 생성·게시판 응답은 내부적으로 `shareLink: { groupId, version }`을 반환합니다. 프런트가 기존 키로 서명해 원래의 `url`·`inviteUrl` 응답으로 바꿉니다. 브라우저 API·기존 URL 형식·사용자 ID·DB 레코드는 유지됩니다. Swagger도 직접 BFF와 프런트 경로 각각의 응답을 표시합니다.
