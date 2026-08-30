import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetSession = vi.fn();
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@khepree/db", () => {
  const profileQuery = {
    from() {
      return this;
    },
    where() {
      return this;
    },
    limit: async () => [{ globalRole: "USER", locale: "vi" }],
  };
  const orgQuery = {
    from() {
      return this;
    },
    where: async () => [],
  };
  let calls = 0;
  const select = vi.fn(() => {
    calls += 1;
    return calls % 2 === 1 ? profileQuery : orgQuery;
  });

  return {
    requireDb: vi.fn(() => ({ select })),
    userProfiles: { globalRole: "global_role", locale: "locale", userId: "user_id" },
    memberships: { organizationId: "organization_id", userId: "user_id" },
  };
});

vi.mock("./server", () => ({
  getAuth: vi.fn(() => ({
    api: {
      getSession: mockGetSession,
    },
  })),
}));

describe("requireSession", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    });
  });

  it("redirects to sign-in when no session", async () => {
    mockGetSession.mockResolvedValue(null);
    const { requireSession } = await import("./session");

    await expect(requireSession()).rejects.toThrow("REDIRECT:/sign-in");
  });

  it("returns session when authenticated", async () => {
    mockGetSession.mockResolvedValue({
      user: {
        id: "u1",
        email: "a@example.com",
        name: "Alex",
        emailVerified: true,
        twoFactorEnabled: false,
      },
      session: { id: "s1", token: "tok" },
    });

    const { requireSession } = await import("./session");
    const session = await requireSession();

    expect(session.user.email).toBe("a@example.com");
    expect(session.session.id).toBe("s1");
    expect(session.locale).toBe("vi");
  });
});

describe("getSession", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
  });

  it("returns null without a Better Auth session", async () => {
    mockGetSession.mockResolvedValue(null);
    const { getSession } = await import("./session");
    await expect(getSession()).resolves.toBeNull();
  });
});
