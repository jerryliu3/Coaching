-- Resume editor schema, RLS, and storage

create extension if not exists "pgcrypto";

create type public.user_role as enum ('owner', 'contractor');
create type public.resume_status as enum ('active', 'paused', 'done');
create type public.revision_status as enum ('in_progress', 'sent', 'returned', 'complete');
create type public.revision_kind as enum ('discovery', 'editing', 'polishing');
create type public.section_kind as enum ('contact', 'summary', 'education', 'experience', 'project', 'skills', 'extracurricular', 'patents');
create type public.entry_kind as enum ('job', 'project', 'school', 'skill_group', 'extra', 'patent');
create type public.file_kind as enum ('original_upload', 'client_return', 'export');
create type public.comment_status as enum ('open', 'resolved', 'deleted');
create type public.xyz_pattern as enum ('xyz', 'yxz', 'other', 'unknown');
create type public.edit_source as enum ('human', 'ai');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role public.user_role not null default 'contractor'
);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null default '',
  target_role text not null default '',
  industry text not null default '',
  seniority text not null default '',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  title text not null,
  status public.resume_status not null default 'active',
  current_revision_number int not null default 1,
  created_at timestamptz not null default now()
);

create table public.resume_assignments (
  resume_id uuid not null references public.resumes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (resume_id, user_id)
);

create table public.revisions (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes (id) on delete cascade,
  revision_number int not null,
  kind public.revision_kind not null,
  status public.revision_status not null default 'in_progress',
  current_step text not null default 'upload',
  unique (resume_id, revision_number)
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.revisions (id) on delete cascade,
  kind public.file_kind not null,
  storage_path text not null,
  mime_type text not null default '',
  filename text not null
);

create table public.contacts (
  revision_id uuid primary key references public.revisions (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  linkedin text not null default '',
  github text not null default '',
  location_city text not null default '',
  location_region text not null default ''
);

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.revisions (id) on delete cascade,
  kind public.section_kind not null,
  position int not null,
  heading text not null default ''
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections (id) on delete cascade,
  kind public.entry_kind not null,
  position int not null,
  org_name text not null default '',
  role_title text not null default '',
  location text not null default '',
  start_date text,
  end_date text,
  is_current boolean not null default false,
  url text not null default '',
  gpa text not null default '',
  courses text not null default '',
  meta jsonb not null default '{}'::jsonb
);

create table public.bullets (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  position int not null,
  lineage_id uuid not null default gen_random_uuid(),
  original_text text not null default '',
  current_text text not null default '',
  starts_with_verb boolean not null default false,
  tense text not null default 'unknown',
  has_first_person boolean not null default false,
  has_metric boolean not null default false,
  has_tools boolean not null default false,
  has_justification boolean not null default false,
  xyz_pattern public.xyz_pattern not null default 'unknown'
);

create table public.bullet_technologies (
  bullet_id uuid not null references public.bullets (id) on delete cascade,
  technology text not null,
  primary key (bullet_id, technology)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.revisions (id) on delete cascade,
  bullet_id uuid references public.bullets (id) on delete cascade,
  entry_id uuid references public.entries (id) on delete cascade,
  section_id uuid references public.sections (id) on delete cascade,
  anchor_start int,
  anchor_end int,
  body text not null,
  status public.comment_status not null default 'open',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.edits (
  id uuid primary key default gen_random_uuid(),
  bullet_id uuid not null references public.bullets (id) on delete cascade,
  revision_id uuid not null references public.revisions (id) on delete cascade,
  before_text text not null,
  after_text text not null,
  source public.edit_source not null,
  comment_template text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.revisions (id) on delete cascade,
  entry_id uuid references public.entries (id) on delete set null,
  trigger text not null,
  prompt text not null,
  response jsonb not null default '{}'::jsonb,
  model text not null default '',
  created_at timestamptz not null default now()
);

create table public.guidelines (
  id uuid primary key default gen_random_uuid(),
  source_revision_id uuid references public.revisions (id) on delete set null,
  body text not null,
  industry text not null default '',
  seniority text not null default '',
  role_type text not null default '',
  created_at timestamptz not null default now()
);

create index bullets_entry_position_idx on public.bullets (entry_id, position);
create index bullets_lineage_idx on public.bullets (lineage_id);
create index edits_bullet_revision_idx on public.edits (bullet_id, revision_id);
create index comments_bullet_idx on public.comments (bullet_id);
create index resume_assignments_user_idx on public.resume_assignments (user_id);
create index guidelines_filter_idx on public.guidelines (industry, seniority, role_type);

create or replace function public.is_owner()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.can_access_resume(target uuid)
returns boolean
language sql
stable
as $$
  select public.is_owner()
    or exists (
      select 1 from public.resume_assignments a
      where a.resume_id = target and a.user_id = auth.uid()
    );
$$;

create or replace function public.resume_id_for_revision(rev uuid)
returns uuid
language sql
stable
as $$
  select resume_id from public.revisions where id = rev;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    case
      when (select count(*) from public.profiles) = 0 then 'owner'::public.user_role
      else 'contractor'::public.user_role
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.candidates enable row level security;
alter table public.resumes enable row level security;
alter table public.resume_assignments enable row level security;
alter table public.revisions enable row level security;
alter table public.files enable row level security;
alter table public.contacts enable row level security;
alter table public.sections enable row level security;
alter table public.entries enable row level security;
alter table public.bullets enable row level security;
alter table public.bullet_technologies enable row level security;
alter table public.comments enable row level security;
alter table public.edits enable row level security;
alter table public.ai_runs enable row level security;
alter table public.guidelines enable row level security;

create policy profiles_read on public.profiles for select using (auth.uid() is not null);
create policy profiles_update_self on public.profiles for update using (id = auth.uid());

create policy candidates_all on public.candidates for all using (
  public.is_owner() or created_by = auth.uid() or exists (
    select 1 from public.resumes r
    join public.resume_assignments a on a.resume_id = r.id
    where r.candidate_id = candidates.id and a.user_id = auth.uid()
  )
);

create policy resumes_all on public.resumes for all using (public.can_access_resume(id));
create policy assignments_read on public.resume_assignments for select using (public.can_access_resume(resume_id) or user_id = auth.uid());
create policy assignments_write on public.resume_assignments for all using (public.is_owner());

create policy revisions_all on public.revisions for all using (public.can_access_resume(resume_id));
create policy files_all on public.files for all using (public.can_access_resume(public.resume_id_for_revision(revision_id)));
create policy contacts_all on public.contacts for all using (public.can_access_resume(public.resume_id_for_revision(revision_id)));
create policy sections_all on public.sections for all using (public.can_access_resume(public.resume_id_for_revision(revision_id)));
create policy entries_all on public.entries for all using (
  public.can_access_resume(public.resume_id_for_revision((select revision_id from public.sections where id = section_id)))
);
create policy bullets_all on public.bullets for all using (
  public.can_access_resume(
    public.resume_id_for_revision(
      (select s.revision_id from public.sections s join public.entries e on e.section_id = s.id where e.id = entry_id)
    )
  )
);
create policy bullet_tech_all on public.bullet_technologies for all using (
  exists (select 1 from public.bullets b where b.id = bullet_id)
);
create policy comments_all on public.comments for all using (public.can_access_resume(public.resume_id_for_revision(revision_id)));
create policy edits_all on public.edits for all using (public.can_access_resume(public.resume_id_for_revision(revision_id)));
create policy ai_runs_all on public.ai_runs for all using (public.can_access_resume(public.resume_id_for_revision(revision_id)));
create policy guidelines_read on public.guidelines for select using (auth.uid() is not null);
create policy guidelines_write on public.guidelines for insert with check (public.is_owner() or auth.uid() is not null);

insert into storage.buckets (id, name, public)
values ('resume-files', 'resume-files', false)
on conflict (id) do nothing;

create policy "resume files read" on storage.objects for select using (
  bucket_id = 'resume-files' and auth.uid() is not null
);
create policy "resume files write" on storage.objects for insert with check (
  bucket_id = 'resume-files' and auth.uid() is not null
);
create policy "resume files update" on storage.objects for update using (
  bucket_id = 'resume-files' and auth.uid() is not null
);
