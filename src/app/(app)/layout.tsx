import Link from "next/link";
import { currentProfile } from "@/lib/data";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await currentProfile();
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside className="flex w-60 flex-col gap-6 border-r border-border/80 bg-sidebar px-4 py-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Resume studio</p>
          <p className="mt-1 text-base font-semibold tracking-tight">Coaching</p>
        </div>
        <nav className="flex flex-col gap-0.5 text-sm">
          <Link className="rounded-lg px-3 py-2 font-medium hover:bg-muted/80" href="/">
            Resumes
          </Link>
          <Link className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted/80 hover:text-foreground" href="/analysis">
            Analysis
          </Link>
        </nav>
        <div className="mt-auto rounded-xl border border-border/60 bg-card/50 px-3 py-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">{profile?.display_name || user?.email}</p>
          <p className="capitalize">{profile?.role ?? "contractor"}</p>
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-border/60 bg-card/40 px-8 py-4 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground">Section-by-section editing</p>
          <Button asChild size="sm">
            <Link href="/resumes/new">New resume</Link>
          </Button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8 py-6">{children}</div>
      </div>
    </div>
  );
}
