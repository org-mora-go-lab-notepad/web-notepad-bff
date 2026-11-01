import { createHash, createHmac } from "node:crypto";

import {
  type APIRequestContext,
  type BrowserContext,
  type Page,
  test as base,
} from "@playwright/test";

// Independent protocol fixture: no production verifier or signing functions imported.
export function gatewayHeaders(
  url: string,
  method: string,
  body = "",
  user: unknown = null,
  overrides: Record<string, unknown> = {},
) {
  const encoded = Buffer.from(
    JSON.stringify({
      version: 1,
      issuedAt: Date.now(),
      url: new URL(url, "http://localhost:3000").href,
      method,
      bodyHash: createHash("sha256").update(body).digest("hex"),
      user,
      origin: null,
      contentType: "application/json",
      ...overrides,
    }),
  ).toString("base64url");
  return {
    "x-notepad-context": encoded,
    "x-notepad-signature": createHmac("sha256", "test-bff-secret")
      .update(encoded)
      .digest("base64url"),
  };
}
function fixtureUser(value?: string) {
  if (!value) return null;
  const [encoded, signature] = value.split(".");
  if (
    createHmac("sha256", "test-auth-secret")
      .update(encoded)
      .digest("base64url") !== signature
  )
    return null;
  const payload = JSON.parse(
    Buffer.from(encoded, "base64url").toString("utf8"),
  );
  return {
    id: payload.id,
    nickname: payload.nickname,
    profileImageUrl: payload.profileImageUrl,
  };
}
function signedRequest(
  raw: APIRequestContext,
  context?: BrowserContext,
): APIRequestContext {
  return new Proxy(raw, {
    get(target, property) {
      if (
        ["get", "post", "put", "patch", "delete", "head", "fetch"].includes(
          String(property),
        )
      )
        return async (
          url: string,
          options: Parameters<APIRequestContext["fetch"]>[1] = {},
        ) => {
          const method =
            options.method ??
            (property === "fetch" ? "GET" : String(property).toUpperCase());
          const original = new URL(url, "http://localhost:3000");
          const headers = new Headers(options.headers);
          const cookie =
            headers.get("cookie")?.match(/web-notepad-session=([^;]+)/)?.[1] ??
            (await context?.cookies("http://localhost:3000"))?.find(
              (c) => c.name === "web-notepad-session",
            )?.value;
          const body =
            options.data === undefined
              ? ""
              : typeof options.data === "string"
                ? options.data
                : Buffer.isBuffer(options.data)
                  ? options.data.toString()
                  : JSON.stringify(options.data);
          return target.fetch(
            "http://127.0.0.1:3102" + original.pathname + original.search,
            {
              ...options,
              method,
              data: body || undefined,
              headers: gatewayHeaders(
                original.href,
                method,
                body,
                fixtureUser(cookie),
                {
                  origin: headers.get("origin"),
                  contentType:
                    headers.get("content-type") ?? "application/json",
                },
              ),
            },
          );
        };
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}
export function signedPage(page: Page): Page {
  const request = signedRequest(page.request, page.context());
  return new Proxy(page, {
    get(target, property) {
      if (property === "request") return request;
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}
export const apiTest = base.extend({
  page: async ({ page }, provide) => {
    await provide(signedPage(page));
  },
  request: async ({ request }, provide) => {
    await provide(signedRequest(request));
  },
});
