import { expect, test } from "@playwright/test";
import { testData } from "./test-data";

test("login create share", async ({ page }) => {
  const projects: Array<{ id: string; name: string; createdAt: string }> = [];
  const folders: Array<{ id: string; projectId: string; name: string; createdAt: string }> = [];
  const records: Array<{
    id: string;
    folderId: string;
    revision: number;
    title: string;
    kind: "login" | "card";
    encryptedPayload: string;
    createdAt: string;
    updatedAt: string;
  }> = [];

  await page.route("**/api/vault/prelogin", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        kdf: "pbkdf2",
        iterations: 600000,
        salt: "salt"
      })
    });
  });

  await page.route("**/api/vault/token", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accessToken: "access-token",
        csrfToken: "csrf-token"
      })
    });
  });

  await page.route("**/api/auth/session", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: { id: "user-1", email: testData.user.email },
          csrfToken: "csrf-token"
        })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        session: { id: "user-1", email: testData.user.email },
        csrfToken: "csrf-token"
      })
    });
  });

  await page.route("**/api/vault/summary", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        projects,
        folders
      })
    });
  });

  await page.route("**/api/vault/projects", async (route) => {
    const payload = JSON.parse(route.request().postData() ?? "{}");
    const project = {
      id: `project-${projects.length + 1}`,
      name: payload.name,
      createdAt: new Date().toISOString()
    };
    projects.push(project);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(project)
    });
  });

  await page.route("**/api/vault/folders", async (route) => {
    const payload = JSON.parse(route.request().postData() ?? "{}");
    const folder = {
      id: `folder-${folders.length + 1}`,
      projectId: payload.projectId,
      name: payload.name,
      createdAt: new Date().toISOString()
    };
    folders.push(folder);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(folder)
    });
  });

  await page.route("**/api/vault/records", async (route) => {
    const payload = JSON.parse(route.request().postData() ?? "{}");
    const record = {
      id: `record-${records.length + 1}`,
      folderId: payload.folderId,
      revision: 1,
      title: payload.title,
      kind: payload.kind,
      encryptedPayload: payload.encryptedPayload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    records.push(record);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(record)
    });
  });

  await page.route("**/api/share/test-share-token", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token: testData.share.token,
        status: "active",
        title: testData.record.title,
        content: testData.record.username,
        ttlSeconds: testData.share.ttlSeconds,
        remainingViews: testData.share.remainingViews
      })
    });
  });

  await page.goto("/login");

  await page.getByTestId("login-email").fill(testData.user.email);
  await page.getByTestId("login-password").fill(testData.user.password);
  await page.getByTestId("login-submit").click();

  await expect(page).toHaveURL(/\/vault$/);

  await page.getByTestId("project-name-input").fill(testData.projectName);
  await page.getByTestId("create-project-btn").click();

  await page.getByTestId("project-project-1").click();

  await page.getByTestId("folder-name-input").fill(testData.folderName);
  await page.getByTestId("create-folder-btn").click();

  await page.getByTestId("folder-folder-1").click();

  await page.getByTestId("record-title-input").fill(testData.record.title);
  await page.getByTestId("record-username-input").fill(testData.record.username);
  await page.getByTestId("record-secret-input").fill(testData.record.secret);
  await page.getByTestId("create-record-btn").click();

  await page.getByTestId("record-row-record-1").click();
  await page.getByTestId("create-share-btn").click();

  await expect(page.getByTestId("share-url")).toHaveText("/share/test-share-token");

  await page.goto("/share/test-share-token");

  await expect(page.getByRole("heading", { name: "Shared Record" })).toBeVisible();
  await expect(page.getByText("Status: active")).toBeVisible();
  await expect(page.getByText(`TTL: ${testData.share.ttlSeconds}s`)).toBeVisible();
  await expect(
    page.getByText(`Remaining views: ${testData.share.remainingViews}`)
  ).toBeVisible();
});
