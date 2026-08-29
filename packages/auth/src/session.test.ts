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
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ globalRole: "USER" }]),
  };
  const orgQuery = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  };
  const select = vi.fn().mockReturnValueOnce(profileQuery).mockReturnValueOnce(orgQuery);

  return {
    requireDb: vi.fn(() => ({ select })),
    userProfiles: {},
    memberships: {},
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
    vi.clearAllMocks();
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
    expect(session.session.token).toBe("tok");
  });
});

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null without a Better Auth session", async () => {
    mockGetSession.mockResolvedValue(null);
    const { getSession } = await import("./session");
    await expect(getSession()).resolves.toBeNull();
  });
});
