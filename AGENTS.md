<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Production Data Protection

Never delete production tabs or other user data without the user's explicit approval for the specific deletion. Explain the targets and reason before requesting approval. Do not run automatic cleanup based on content length, empty content, or closing an editor tab. The user-authorized exception is an individual close action while that tab content is exactly an empty string; preserve all other tabs, require an explicit empty-close intent and matching server revision, and back up before removal. Bulk close and group moves do not authorize deletion. Recovery must preserve existing records and unrelated groups; back up and verify before any production write.

## Commit Messages

After completing code changes, suggest a Korean commit message that matches the change. Keep one of the prefixes `test:`, `feat:`, `refactor:`, `doc`, `style:`, or `fix:`.

## E2E Test Structure

Keep the E2E suite focused on independently testable behavior. Prioritize data integrity, core user flows, accessibility, and confirmed regressions. Remove redundant coverage without padding the count or combining unrelated scenarios. Keep product behavior and untested visual specifications intact when removing a test.

Every E2E test code file (`*.e2e.spec.ts`) must contain exactly one top-level `test(...)` declaration and register exactly one test case. Do not generate multiple tests from loops or parameterized declarations in one file. Split separate scenarios into their own numbered PRD requirements and matching E2E files. Shared resource files must not declare tests.

When writing E2E tests, create `__mock__/`, `__fixture__/`, `__util__/`, or `__constant__/` folders when shared test doubles, fixtures, helpers, or constants are needed. Put broadly reusable resources under `tests/`; put resources used only by one requirement title under that title's folder. Every such folder must include a barrel `index.ts`, and tests should import from the barrel when practical. Group resource files by concern when a resource directory contains distinct responsibilities (for example, `tests/__util__/state/` and `tests/__util__/note/`). Each concern group must include an `index.ts` barrel and be re-exported from the owning resource barrel; imports from outside the group should use its barrel. Keep numbered E2E files directly in their matching PRD requirement directory.

## Specification Synchronization

When functionality is added, removed, or improved, update the matching document under `tests-prd/` in the same change. Treat `PRD.md` as the specification index and `tests-prd/NN. Category/NN. Title.md` as the source of truth for the E2E test scope. When a detailed PRD changes, add, update, move, or remove the corresponding tests under `tests/` so they fully reflect the current requirements. Update `PRD.md` as well when a specification category is added, renamed, moved, or removed.

Keep the numbered structure in `tests-prd/` and `tests/` in exact sync. Each `tests-prd/NN. Category/` directory must have a matching `tests/NN. Category/` directory. Every `tests-prd/NN. Category/NN. Title.md` document must have a matching `tests/NN. Category/NN. Title/` directory, and each numbered requirement in that document must have exactly one corresponding zero-padded `NN.e2e.spec.ts` file in that directory. Keep each numbered requirement focused on one independently testable behavior. When a requirement or its E2E test combines separate behaviors, exceptions, persistence checks, or visual rules into a long scenario, split them into separate numbered requirements and E2E files. Keep each detailed document focused on one concern and limit it to at most 10 numbered requirements and 10 matching E2E files; split larger documents by behavior before adding more requirements. The test file numbers and total count must match the requirement numbers and count, with no missing or extra requirement tests. For example, if `tests-prd/02. 노트 편집/12. 분할 패널 - 기본 동작.md` contains eight requirements, `tests/02. 노트 편집/12. 분할 패널 - 기본 동작/` must contain `01.e2e.spec.ts` through `08.e2e.spec.ts`, each covering its matching requirement. Keep broadly shared test resources directly under `tests/__util__`, `tests/__fixture__`, `tests/__mock__`, or `tests/__constant__`; do not create PRD entries for these resource directories.

Do not consider the work complete until all updated E2E tests pass. Run `npm run test:e2e` and require a 100% pass rate; fix implementation, test, fixture, mock, or utility issues before reporting completion.

Use `getApi` from the shared request resource barrel for E2E API GET calls. It reconnects only `ECONNRESET` on known read-only paths; HTTP status errors must still reach assertions. Do not add automatic transport retries to writes or OAuth flows.

## Code Formatting

Generate and edit code using the repository Prettier configuration. Run `npm run format` after changes and require `npm run format:check` to pass before committing. Apply formatting to existing unformatted source, styles, tests, and documentation. Exclude generated files, dependencies, test results, and user attachments as configured in `.prettierignore`. Use LF line endings enforced by `.gitattributes` on every platform. Keep formatting-only changes in a separate commit when practical.

## Backend Boundary

Kakao OAuth and browser sessions belong to web-notepad. All business API routes must use withGateway. Never accept unsigned user IDs or forward browser cookies. Keep API payloads and database revisions compatible with web-notepad. Test only with the isolated local database.

## Branch Strategy

Maintain main and the latest version branch only, as in web-notepad. Work on the version branch, never directly on main. After an authorized PR merge, create the next patch version branch from updated main and bump package.json and package-lock.json together. Before removing older branches, confirm their changes are merged or preserved; never discard unmerged work. Use mora-go for commits and pushes.
