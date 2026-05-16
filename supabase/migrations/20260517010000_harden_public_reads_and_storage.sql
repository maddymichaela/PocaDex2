alter table public.photocards
  add column if not exists card_template_id text;

create index if not exists profiles_username_idx
  on public.profiles (username);

create index if not exists profiles_active_username_idx
  on public.profiles (username)
  where deletion_requested_at is null;

create index if not exists follows_follower_idx
  on public.follows (follower_id);

create index if not exists follows_following_idx
  on public.follows (following_id);

create index if not exists photocards_public_discovery_idx
  on public.photocards (user_id, status, created_at desc);

create or replace view public.public_profiles_search as
select
  id,
  username,
  nickname,
  display_name,
  case when is_bio_public is distinct from false then bio else null end as bio,
  avatar_url,
  coalesce(is_collection_public, true) as is_collection_public,
  coalesce(is_wishlist_public, true) as is_wishlist_public,
  coalesce(is_bio_public, true) as is_bio_public,
  created_at,
  updated_at
from public.profiles
where deletion_requested_at is null;

create or replace view public.public_card_discovery as
select
  c.id,
  c.user_id,
  c.card_template_id,
  c.group_name,
  coalesce(nullif(c.member, ''), array_to_string(c.members, ', ')) as member,
  c.members,
  coalesce(c.category, 'Album') as category,
  c.source,
  c.album,
  c.era,
  c.year,
  c.card_name,
  c.version,
  c.status,
  c.image_url,
  c.created_at,
  c.updated_at
from public.photocards c
join public.profiles owner on owner.id = c.user_id
where owner.deletion_requested_at is null
  and (
    (c.status = 'wishlist' and owner.is_wishlist_public is distinct from false)
    or (c.status in ('owned', 'on_the_way') and owner.is_collection_public is distinct from false)
  );

create or replace view public.public_followers as
select
  f.following_id as profile_user_id,
  p.id,
  p.username,
  p.nickname,
  p.display_name,
  p.avatar_url,
  case when p.is_bio_public is distinct from false then p.bio else null end as bio,
  f.created_at
from public.follows f
join public.profiles subject on subject.id = f.following_id
join public.profiles p on p.id = f.follower_id
where subject.deletion_requested_at is null
  and p.deletion_requested_at is null;

create or replace view public.public_following as
select
  f.follower_id as profile_user_id,
  p.id,
  p.username,
  p.nickname,
  p.display_name,
  p.avatar_url,
  case when p.is_bio_public is distinct from false then p.bio else null end as bio,
  f.created_at
from public.follows f
join public.profiles subject on subject.id = f.follower_id
join public.profiles p on p.id = f.following_id
where subject.deletion_requested_at is null
  and p.deletion_requested_at is null;

create or replace view public.public_follow_counts as
select
  p.id as profile_user_id,
  (
    select count(*)::integer
    from public.follows f
    join public.profiles follower on follower.id = f.follower_id
    where f.following_id = p.id
      and follower.deletion_requested_at is null
  ) as followers,
  (
    select count(*)::integer
    from public.follows f
    join public.profiles following on following.id = f.following_id
    where f.follower_id = p.id
      and following.deletion_requested_at is null
  ) as following
from public.profiles p
where p.deletion_requested_at is null;

revoke all on public.public_profiles_search from anon, authenticated;
revoke all on public.public_card_discovery from anon, authenticated;
revoke all on public.public_followers from anon, authenticated;
revoke all on public.public_following from anon, authenticated;
revoke all on public.public_follow_counts from anon, authenticated;

grant select on public.public_profiles_search to anon, authenticated;
grant select on public.public_card_discovery to anon, authenticated;
grant select on public.public_followers to anon, authenticated;
grant select on public.public_following to anon, authenticated;
grant select on public.public_follow_counts to anon, authenticated;

create or replace function public.is_username_available(next_username text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select not exists (
    select 1
    from public.profiles
    where username = lower(trim(next_username))
      and ((select auth.uid()) is null or id <> (select auth.uid()))
  );
$$;

revoke all on function public.is_username_available(text) from public;
revoke all on function public.is_username_available(text) from anon;
grant execute on function public.is_username_available(text) to authenticated;

drop policy if exists profiles_select_all on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

drop policy if exists photocards_select_all on public.photocards;
drop policy if exists photocards_insert_own on public.photocards;
drop policy if exists photocards_update_own on public.photocards;
drop policy if exists photocards_delete_own on public.photocards;

drop policy if exists follows_select_all on public.follows;
drop policy if exists follows_insert_own on public.follows;
drop policy if exists follows_delete_own on public.follows;

alter table public.profiles enable row level security;
alter table public.photocards enable row level security;
alter table public.follows enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.photocards from anon;
revoke all on table public.follows from anon;
revoke all on table public.notifications from anon;

revoke all on table public.profiles from authenticated;
revoke all on table public.photocards from authenticated;
revoke all on table public.follows from authenticated;

grant select, insert on table public.profiles to authenticated;
grant update (
  username,
  nickname,
  display_name,
  bio,
  avatar_url,
  is_collection_public,
  is_wishlist_public,
  is_bio_public,
  has_password,
  deletion_requested_at,
  updated_at
) on table public.profiles to authenticated;

grant select, insert, update, delete on table public.photocards to authenticated;
grant select, insert, delete on table public.follows to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_own'
  ) then
    create policy profiles_select_own
      on public.profiles
      for select
      to authenticated
      using ((select auth.uid()) = id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_insert_own'
  ) then
    create policy profiles_insert_own
      on public.profiles
      for insert
      to authenticated
      with check ((select auth.uid()) = id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_update_own'
  ) then
    create policy profiles_update_own
      on public.profiles
      for update
      to authenticated
      using ((select auth.uid()) = id)
      with check ((select auth.uid()) = id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'photocards'
      and policyname = 'photocards_select_own'
  ) then
    create policy photocards_select_own
      on public.photocards
      for select
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'photocards'
      and policyname = 'photocards_insert_own'
  ) then
    create policy photocards_insert_own
      on public.photocards
      for insert
      to authenticated
      with check ((select auth.uid()) = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'photocards'
      and policyname = 'photocards_update_own'
  ) then
    create policy photocards_update_own
      on public.photocards
      for update
      to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'photocards'
      and policyname = 'photocards_delete_own'
  ) then
    create policy photocards_delete_own
      on public.photocards
      for delete
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'follows'
      and policyname = 'follows_select_own_edges'
  ) then
    create policy follows_select_own_edges
      on public.follows
      for select
      to authenticated
      using (
        (select auth.uid()) = follower_id
        or (select auth.uid()) = following_id
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'follows'
      and policyname = 'follows_insert_own_active_target'
  ) then
    create policy follows_insert_own_active_target
      on public.follows
      for insert
      to authenticated
      with check (
        (select auth.uid()) = follower_id
        and follower_id <> following_id
        and exists (
          select 1
          from public.public_profiles_search target
          where target.id = following_id
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'follows'
      and policyname = 'follows_delete_own'
  ) then
    create policy follows_delete_own
      on public.follows
      for delete
      to authenticated
      using ((select auth.uid()) = follower_id);
  end if;
end
$$;

drop policy if exists public_read_images on storage.objects;
drop policy if exists auth_upload_images on storage.objects;
drop policy if exists owner_update_images on storage.objects;
drop policy if exists owner_delete_images on storage.objects;
drop policy if exists owner_select_images on storage.objects;
drop policy if exists owner_insert_images on storage.objects;

create policy owner_select_images
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'photocard-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy owner_insert_images
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'photocard-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy owner_update_images
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'photocard-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'photocard-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy owner_delete_images
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'photocard-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_username text;
  final_username text;
  counter integer := 0;
begin
  base_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    '[^a-z0-9]', '', 'g'
  ));
  if length(base_username) < 3 then
    base_username := 'user' || base_username;
  end if;
  final_username := substr(base_username, 1, 20);
  while exists (select 1 from public.profiles where username = final_username) loop
    counter := counter + 1;
    final_username := substr(base_username, 1, 17) || counter;
  end loop;
  insert into public.profiles (id, username, nickname, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

revoke all on function public.update_updated_at() from public;
revoke all on function public.update_updated_at() from anon;
revoke all on function public.update_updated_at() from authenticated;
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;
