import { expect, test } from "@playwright/test";

test("title page presents the flagship journey and links into the viewer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Follow history/ })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Napoleon's 1812 Russian Campaign" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Watch the campaign" }).click();
  await expect(page).toHaveURL(/\/viewer\/napoleon-1812/);
});

test("Napoleon viewer opens at Borodino, seeks, and keeps its overlays on a style switch", async ({
  page,
}) => {
  await page.goto("/viewer/napoleon-1812?t=1812-09-07T08:00:00Z");

  // The map must actually occupy the page (it once collapsed to zero height).
  const map = page.locator("canvas.maplibregl-canvas");
  await expect(map).toBeVisible();
  expect((await map.boundingBox())!.height).toBeGreaterThan(300);

  // The engine snapshot flows through to every overlay.
  await expect(page.getByText("7 September 1812").first()).toBeVisible();
  await expect(page.getByText("Army strength")).toBeVisible();
  await expect(page.getByText("Bagration falls")).toBeVisible();
  await expect(page.getByText("Borodino", { exact: true }).first()).toBeVisible();

  // Follow the other side.
  await page.getByRole("button", { name: "Follow Russian Army" }).click();
  await expect(page.getByRole("button", { name: "Follow Russian Army" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // Seek into the occupation of Moscow; a controlled range needs a real input event.
  const october = Date.parse("1812-10-01T12:00:00Z");
  await page.getByRole("slider", { name: "Seek" }).evaluate((el, value) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, october);
  await expect(page.getByText("1 October 1812").first()).toBeVisible();
  await expect(page.getByText("The Occupation of Moscow")).toBeVisible();

  // Every claim can be traced: the sources panel lists what the content rests on.
  await page.getByRole("button", { name: "Sources" }).click();
  const sources = page.getByRole("dialog", { name: "Sources" });
  await expect(sources.getByText("How far to trust this")).toBeVisible();
  await expect(sources.getByText(/Ségur, History of the Expedition to Russia/)).toBeVisible();
  await sources.getByRole("button", { name: "Close" }).click();

  // Switching the base style must not drop the overlays.
  await page.getByRole("button", { name: "Modern map" }).click();
  await expect(page.getByText("1 October 1812").first()).toBeVisible();
  await expect(page.getByText("Army strength")).toBeVisible();
  await expect(page.getByRole("button", { name: "Period map" })).toBeVisible();
});

test("a live link anchors the march to the day it began", async ({ page }) => {
  // Began ten real days ago at the original pace: the army is ten days in.
  const began = new Date(Date.now() - 10 * 86_400_000).toISOString();
  await page.goto(`/viewer/napoleon-1812?began=${encodeURIComponent(began)}`);
  await expect(page.getByText(/Day 11/)).toBeVisible();
  await expect(page.getByText(/Live/)).toBeVisible();
});

test("title page offers the further journeys once they carry sources", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Shackleton’s Endurance Expedition" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The Oregon Emigration of 1843" })).toBeVisible();
  await page.getByRole("link", { name: "Watch the journey" }).first().click();
  await expect(page).toHaveURL(/\/viewer\/shackleton-1914/);
});

test("Shackleton viewer opens on the night the ship was abandoned", async ({ page }) => {
  await page.goto("/viewer/shackleton-1914?t=1915-10-27T23:30:00Z");
  const map = page.locator("canvas.maplibregl-canvas");
  await expect(map).toBeVisible();
  expect((await map.boundingBox())!.height).toBeGreaterThan(300);

  await expect(page.getByText("27 October 1915").first()).toBeVisible();
  await expect(page.getByText("Men with Shackleton")).toBeVisible();
  await expect(page.getByText("Sledge dogs")).toBeVisible();
  await expect(page.getByText("Abandon ship").first()).toBeVisible();
  // The Elephant Island party does not exist yet, so it cannot be followed.
  await expect(page.getByRole("button", { name: "Follow The men on Elephant Island" })).toHaveCount(0);

  await page.getByRole("button", { name: "Sources" }).click();
  await expect(
    page.getByRole("dialog", { name: "Sources" }).getByText(/Ernest Shackleton, South/),
  ).toBeVisible();
});

test("Oregon viewer finds the wagons at Fort Laramie in mid-July", async ({ page }) => {
  await page.goto("/viewer/oregon-trail-1843?t=1843-07-15T18:00:00Z");
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
  await expect(page.getByText("15 July 1843").first()).toBeVisible();
  await expect(page.getByText(/Day 59 · Fort Laramie/)).toBeVisible();
  await expect(page.getByText("Deaths recorded on the road")).toBeVisible();
});
