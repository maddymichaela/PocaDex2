create schema if not exists private;

alter table public.profiles
  add column if not exists subscription_tier text default 'free',
  add column if not exists subscription_expires_at timestamptz;

update public.profiles
set subscription_tier = 'free'
where subscription_tier is null;

alter table public.profiles
  alter column subscription_tier set default 'free',
  alter column subscription_tier set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_subscription_tier_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_subscription_tier_check
      check (subscription_tier in ('free', 'pro'));
  end if;
end $$;

create or replace function private.is_effective_pro(target_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = target_user_id
      and subscription_tier = 'pro'
      and (
        subscription_expires_at is null
        or subscription_expires_at > now()
      )
  );
$$;

revoke all on function private.is_effective_pro(uuid) from public;
revoke all on function private.is_effective_pro(uuid) from anon;
revoke all on function private.is_effective_pro(uuid) from authenticated;

create or replace function private.protect_profile_subscription_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  request_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    current_role
  );
begin
  if request_role in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.subscription_tier := 'free';
      new.subscription_expires_at := null;
    elsif tg_op = 'UPDATE' then
      new.subscription_tier := old.subscription_tier;
      new.subscription_expires_at := old.subscription_expires_at;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.protect_profile_subscription_fields() from public;
revoke all on function private.protect_profile_subscription_fields() from anon;
revoke all on function private.protect_profile_subscription_fields() from authenticated;

drop trigger if exists protect_profile_subscription_fields on public.profiles;

create trigger protect_profile_subscription_fields
  before insert or update of subscription_tier, subscription_expires_at
  on public.profiles
  for each row
  execute function private.protect_profile_subscription_fields();

revoke update on table public.profiles from anon;
revoke update on table public.profiles from authenticated;

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

create index if not exists photocards_user_status_idx
  on public.photocards (user_id, status);

create or replace function private.enforce_photocard_plan_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tracked_count integer;
begin
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'Cannot change photocard owner'
      using errcode = '42501';
  end if;

  if new.status not in ('owned', 'on_the_way') then
    return new;
  end if;

  if private.is_effective_pro(new.user_id) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('pocadex_plan_limit'), hashtext(new.user_id::text));

  select count(*)
  into tracked_count
  from public.photocards
  where user_id = new.user_id
    and status in ('owned', 'on_the_way')
    and (tg_op = 'INSERT' or id <> new.id);

  if tracked_count >= 200 then
    raise exception 'Free plan limit reached: 200 owned or on-the-way cards'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_photocard_plan_limits() from public;
revoke all on function private.enforce_photocard_plan_limits() from anon;
revoke all on function private.enforce_photocard_plan_limits() from authenticated;

drop trigger if exists enforce_photocard_plan_limits on public.photocards;

create trigger enforce_photocard_plan_limits
  before insert or update of status, user_id
  on public.photocards
  for each row
  execute function private.enforce_photocard_plan_limits();
