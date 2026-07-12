import { expect, test } from "@playwright/test";

test("catalog lists journeys and links into the viewer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Living Historical Journeys" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Napoleon's 1812 Russian Campaign/ }),
  ).toBeVisible();
});

test("Napoleon viewer boots, seeks to Borodino, and preserves overlays on style switch", async ({
  page,
}) => {
  await page.goto("/viewer/napoleon-1812");

  // Map region + overlays render from the engine's start-state snapshot.
  await expect(page.getByLabel("Map")).toBeVisible();
  await expect(page.getByText("24 June 1812")).toBeVisible();
  await expect(page.getByText("Army strength")).toBeVisible();
  await expect(page.getByRole("button", { name: "Follow Grande Armée" })).toBeVisible();

  // Seek to the morning of Borodino; a controlled range needs a real input event.
  const borodino = Date.parse("1812-09-07T10:00:00Z");
  await page.getByRole("slider", { name: "Seek" }).evaluate((el, value) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, borodino);

  // The engine snapshot flows through to every overlay.
  await expect(page.getByText("7 September 1812")).toBeVisible();
  await expect(page.getByText("The Battle of Borodino begins")).toBeVisible();

  // Switching the base style must not drop the overlays.
  await page.getByRole("button", { name: "Atlas" }).click();
  await expect(page.getByText("7 September 1812")).toBeVisible();
  await expect(page.getByText("Army strength")).toBeVisible();
});
