import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET(
  _request: Request,
  context: { params: Promise<{ asset: string }> },
) {
  const { asset } = await context.params;
  if (asset === "initializer.js")
    return new Response(
      `window.ui = SwaggerUIBundle({
    url: "/docs/openapi.json", dom_id: "#swagger-ui", deepLinking: true,
    validatorUrl: null, persistAuthorization: false, withCredentials: false,
    displayRequestDuration: true, defaultModelsExpandDepth: 0,
    presets: [SwaggerUIBundle.presets.apis], layout: "BaseLayout"
  });`,
      {
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  if (!["swagger-ui.css", "swagger-ui-bundle.js"].includes(asset))
    return new Response(null, { status: 404 });
  const content = await readFile(
    path.join(process.cwd(), "node_modules/swagger-ui-dist", asset),
  );
  return new Response(content, {
    headers: {
      "Content-Type": asset.endsWith(".css")
        ? "text/css; charset=utf-8"
        : "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
