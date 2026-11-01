export function GET() {
  return Response.json(
    { service: "web-notepad-bff", status: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
