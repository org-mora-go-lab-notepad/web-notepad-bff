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
    if (request.headers.get("authorization")?.startsWith("Bearer "))
      return browserGateway(request, handler, secret);
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

function cors(response: Response, origin: string | null) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("Vary", "Origin");
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  return new Response(response.body, { status: response.status, headers });
}
export function gatewayOptions(request: Request) {
  // No cookies are accepted. Actual requests require an origin-bound signed token.
  return cors(
    new Response(null, { status: 204 }),
    request.headers.get("origin"),
  );
}
async function browserGateway(
  request: Request,
  handler: (request: Request) => Promise<Response> | Response,
  secret: string,
) {
  const origin = request.headers.get("origin");
  try {
    const token = request.headers.get("authorization")!.slice(7);
    const [encoded, signature, extra] = token.split(".");
    if (!encoded || encoded.length > 32768 || !signature || extra)
      throw new Error("Invalid token");
    const expected = createHmac("sha256", secret)
      .update("browser:" + encoded)
      .digest("base64url");
    if (
      expected.length !== signature.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    )
      throw new Error("Invalid signature");
    const grant = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    );
    if (
      grant.audience !== "notepad-browser" ||
      !Number.isFinite(grant.expiresAt) ||
      grant.expiresAt <= Date.now() ||
      grant.expiresAt > Date.now() + 65000
    )
      throw new Error("Expired token");
    const frontend = new URL(grant.origin);
    if (
      frontend.origin !== grant.origin ||
      !["http:", "https:"].includes(frontend.protocol) ||
      frontend.username ||
      frontend.password
    )
      throw new Error("Invalid frontend origin");
    if (origin && origin !== grant.origin)
      return cors(
        Response.json({ error: "Invalid origin" }, { status: 403 }),
        origin,
      );
    if (
      grant.user !== null &&
      (!grant.user ||
        typeof grant.user.id !== "string" ||
        !grant.user.id ||
        typeof grant.user.nickname !== "string" ||
        !grant.user.nickname)
    )
      throw new Error("Invalid identity");
    const target = new URL(request.url);
    const url = new URL(target.pathname + target.search, frontend);
    const body = Buffer.from(await request.arrayBuffer());
    let link = null;
    if (target.pathname === "/api/groups/join" && request.method === "POST") {
      const invitation = JSON.parse(body.toString("utf8")).token;
      if (typeof invitation === "string") {
        const parts = invitation.split(".");
        const groupId = parts[0],
          version = parts.length === 3 ? parts[1] : "0",
          sig = parts.at(-1);
        const signed = createHmac("sha256", secret)
          .update(`share:${groupId}:${version}`)
          .digest("base64url");
        if (
          [2, 3].includes(parts.length) &&
          /^shared-[0-9a-f-]{36}$/i.test(groupId ?? "") &&
          /^(0|[1-9][0-9]*)$/.test(version) &&
          Number.isSafeInteger(Number(version)) &&
          sig?.length === signed.length &&
          timingSafeEqual(Buffer.from(sig), Buffer.from(signed))
        )
          link = { groupId, version: Number(version) };
        else if (
          grant.shareTokenHash ===
          createHash("sha256").update(invitation).digest("hex")
        )
          link = grant.verifiedShareLink;
      }
    }

    const context: GatewayContext = {
      version: 1,
      issuedAt: Date.now(),
      user: grant.user,
      url: url.toString(),
      method: request.method,
      origin,
      contentType: request.headers.get("content-type"),
      bodyHash: createHash("sha256").update(body).digest("hex"),
      verifiedShareLink: link,
    };
    const headers = new Headers();
    if (origin) headers.set("origin", origin);
    if (context.contentType) headers.set("content-type", context.contentType);
    const original = new Request(url, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : body,
    });
    const response = await withLocalDatabaseQueue(async () =>
      contextStore.run(context, () => handler(original)),
    );
    if (
      response.ok &&
      ((target.pathname === "/api/groups/share" && request.method === "POST") ||
        (target.pathname === "/api/board" && request.method === "GET"))
    ) {
      const payload = await response.json();
      const shareUrl = (link: { groupId: string; version: number }) => {
        const signature = createHmac("sha256", secret)
          .update(`share:${link.groupId}:${link.version}`)
          .digest("base64url");
        const result = new URL("/", frontend);
        result.searchParams.set(
          "share",
          `${link.groupId}${link.version ? "." + link.version : ""}.${signature}`,
        );
        return result.toString();
      };
      if (target.pathname === "/api/board")
        payload.posts = payload.posts.map(
          ({
            shareLink,
            ...post
          }: {
            shareLink: { groupId: string; version: number };
          }) => ({ ...post, inviteUrl: shareUrl(shareLink) }),
        );
      else {
        payload.url = shareUrl(payload.shareLink);
        delete payload.shareLink;
      }
      return cors(Response.json(payload, { status: response.status }), origin);
    }
    return cors(response, origin);
  } catch {
    return cors(
      Response.json({ error: "Unauthorized gateway" }, { status: 401 }),
      origin,
    );
  }
}
