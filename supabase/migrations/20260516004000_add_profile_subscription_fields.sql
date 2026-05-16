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
