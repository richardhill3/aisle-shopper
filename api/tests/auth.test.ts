import fs from "node:fs";
import path from "node:path";
import request from "supertest";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getClaims: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: supabaseMocks.createClient,
}));

import { createApp } from "../src/app";
import { resetSupabaseAuthClientForTests } from "../src/auth";
import { pool } from "../src/db";

const app = createApp();
const token = "header.payload.signature";

async function resetDatabase() {
  await pool.query(
    "TRUNCATE items, sections, list_memberships, lists, profiles RESTART IDENTITY CASCADE",
  );
}

beforeAll(async () => {
  const schema = fs.readFileSync(
    path.join(process.cwd(), "api/schema.sql"),
    "utf8",
  );
  await pool.query(schema);
});

beforeEach(async () => {
  await resetDatabase();
  resetSupabaseAuthClientForTests();
  supabaseMocks.createClient.mockReset();
  supabaseMocks.getClaims.mockReset();
  supabaseMocks.createClient.mockReturnValue({
    auth: {
      getClaims: supabaseMocks.getClaims,
    },
  });
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_ANON_KEY = "anon-key";
  process.env.API_ENABLE_TEST_AUTH_BYPASS = "true";
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
});

afterAll(async () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.API_ENABLE_TEST_AUTH_BYPASS;
  await pool.end();
});

describe("API Supabase auth verification", () => {
  it("resolves verified Supabase claims into the current profile", async () => {
    supabaseMocks.getClaims.mockResolvedValue({
      data: {
        claims: {
          email: "Verified.User@Example.com",
          iss: "https://project.supabase.co/auth/v1",
          sub: "supabase-user-1",
          user_metadata: {
            full_name: "Verified User",
          },
        },
      },
      error: null,
    });

    await request(app)
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.profile).toMatchObject({
          displayName: "Verified User",
          email: "verified.user@example.com",
          supabaseUserId: "supabase-user-1",
        });
      });

    expect(supabaseMocks.createClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "anon-key",
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
    expect(supabaseMocks.getClaims).toHaveBeenCalledWith(token);
  });

  it("rejects malformed bearer tokens before Supabase verification", async () => {
    await request(app)
      .get("/api/v1/me")
      .set("Authorization", "Bearer not-a-jwt")
      .expect(401)
      .expect((response) => {
        expect(response.body.error.message).toBe("Invalid access token.");
      });

    expect(supabaseMocks.createClient).not.toHaveBeenCalled();
    expect(supabaseMocks.getClaims).not.toHaveBeenCalled();
  });

  it("rejects unverified Supabase tokens", async () => {
    supabaseMocks.getClaims.mockResolvedValue({
      data: null,
      error: new Error("invalid token"),
    });

    await request(app)
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401)
      .expect((response) => {
        expect(response.body.error.message).toBe("Invalid access token.");
      });
  });

  it("rejects tokens from another Supabase issuer", async () => {
    supabaseMocks.getClaims.mockResolvedValue({
      data: {
        claims: {
          email: "verified@example.com",
          iss: "https://other-project.supabase.co/auth/v1",
          sub: "supabase-user-1",
        },
      },
      error: null,
    });

    await request(app)
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401)
      .expect((response) => {
        expect(response.body.error.message).toBe("Invalid access token.");
      });
  });

  it("keeps test auth bypass independent from Supabase config", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;

    await request(app)
      .get("/api/v1/me")
      .set({
        "x-test-auth-email": "test@example.com",
        "x-test-auth-user-id": "test-user",
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.profile).toMatchObject({
          email: "test@example.com",
          supabaseUserId: "test-user",
        });
      });

    expect(supabaseMocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects test auth bypass unless it is explicitly enabled", async () => {
    delete process.env.API_ENABLE_TEST_AUTH_BYPASS;

    await request(app)
      .get("/api/v1/me")
      .set({
        "x-test-auth-email": "test@example.com",
        "x-test-auth-user-id": "test-user",
      })
      .expect(401)
      .expect((response) => {
        expect(response.body.error.message).toBe(
          "Test authentication is disabled.",
        );
      });
  });

  it("fails clearly when bearer auth is used without API Supabase config", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;

    await request(app)
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401)
      .expect((response) => {
        expect(response.body.error.message).toBe(
          "Supabase authentication is not configured.",
        );
      });
  });
});
