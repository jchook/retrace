import { describe, expect, it } from "vitest";
import { app } from "../../app";
import { db } from "../../db";
import { createApiToken, createTestUser } from "../utils/factories";

describe("Items routes", () => {
  it("creates and lists demo items", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/items",
      payload: { title: "Integration Beacon", description: "Created via Vitest" },
    });

    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json();
    expect(created).toMatchObject({
      id: expect.any(Number),
      title: "Integration Beacon",
      description: "Created via Vitest",
    });

    const listResponse = await app.inject({ method: "GET", url: "/v1/items" });
    expect(listResponse.statusCode).toBe(200);
    const list = listResponse.json();
    expect(list).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.id,
          title: "Integration Beacon",
        }),
      ]),
    );

    const persisted = await db.query.items.findFirst({ where: (tbl, { eq }) => eq(tbl.id, created.id) });
    expect(persisted?.title).toBe("Integration Beacon");
  });

  it("allows authenticated callers to create and fetch users", async () => {
    const user = await createTestUser();
    const { token } = await createApiToken(user.id);

    const createUserResponse = await app.inject({
      method: "POST",
      url: "/v1/users",
      headers: { authorization: `Bearer ${token}` },
      payload: { email: "new-user@example.com", name: "Integration Subject" },
    });
    expect(createUserResponse.statusCode).toBe(201);

    const listUsersResponse = await app.inject({
      method: "GET",
      url: "/v1/users",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listUsersResponse.statusCode).toBe(200);
    const payload = listUsersResponse.json();
    expect(payload.length).toBeGreaterThan(0);

    const persisted = await db.query.users.findMany();
    expect(persisted.map((u) => u.email)).toContain("new-user@example.com");
  });
});
