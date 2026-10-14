-- Apply to an existing project to enable Admin → Memories and the homepage gallery.
begin;
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 120),
  caption text not null default '' check (length(caption) <= 1000),
  image text not null check (length(trim(image)) > 0),
  image_alt text not null check (length(trim(image_alt)) between 1 and 500),
  taken_on date,
  category text not null default 'Team moments' check (category in ('Workshops','Build sessions','Campus events','Team moments')),
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.memories enable row level security;
drop policy if exists memories_read on public.memories;
create policy memories_read on public.memories for select to anon,authenticated
using (published or public.is_admin());
drop policy if exists memories_manage on public.memories;
create policy memories_manage on public.memories for all to authenticated
using (public.is_admin()) with check (public.is_admin());
revoke all on public.memories from anon,authenticated;
grant select on public.memories to anon,authenticated;
grant insert,update,delete on public.memories to authenticated;
commit;
