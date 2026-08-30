import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetSession = vi.fn();
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

function chain<T>(result: T) {
  const query = {
    from() {
      return query;
    },
    where() {
      return query;
    },
    limit: async () => result,
    then(resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return query;
}

vi.mock("react", () => ({
  cache: (fn: unknown) => fn,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@khepree/db", () => {
  const select = vi.fn(() => chain([{ globalRole: "USER", locale: "vi" }]));
  const db = { select };
  return {
    getDb: vi.fn(() => db),
    requireDb: vi.fn(() => db),
    userProfiles: { globalRole: "global_role", locale: "locale", userId: "user_id" },
    memberships: { organizationId: "organization_id", userId: "user_id" },
    session: { token: "token", id: "id", userId: "user_id" },
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

  it("redirects to sign-in when no session", { timeout: 15_000 }, async () => {
    mockGetSession.mockResolvedValue(null);
    const { requireSession } = await import("./session");

    await expect(requireSession()).rejects.toThrow("REDIRECT:/sign-in");
  });

  it("returns session when authenticated", { timeout: 15_000 }, async () => {
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

  it("returns null without a Better Auth session", { timeout: 15_000 }, async () => {
    mockGetSession.mockResolvedValue(null);
    const { getSession } = await import("./session");
    await expect(getSession()).resolves.toBeNull();
  });
});
