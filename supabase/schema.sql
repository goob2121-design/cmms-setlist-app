create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tempo_value') then
    create type tempo_value as enum ('slow', 'medium', 'fast');
  end if;

  if not exists (select 1 from pg_type where typname = 'setlist_status') then
    create type setlist_status as enum ('draft', 'live', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'show_status') then
    create type show_status as enum ('planned', 'in_progress', 'completed', 'cancelled');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  instrument text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.song_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  key text not null,
  tempo tempo_value not null,
  duration numeric(4, 2) not null check (duration > 0 and duration <= 20),
  singer text not null,
  notes text not null default '',
  tags text[] not null default '{}'::text[],
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.song_tag_links (
  song_id uuid not null references public.songs (id) on delete cascade,
  tag_id uuid not null references public.song_tags (id) on delete cascade,
  primary key (song_id, tag_id)
);

create table if not exists public.shows (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  venue_name text,
  show_date date,
  target_duration_minutes integer,
  status show_status not null default 'planned',
  notes text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.setlists (
  id uuid primary key default gen_random_uuid(),
  show_id uuid references public.shows (id) on delete cascade,
  name text not null,
  description text not null default '',
  status setlist_status not null default 'draft',
  generated_from_criteria jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.setlist_items (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete restrict,
  position integer not null check (position >= 0),
  is_optional boolean not null default false,
  arrangement_notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  unique (setlist_id, position)
);

create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists (id) on delete cascade,
  started_by uuid references public.profiles (id) on delete set null,
  current_item_id uuid references public.setlist_items (id) on delete set null,
  current_position integer not null default 0,
  is_active boolean not null default true,
  started_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.personal_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  setlist_item_id uuid not null references public.setlist_items (id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, setlist_item_id)
);

create table if not exists public.live_events (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid not null references public.live_sessions (id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.show_history (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows (id) on delete cascade,
  setlist_id uuid not null references public.setlists (id) on delete cascade,
  actual_duration_minutes integer,
  audience_notes text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists songs_title_idx on public.songs using gin (to_tsvector('english', title));
create index if not exists songs_key_idx on public.songs (key);
create index if not exists songs_tempo_idx on public.songs (tempo);
create index if not exists setlist_items_setlist_idx on public.setlist_items (setlist_id, position);
create index if not exists live_events_session_idx on public.live_events (live_session_id, created_at desc);
create index if not exists shows_date_idx on public.shows (show_date desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists songs_set_updated_at on public.songs;
create trigger songs_set_updated_at
before update on public.songs
for each row
execute function public.set_updated_at();

drop trigger if exists shows_set_updated_at on public.shows;
create trigger shows_set_updated_at
before update on public.shows
for each row
execute function public.set_updated_at();

drop trigger if exists setlists_set_updated_at on public.setlists;
create trigger setlists_set_updated_at
before update on public.setlists
for each row
execute function public.set_updated_at();

drop trigger if exists live_sessions_set_updated_at on public.live_sessions;
create trigger live_sessions_set_updated_at
before update on public.live_sessions
for each row
execute function public.set_updated_at();

drop trigger if exists personal_notes_set_updated_at on public.personal_notes;
create trigger personal_notes_set_updated_at
before update on public.personal_notes
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.song_tags enable row level security;
alter table public.songs enable row level security;
alter table public.song_tag_links enable row level security;
alter table public.shows enable row level security;
alter table public.setlists enable row level security;
alter table public.setlist_items enable row level security;
alter table public.live_sessions enable row level security;
alter table public.personal_notes enable row level security;
alter table public.live_events enable row level security;
alter table public.show_history enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile"
on public.profiles
for all
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Authenticated users can read songs" on public.songs;
create policy "Authenticated users can read songs"
on public.songs
for select
to authenticated
using (true);

drop policy if exists "Authenticated users manage songs" on public.songs;
create policy "Authenticated users manage songs"
on public.songs
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can read tags" on public.song_tags;
create policy "Authenticated users can read tags"
on public.song_tags
for select
to authenticated
using (true);

drop policy if exists "Authenticated users manage tags" on public.song_tags;
create policy "Authenticated users manage tags"
on public.song_tags
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can read song tag links" on public.song_tag_links;
create policy "Authenticated users can read song tag links"
on public.song_tag_links
for select
to authenticated
using (true);

drop policy if exists "Authenticated users manage song tag links" on public.song_tag_links;
create policy "Authenticated users manage song tag links"
on public.song_tag_links
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can read shows" on public.shows;
create policy "Authenticated users can read shows"
on public.shows
for select
to authenticated
using (true);

drop policy if exists "Authenticated users manage shows" on public.shows;
create policy "Authenticated users manage shows"
on public.shows
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can read setlists" on public.setlists;
create policy "Authenticated users can read setlists"
on public.setlists
for select
to authenticated
using (true);

drop policy if exists "Authenticated users manage setlists" on public.setlists;
create policy "Authenticated users manage setlists"
on public.setlists
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can read setlist items" on public.setlist_items;
create policy "Authenticated users can read setlist items"
on public.setlist_items
for select
to authenticated
using (true);

drop policy if exists "Authenticated users manage setlist items" on public.setlist_items;
create policy "Authenticated users manage setlist items"
on public.setlist_items
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can read live sessions" on public.live_sessions;
create policy "Authenticated users can read live sessions"
on public.live_sessions
for select
to authenticated
using (true);

drop policy if exists "Authenticated users manage live sessions" on public.live_sessions;
create policy "Authenticated users manage live sessions"
on public.live_sessions
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Users read their own personal notes" on public.personal_notes;
create policy "Users read their own personal notes"
on public.personal_notes
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users manage their own personal notes" on public.personal_notes;
create policy "Users manage their own personal notes"
on public.personal_notes
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Authenticated users can read live events" on public.live_events;
create policy "Authenticated users can read live events"
on public.live_events
for select
to authenticated
using (true);

drop policy if exists "Authenticated users manage live events" on public.live_events;
create policy "Authenticated users manage live events"
on public.live_events
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can read show history" on public.show_history;
create policy "Authenticated users can read show history"
on public.show_history
for select
to authenticated
using (true);

drop policy if exists "Authenticated users manage show history" on public.show_history;
create policy "Authenticated users manage show history"
on public.show_history
for all
to authenticated
using (true)
with check (true);

create or replace view public.setlist_runtime_summary as
select
  s.id as setlist_id,
  count(si.id) as song_count,
  coalesce(sum(case when si.is_optional then 0 else so.duration end), 0) as required_duration_minutes,
  coalesce(sum(so.duration), 0) as full_duration_minutes
from public.setlists s
left join public.setlist_items si on si.setlist_id = s.id
left join public.songs so on so.id = si.song_id
group by s.id;

create or replace view public.song_usage_stats as
select
  so.id as song_id,
  so.title,
  count(si.id) as total_setlist_appearances,
  count(case when si.position = 0 then 1 end) as opener_count,
  avg(so.duration) as average_duration_minutes
from public.songs so
left join public.setlist_items si on si.song_id = so.id
group by so.id, so.title;

comment on table public.songs is 'Song catalog with core stage metadata.';
comment on table public.setlists is 'Reusable and show-specific setlists.';
comment on table public.live_sessions is 'Current live state for realtime stage control.';
comment on table public.personal_notes is 'Per-user notes that should not be shared with the rest of the band.';
