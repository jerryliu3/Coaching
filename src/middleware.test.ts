import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url: string, _key: string, opts: { cookies: { getAll: () => unknown; setAll: (c: unknown) => void } }) => {
    opts.cookies.getAll();
    opts.cookies.setAll([{ name: "sb", value: "1", options: { path: "/" } }]);
    return { auth: { getUser } };
  }),
}));

describe("middleware", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    getUser.mockReset();
  });

  it("passes through when env is missing", async () => {
    const { middleware } = await import("./middleware");
    const res = await middleware(new NextRequest("http://localhost/"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("sends anonymous users to login", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://supabase.local";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    getUser.mockResolvedValue({ data: { user: null } });
    const { middleware } = await import("./middleware");
    const res = await middleware(new NextRequest("http://localhost/resumes/new"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/login");
  });

  it("lets anonymous users stay on login", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://supabase.local";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    getUser.mockResolvedValue({ data: { user: null } });
    const { middleware } = await import("./middleware");
    const res = await middleware(new NextRequest("http://localhost/login"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("sends signed-in users away from login", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://supabase.local";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const { middleware } = await import("./middleware");
    const res = await middleware(new NextRequest("http://localhost/login"));
    expect(res.headers.get("location")).toBe("http://localhost/");
  });
});
