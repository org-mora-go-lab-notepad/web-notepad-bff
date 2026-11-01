import SwaggerParser from "@apidevtools/swagger-parser";
import { expect, test } from "@playwright/test";

import { getApi } from "../../__util__";

test("1. OpenAPI 명세는 유효한 스키마와 모든 업무 API의 메서드 및 서명 요건을 제공한다", async ({
  request,
}) => {
  const response = await getApi(request, "http://127.0.0.1:3102/api/openapi");
  expect(response.status()).toBe(200);
  const document = await response.json();
  const validated = await SwaggerParser.validate(structuredClone(document));
  expect(validated.info.title).toBe("Web Notepad BFF API");
  expect(document.openapi).toBe("3.0.3");
  expect(Object.keys(document.paths)).toHaveLength(11);
  expect(document.paths["/api/groups/notifications"].delete.operationId).toBe(
    "clearNotifications",
  );
  expect(
    document.paths["/api/notepad/history"].post.responses["409"],
  ).toBeTruthy();
  expect(
    document.paths["/api/groups/update"].post.responses["409"],
  ).toBeTruthy();
  expect(document.paths["/api/health"].get.security).toEqual([]);
  expect(document.security).toEqual([
    { GatewayContext: [], GatewaySignature: [] },
  ]);
  expect(document.components.securitySchemes.GatewaySignature.name).toBe(
    "x-notepad-signature",
  );
  expect(document.paths).not.toHaveProperty("/api/auth/session");
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["set-cookie"]).toBeUndefined();
});
