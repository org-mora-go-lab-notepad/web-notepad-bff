import document from "@/docs/openapi.json";
import { version } from "@/package.json";
export function getOpenApiDocument() {
  return { ...document, info: { ...document.info, version } };
}
