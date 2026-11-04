import { expect, it } from "vitest";
import { createGoApiClient } from "../packages/api-client/src/go-api";

it("accepts UUID workspace IDs in session and design responses", async () => {
  const workspaceId = "019a4500-0000-7000-8000-000000000001";
  const designId = "019a4500-0000-7000-8000-000000000002";
  const client = createGoApiClient("https://example.test", async (url) =>
    Response.json(String(url).endsWith("/me")
      ? { EmailAddress: "owner@example.com", WorkspaceId: workspaceId, Role: "USER" }
      : [{ design_id: designId, workspace_id: workspaceId, name: "Menu", description: "", updated_at: "2026-11-03T00:00:00Z", created_at: "2026-11-03T00:00:00Z" }]),
  );
  expect((await client.me()).WorkspaceId).toBe(workspaceId);
  expect((await client.designs.list())[0]).toMatchObject({ design_id: designId, workspace_id: workspaceId });
});
