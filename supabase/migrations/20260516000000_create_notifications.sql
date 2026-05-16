create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('follow')),
  created_at timestamptz not null default now(),
  read boolean not null default false,
  check (user_id <> actor_user_id)
);

create index if not exists notifications_user_unread_created_idx
  on public.notifications (user_id, read, created_at desc);

create index if not exists notifications_actor_created_idx
  on public.notifications (actor_user_id, created_at desc);

alter table public.notifications enable row level security;

grant select, insert, update on public.notifications to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'Users can read their notifications'
  ) then
    create policy "Users can read their notifications"
      on public.notifications
      for select
      to authenticated
      using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'Followers can create follow notifications'
  ) then
    create policy "Followers can create follow notifications"
      on public.notifications
      for insert
      to authenticated
      with check (
        (select auth.uid()) is not null
        and (select auth.uid()) = actor_user_id
        and type = 'follow'
        and actor_user_id <> user_id
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'Users can mark their notifications read'
  ) then
    create policy "Users can mark their notifications read"
      on public.notifications
      for update
      to authenticated
      using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
      with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
  end if;
end
$$;
