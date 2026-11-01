import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { withLocalDatabaseQueue } from "./database";

export type GatewayUser = {
  id: string;
  nickname: string;
  profileImageUrl?: string;
};
type GatewayContext = {
  version: number;
  issuedAt: number;
  user: GatewayUser | null;
  url: string;
  method: string;
  origin: string | null;
  contentType: string | null;
  bodyHash: string;
  verifiedShareLink?: { groupId: string; version: number } | null;
};
const contextStore = new AsyncLocalStorage<GatewayContext>();
export function currentGatewayUser() {
  return contextStore.getStore()?.user ?? null;
}

export function currentVerifiedShareLink() {
  const context = contextStore.getStore();
  const link = context?.verifiedShareLink;
  if (
    !context ||
    context.method !== "POST" ||
    new URL(context.url).pathname !== "/api/groups/join" ||
    !link ||
    typeof link.groupId !== "string" ||
    !/^shared-[0-9a-f-]{36}$/i.test(link.groupId) ||
    !Number.isSafeInteger(link.version) ||
    link.version < 0
  )
    return null;
  return link;
}

export function withGateway(
  handler: (request: Request) => Promise<Response> | Response,
) {
  return async (request: Request): Promise<Response> => {
    const secret =
      process.env.NOTEPAD_BFF_SECRET ??
      (process.env.NODE_ENV === "development"
        ? "notepad-local-bff-only"
        : undefined);
    if (!secret)
      return Response.json({ error: "Backend unavailable" }, { status: 503 });
    let context: GatewayContext;
    let body: ArrayBuffer;
    try {
      const encoded = request.headers.get("x-notepad-context") ?? "";
      const signature = request.headers.get("x-notepad-signature") ?? "";
      if (!encoded || encoded.length > 32_768 || !signature)
        throw new Error("Missing gateway signature");
      const expected = createHmac("sha256", secret)
        .update(encoded)
        .digest("base64url");
      if (
        expected.length !== signature.length ||
        !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
      )
        throw new Error("Invalid gateway signature");
      context = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
      const age = Date.now() - context.issuedAt;
      if (
        context.version !== 1 ||
        !Number.isFinite(age) ||
        age < -5_000 ||
        age > 60_000
      )
        throw new Error("Expired gateway request");
      const original = new URL(context.url),
        actual = new URL(request.url);
      if (
        !["http:", "https:"].includes(original.protocol) ||
        original.username ||
        original.password ||
        original.pathname + original.search !==
          actual.pathname + actual.search ||
        context.method !== request.method
      )
        throw new Error("Request target mismatch");
      if (
        context.user !== null &&
        (!context.user ||
          typeof context.user.id !== "string" ||
          !context.user.id ||
          typeof context.user.nickname !== "string" ||
          !context.user.nickname)
      )
        throw new Error("Invalid identity");
      body = await request.arrayBuffer();
      if (
        createHash("sha256").update(Buffer.from(body)).digest("hex") !==
        context.bodyHash
      )
        throw new Error("Body mismatch");
    } catch {
      return Response.json(
        { error: "Unauthorized gateway" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    const headers = new Headers();
    if (context.origin) headers.set("origin", context.origin);
    if (context.contentType) headers.set("content-type", context.contentType);
    const originalRequest = new Request(context.url, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : body,
    });
    return withLocalDatabaseQueue(async () =>
      contextStore.run(context, () => handler(originalRequest)),
    );
  };
}
