import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:3000";
const e2eUser = {
  email: "e2e-owner@example.com",
  id: "e2e-owner",
};
const e2eCollaborator = {
  email: "e2e-collaborator@example.com",
  id: "e2e-collaborator",
};

function testAuthHeaders(user = e2eUser) {
  return {
    "x-test-auth-email": user.email,
    "x-test-auth-user-id": user.id,
  };
}

async function deleteAllLists(request: APIRequestContext, user = e2eUser) {
  const headers = testAuthHeaders(user);
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

async function deleteE2eLists(request: APIRequestContext) {
  await deleteAllLists(request, e2eUser);
  await deleteAllLists(request, e2eCollaborator);
}

async function createProfile(request: APIRequestContext, user = e2eUser) {
  await request.get(`${apiUrl}/api/v1/me`, {
    headers: testAuthHeaders(user),
  });
}

async function useTestUser(page: Page, user: typeof e2eUser) {
  await page.evaluate((identity) => {
    window.localStorage.setItem(
      "aisle-shopper:test-auth",
      JSON.stringify({
        email: identity.email,
        userId: identity.id,
      }),
    );
  }, user);
}

test.beforeEach(async ({ request }) => {
  await deleteE2eLists(request);
});

test.afterEach(async ({ request }) => {
  await deleteE2eLists(request);
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
  await expect(
    page.getByRole("button", { name: /sign in with google/i }),
  ).toBeVisible();

  await page.goto("/lists");
  await expect(page.getByText(guestListName)).toBeVisible();
  await expect(page.getByText(accountOnlyListName)).toHaveCount(0);
});

test("shares a list with a collaborator who can shop but not manage owner controls", async ({
  page,
  request,
}) => {
  const listName = `E2E Shared List ${Date.now()}`;

  await createProfile(request, e2eCollaborator);

  await page.goto("/settings");
  await page.getByRole("button", { name: /sign in with google/i }).click();
  await expect(page.getByText(e2eUser.email)).toBeVisible();

  await page.goto("/create-list");
  await page.getByPlaceholder("List name").fill(listName);
  await page.getByRole("button", { name: /create list/i }).click();
  await expect(page.getByPlaceholder("Add aisle")).toBeVisible();

  await page.getByPlaceholder("Collaborator email").fill(e2eCollaborator.email);
  await page.getByRole("button", { name: "Add collaborator" }).click();
  await expect(page.getByText(e2eCollaborator.email)).toBeVisible();

  await page.getByPlaceholder("Add aisle").fill("Produce");
  await page.getByRole("button", { name: "Add aisle" }).click();
  await page.getByPlaceholder("Add item").fill("Apples");
  await page.keyboard.press("Enter");

  await useTestUser(page, e2eCollaborator);
  await page.goto("/lists");
  await page.getByText(listName).click();

  await expect(page.getByPlaceholder("List name")).toHaveValue(listName);
  await expect(page.getByPlaceholder("Collaborator email")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add collaborator" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete list" })).toHaveCount(
    0,
  );

  await page.getByPlaceholder("Add item").fill("Bananas");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /shop/i }).click();
  await page.getByRole("checkbox", { name: /bananas/i }).click();
  await expect(page.getByText("1/2 items")).toBeVisible();
});
