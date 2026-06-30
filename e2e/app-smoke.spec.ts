import { expect, test, type Page } from "@playwright/test";

async function seedLocalSession(page: Page) {
  await page.addInitScript(() => {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);
    const payload = {
      state: {
        session: {
          user: {
            id: "local-e2e@test.com",
            email: "e2e@test.com",
            displayName: "E2E Coach",
            role: "coach",
            accessType: "trial",
            expiresAt: trialEnd.toISOString(),
          },
          createdAt: new Date().toISOString(),
          cloud: false,
        },
      },
      version: 0,
    };
    localStorage.setItem("fastcourt_session_v2", JSON.stringify(payload));
  });
}

async function gotoAuthenticated(page: Page, path: string) {
  await seedLocalSession(page);
  await page.goto(path);
  await page.waitForFunction(
    () => {
      const text = document.body.innerText.trim();
      return text !== "Loading…" && text !== "Redirecting to login…";
    },
    { timeout: 30_000 },
  );
}

test.describe("public pages", () => {
  test("landing page renders hero and pricing", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Design plays/i, level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pricing", level: 2 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Get started" }).first()).toBeVisible();
    await expect(page.getByText("Most Popular")).toBeVisible();
    await expect(page.getByText("Club Structure")).toBeVisible();
    await expect(page.locator("#faq")).toBeVisible();
  });

  test("login page renders email and password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#auth-email")).toBeVisible();
    await expect(page.locator("#auth-password")).toBeVisible();
    await expect(page.locator("#btn-auth-continue")).toBeVisible();
  });

  test("privacy and terms pages load", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("body")).toContainText(/privacy/i);

    await page.goto("/terms");
    await expect(page.locator("body")).toContainText(/terms/i);
  });
});

test.describe("library", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAuthenticated(page, "/library");
  });

  test("library loads and seeds mock plays", async ({ page }) => {
    await expect(page.locator(".fd-ui")).toBeVisible();
    await expect(page.getByText("Horns Flare", { exact: false })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("library tab navigation", async ({ page }) => {
    await page.goto("/library?tab=playbooks");
    await expect(page.locator("#fc-playbooks-shell")).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/library?tab=players");
    await expect(page.locator("body")).toContainText(/players/i);
  });
});

test.describe("designer", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAuthenticated(page, "/library");
    await expect(page.getByText("Horns Flare", { exact: false })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("opens designer for seeded play", async ({ page }) => {
    await page.goto("/designer?item=play-horns-flare");
    await expect(page.locator("#screen-designer")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("#btn-add-frame")).toBeVisible();
    await expect(page.locator("#btn-clear-frame")).toBeVisible();
    await expect(page.locator("#btn-undo")).toBeVisible();
  });

  test("notes editor frame is visible", async ({ page }) => {
    await page.goto("/designer?item=play-horns-flare");
    await expect(page.locator("#screen-designer")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".notes-editor-main")).toBeVisible();
    await expect(page.locator("#ds-fd-frame-heading")).toBeVisible();
  });

  test("clear frame modal has readable black buttons", async ({ page }) => {
    await page.goto("/designer?item=play-horns-flare");
    await expect(page.locator("#btn-clear-frame")).toBeVisible({ timeout: 20_000 });
    await page.locator("#btn-clear-frame").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Clear", exact: true })).toBeVisible();

    const cancelColor = await dialog
      .getByRole("button", { name: "Cancel" })
      .evaluate((el) => getComputedStyle(el).color);
    const clearColor = await dialog
      .getByRole("button", { name: "Clear", exact: true })
      .evaluate((el) => getComputedStyle(el).color);

    expect(cancelColor).toMatch(/rgb\(0,\s*0,\s*0\)/);
    expect(clearColor).toMatch(/rgb\(255,\s*255,\s*255\)/);
  });
});

test.describe("settings", () => {
  test("settings page loads with local session", async ({ page }) => {
    await gotoAuthenticated(page, "/settings");
    await expect(page.locator("body")).toContainText(/settings|appearance|account/i, {
      timeout: 15_000,
    });
  });
});
