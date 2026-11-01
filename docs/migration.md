# web-notepad → web-notepad-bff 이관

## 기준과 소유권

원본: `web-notepad` 브랜치 `1.9.35`, 커밋 `863d9659b2177158aac58cb01c30ac13cbde7871`.

- BFF로 이동: `app/api/board`, `app/api/groups`, `app/api/notepad`의 처리·DB·백업 코드, 공유 토큰 발급, 서버 전용 테스트 48개와 해당 번호 요구사항.
- 프런트 유지: Kakao OAuth 시작·callback·로그아웃·세션, OAuth 복귀 링크 검증, UI 상태·클라이언트 요청, UI 통합 테스트. 기존 API 경로에는 서버 전달 코드만 남습니다.
- 분리된 문서는 양쪽에서 요구사항과 파일 번호를 다시 맞췄습니다. 원래 번호는 `tests/migration.json`에서 추적합니다.

## 운영 전환 순서

1. BFF를 별도 Next.js 서비스로 배포하고 `NOTEPAD_BFF_SECRET`, `SHARE_TOKEN_SECRET`, 기존 `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`을 비공개 서버 환경 변수로 설정합니다. DB 자체는 이동하거나 복제하지 않습니다.
2. `SHARE_TOKEN_SECRET`은 기존 프런트의 `AUTH_SECRET` 값을 정확히 유지합니다. 이전에 AUTH_SECRET이 없었다면 기존 `KAKAO_REST_API_KEY` fallback 값을 사용합니다. 새 키를 생성하지 않습니다.
3. `/api/health`를 확인하고 프리뷰 프런트에서 로그인, 이력 조회, 공유 링크, 보드 조회를 검증합니다. 운영 DB 대상으로 자동 E2E나 테스트 데이터 삽입을 실행하지 않습니다.
4. 프런트에 BFF HTTPS origin을 `NOTEPAD_BFF_URL`로, 같은 게이트웨이 키를 `NOTEPAD_BFF_SECRET`으로 설정합니다. 카카오 관련 환경 변수와 콜백 주소는 그대로 유지합니다.
5. BFF가 준비된 뒤 프런트 변경을 배포합니다. 기존 Turso 환경 변수는 프런트 새 코드에서 사용하지 않습니다. 롤백 검증이 끝나기 전에는 기존 배포에 필요한 자격증명을 제거하지 않습니다.
6. 로그인·공유·보드 요청의 상태코드와 오류율을 확인합니다. 필요한 경우 프런트를 이전 배포로 롤백합니다. DB를 되감거나 빈 데이터로 초기화하지 않습니다.

## 보존 계약

이번 이관은 레코드 변경을 수행하지 않습니다. 누락된 탭 저장 차단, 동시 수정 revision 확인, 이동 대상 DB 확인, 제거 전 백업, 명시적 빈 탭 닫기 규칙을 보존합니다. 복구나 삭제는 별도의 사용자 승인 범위가 필요합니다.

## 테스트 환경

- BFF 단독: 3102 포트, BFF의 `test-results/notepad-e2e.db`.
- 프런트 통합: 프런트 3000 + BFF 3101, 프런트의 `test-results/notepad-e2e.db`.
- 두 테스트 모두 Turso 운영 환경 변수를 로컬 파일 DB와 빈 인증 토큰으로 덮어씁니다. 기존 개발 서버를 재사용하지 않습니다.
- BFF API fixture는 독립적으로 서버 서명을 만들어 실제 HTTP API를 호출합니다. 사용자 fixture 쿠키는 테스트 호출자의 신원만 구성하며 BFF에 전달하지 않습니다. 카카오 세션 검증은 프런트 E2E가 담당합니다.

로컬 SQLite 연결은 개인 이력·공유 그룹에서 연결을 공유하고 요청 단위 대기열로 읽기·쓰기·스키마 초기화를 순서대로 실행합니다. 분리 검증 중 발견한 동시 쓰기 SQLITE_BUSY 및 트랜잭션 중 조회 TRANSACTION_ACTIVE를 방지하며 원격 Turso의 기존 연결 설정과 DB 트랜잭션 내용은 변경하지 않습니다.

## Vercel 자동 배포

- 프로젝트: [web-notepad-bff](https://vercel.com/gusdn1460s-projects/web-notepad-bff).
- 연결 저장소: `org-mora-go-lab-notepad/web-notepad-bff`. Production Branch Tracking은 `main`, 도메인 자동 할당은 활성화합니다.
- 최신 버전 브랜치에서 main으로 PR을 병합하면 Production 배포가 자동 시작됩니다. 버전 브랜치 push는 Preview 대상이며 Production 기준을 바꾸지 않습니다.
- 운영 주소: `https://web-notepad-bff.vercel.app`. `/api/health`는 프로세스 상태만 확인하므로 200 응답이 DB 연결 완료를 의미하지 않습니다.
- 최초 main 배포는 완료했습니다. 실제 업무 API 연결은 위의 운영 전환 순서에 따라 비공개 환경 변수 등록 후 검증해야 합니다. Swagger는 1.0.1 브랜치에 있으므로 해당 PR 병합 이후 운영에서 제공됩니다.
- 기존 Vercel Secret 값은 저장 후 다시 읽을 수 없습니다. 기존 DB URL·토큰과 AUTH_SECRET 백업을 사용해야 하며, 공유 링크 유지를 위해 SHARE_TOKEN_SECRET에 기존 AUTH_SECRET을 그대로 등록합니다. 기존 키를 임의로 회전하거나 운영 DB를 초기화하지 않습니다.

| 프로젝트        | Production 환경 변수                 | 값의 출처                          |
| --------------- | ------------------------------------ | ---------------------------------- |
| web-notepad-bff | TURSO_DATABASE_URL, TURSO_AUTH_TOKEN | 기존 web-notepad 운영 DB 값        |
| web-notepad-bff | SHARE_TOKEN_SECRET                   | 기존 web-notepad AUTH_SECRET       |
| 양쪽 프로젝트   | NOTEPAD_BFF_SECRET                   | 동일한 별도 게이트웨이 키          |
| web-notepad     | NOTEPAD_BFF_URL                      | https://web-notepad-bff.vercel.app |

Preview에는 운영 DB 자격증명을 복제하지 않습니다. 검증용 별도 DB와 서명 키를 설정해야 합니다.
