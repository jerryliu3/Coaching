alter table public.contacts
  add column if not exists imported_fields jsonb not null default '{}'::jsonb;
