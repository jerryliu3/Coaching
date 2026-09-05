import Link from "next/link";
import { currentProfile } from "@/lib/data";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await currentProfile();
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col gap-4 border-r bg-sidebar px-4 py-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Studio</p>
          <p className="font-semibold">Resume editor</p>
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          <Link className="rounded-md px-2 py-1.5 hover:bg-muted" href="/">
            Resumes
          </Link>
          <Link className="rounded-md px-2 py-1.5 hover:bg-muted" href="/analysis">
            Analysis
          </Link>
        </nav>
        <div className="mt-auto text-xs text-muted-foreground">
          <p>{profile?.display_name || user?.email}</p>
          <p className="capitalize">{profile?.role ?? "contractor"}</p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <p className="text-sm text-muted-foreground">Section-by-section editing</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/resumes/new">New resume</Link>
          </Button>
        </header>
        <div className="flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}
