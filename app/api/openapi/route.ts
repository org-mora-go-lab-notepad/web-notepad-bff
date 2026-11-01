import { getOpenApiDocument } from "@/src/server";
export function GET() {
  return Response.json(getOpenApiDocument(), {
    headers: { "Cache-Control": "no-store" },
  });
}
