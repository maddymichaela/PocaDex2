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

drop policy if exists follows_insert_own_active_target on public.follows;

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
