import { describe, expect, it } from "vitest";
import { app } from "../../app";
import { findLatestOtpFor } from "../utils/mailer";
import { createApiToken, createTestUser } from "../utils/factories";

describe("Auth routes", () => {
  it("issues OTP codes and exchanges them for session tokens", async () => {
    const email = "otp-agent@example.com";
    const otpResponse = await app.inject({
      method: "POST",
      url: "/v1/auth/email-otp",
      payload: { email },
    });
    expect(otpResponse.statusCode).toBe(200);

    const latest = findLatestOtpFor(email);
    expect(latest?.code).toBeDefined();

    const loginResponse = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email, code: latest!.code },
    });
    expect(loginResponse.statusCode).toBe(200);
    const session = loginResponse.json();
    expect(session.token).toEqual(expect.any(String));
    expect(session.user.email).toBe(email);

    const createTokenResponse = await app.inject({
      method: "POST",
      url: "/v1/auth/api-tokens",
      headers: { authorization: `Bearer ${session.token}` },
      payload: { name: "integration-api" },
    });
    expect(createTokenResponse.statusCode).toBe(201);

    const listTokensResponse = await app.inject({
      method: "GET",
      url: "/v1/auth/api-tokens",
      headers: { authorization: `Bearer ${session.token}` },
    });
    expect(listTokensResponse.statusCode).toBe(200);
    expect(listTokensResponse.json()).toHaveLength(1);
  });

  it("enforces bearer auth for protected routes", async () => {
    const user = await createTestUser({ email: "api-subject@example.com" });
    const { token } = await createApiToken(user.id);

    const deniedResponse = await app.inject({ method: "GET", url: "/v1/users" });
    expect(deniedResponse.statusCode).toBe(401);

    const permittedResponse = await app.inject({
      method: "GET",
      url: "/v1/users",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(permittedResponse.statusCode).toBe(200);
  });
});
