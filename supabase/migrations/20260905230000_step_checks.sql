create type public.step_check_status as enum ('yes', 'needs_edit', 'skip');

create table public.step_checks (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.revisions (id) on delete cascade,
  step_id text not null,
  task_key text not null,
  status public.step_check_status not null default 'skip',
  note text not null default '',
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  unique (revision_id, step_id, task_key)
);

create index step_checks_revision_step_idx on public.step_checks (revision_id, step_id);

alter table public.step_checks enable row level security;

create policy step_checks_all on public.step_checks for all using (public.can_access_resume(public.resume_id_for_revision(revision_id)));
