import { expect, test } from "@playwright/test";

import { getApi } from "../../__util__";

test("3. 문서 자산의 허용 목록 밖 파일은 제공하지 않는다", async ({
  request,
}) => {
  const denied = await getApi(
    request,
    "http://127.0.0.1:3102/docs/assets/package.json",
  );
  expect(denied.status()).toBe(404);
  expect(await denied.text()).toBe("");
  const stylesheet = await getApi(
    request,
    "http://127.0.0.1:3102/docs/assets/swagger-ui.css",
  );
  expect(stylesheet.status()).toBe(200);
  expect(stylesheet.headers()["content-type"]).toContain("text/css");
  const bundle = await getApi(
    request,
    "http://127.0.0.1:3102/docs/assets/swagger-ui-bundle.js",
  );
  expect(bundle.status()).toBe(200);
  expect(bundle.headers()["content-type"]).toContain("application/javascript");
  const initializer = await getApi(
    request,
    "http://127.0.0.1:3102/docs/assets/initializer.js",
  );
  expect(initializer.status()).toBe(200);
  const source = await initializer.text();
  expect(source).toContain("validatorUrl: null");
  expect(source).not.toContain("test-bff-secret");
  expect(source).not.toContain("notepad-local-bff-only");
  expect(source).toContain("persistAuthorization: false");
});
