import { expect, test, type APIRequestContext } from "@playwright/test";

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:3000";
const e2eUser = {
  email: "e2e-owner@example.com",
  id: "e2e-owner",
};

function testAuthHeaders(user = e2eUser) {
  return {
    "x-test-auth-email": user.email,
    "x-test-auth-user-id": user.id,
  };
}

async function deleteAllLists(request: APIRequestContext) {
  const headers = testAuthHeaders();
  const response = await request.get(`${apiUrl}/api/v1/lists?limit=100`, {
    headers,
  });
  const body = await response.json();

  await Promise.all(
    body.lists.map((list: { id: string }) =>
      request.delete(`${apiUrl}/api/v1/lists/${list.id}`, { headers }),
    ),
  );
}

test.beforeEach(async ({ request }) => {
  await deleteAllLists(request);
});

test.afterEach(async ({ request }) => {
  await deleteAllLists(request);
});

test("creates and shops a persisted list", async ({ page }) => {
  const listName = `E2E Groceries ${Date.now()}`;

  await page.goto("/create-list");
  await page.getByPlaceholder("List name").fill(listName);
  await page.getByRole("button", { name: /create list/i }).click();

  await expect(page.getByPlaceholder("Add aisle")).toBeVisible();
  await page.getByPlaceholder("Add aisle").fill("Dairy");
  await page.getByRole("button", { name: "Add aisle" }).click();

  await page.getByPlaceholder("Add item").fill("Milk");
  await page.keyboard.press("Enter");
  await page.getByPlaceholder("Add item").fill("Eggs");
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: /shop/i }).click();
  await page.getByRole("checkbox", { name: /milk/i }).click();
  await expect(page.getByText("1/2 items")).toBeVisible();

  await page.getByRole("button", { name: /reset checked items/i }).click();
  await expect(page.getByText("0/2 items")).toBeVisible();

  await page.goto("/lists");
  await expect(page.getByText(listName)).toBeVisible();
});

test("imports guest lists after deterministic sign-in", async ({ page }) => {
  const guestListName = `E2E Guest Import ${Date.now()}`;
  const accountOnlyListName = `E2E Account Only ${Date.now()}`;

  await page.goto("/create-list");
  await page.getByPlaceholder("List name").fill(guestListName);
  await page.getByRole("button", { name: /create list/i }).click();
  await expect(page.getByPlaceholder("Add aisle")).toBeVisible();

  await page.goto("/settings");
  await page.getByRole("button", { name: /sign in with google/i }).click();
  await expect(page.getByText(e2eUser.email)).toBeVisible();

  await page.goto("/lists");
  await expect(page.getByText(guestListName)).toBeVisible();

  await page.goto("/create-list");
  await page.getByPlaceholder("List name").fill(accountOnlyListName);
  await page.getByRole("button", { name: /create list/i }).click();
  await expect(page.getByPlaceholder("Add aisle")).toBeVisible();

  await page.goto("/settings");
  await page.getByRole("button", { name: /^sign out$/i }).click();
  await expect(page.getByRole("button", { name: /sign in with google/i })).toBeVisible();

  await page.goto("/lists");
  await expect(page.getByText(guestListName)).toBeVisible();
  await expect(page.getByText(accountOnlyListName)).toHaveCount(0);
});
