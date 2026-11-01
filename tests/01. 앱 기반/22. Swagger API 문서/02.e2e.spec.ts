import { expect, test } from "@playwright/test";

test("2. Swagger UI는 외부 자산 없이 문서를 표시하고 health를 실제 실행한다", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:3102"))
      external.push(request.url());
  });
  await page.goto("http://127.0.0.1:3102/docs");
  await expect(
    page.getByRole("heading", { name: "Web Notepad BFF API" }),
  ).toBeVisible();
  const health = page.locator("#operations-Health-getHealth");
  await health.locator(".opblock-summary").click();
  await health.getByRole("button", { name: "Try it out" }).click();
  const completed = page.waitForResponse((response) =>
    response.url().endsWith("/api/health"),
  );
  await health.getByRole("button", { name: "Execute", exact: true }).click();
  const response = await completed;
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({
    service: "web-notepad-bff",
    status: "ok",
  });
  await expect(health.locator(".responses-wrapper")).toContainText(
    "web-notepad-bff",
  );
  expect(external).toEqual([]);
  await page.screenshot({
    path: "test-results/swagger-ui.png",
    fullPage: true,
  });
});
