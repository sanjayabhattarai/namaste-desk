-- Run this in Supabase SQL Editor
-- It updates public.hotels for the new profile fields
-- and creates public.hotel_rooms for persisted room master data.

create table if not exists public.hotels (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (owner_id)
);

alter table public.hotels add column if not exists hotel_name text;
alter table public.hotels add column if not exists room_count integer;
alter table public.hotels add column if not exists room_names text;
alter table public.hotels add column if not exists check_in_time text;
alter table public.hotels add column if not exists check_out_time text;
alter table public.hotels add column if not exists timezone text default 'Asia/Kathmandu';
alter table public.hotels add column if not exists subscription_end_date timestamptz;

create table if not exists public.hotel_rooms (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  room_number integer not null,
  room_name text not null,
  room_type text not null default 'Standard',
  rate numeric not null default 1500,
  created_at timestamptz not null default now(),
  unique (owner_id, room_number)
);

alter table public.hotels enable row level security;
alter table public.hotel_rooms enable row level security;

-- Hotels policies
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'hotels'
      and policyname = 'owner can insert own hotel'
  ) then
    create policy "owner can insert own hotel"
    on public.hotels
    for insert
    to authenticated
    with check (owner_id = auth.uid());
  end if;
end
$$;

-- Refresh PostgREST schema cache so new columns are visible immediately
notify pgrst, 'reload schema';

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'hotels'
      and policyname = 'owner can view own hotel'
  ) then
    create policy "owner can view own hotel"
    on public.hotels
    for select
    to authenticated
    using (owner_id = auth.uid());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'hotels'
      and policyname = 'owner can update own hotel'
  ) then
    create policy "owner can update own hotel"
    on public.hotels
    for update
    to authenticated
    using (owner_id = auth.uid())
    with check (owner_id = auth.uid());
  end if;
end
$$;

-- Hotel rooms policies
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'hotel_rooms'
      and policyname = 'owner can insert own hotel rooms'
  ) then
    create policy "owner can insert own hotel rooms"
    on public.hotel_rooms
    for insert
    to authenticated
    with check (owner_id = auth.uid());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'hotel_rooms'
      and policyname = 'owner can view own hotel rooms'
  ) then
    create policy "owner can view own hotel rooms"
    on public.hotel_rooms
    for select
    to authenticated
    using (owner_id = auth.uid());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'hotel_rooms'
      and policyname = 'owner can update own hotel rooms'
  ) then
    create policy "owner can update own hotel rooms"
    on public.hotel_rooms
    for update
    to authenticated
    using (owner_id = auth.uid())
    with check (owner_id = auth.uid());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'hotel_rooms'
      and policyname = 'owner can delete own hotel rooms'
  ) then
    create policy "owner can delete own hotel rooms"
    on public.hotel_rooms
    for delete
    to authenticated
    using (owner_id = auth.uid());
  end if;
end
$$;
