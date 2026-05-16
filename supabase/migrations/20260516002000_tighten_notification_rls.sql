drop policy if exists "Followers can create follow notifications" on public.notifications;
drop policy if exists "Users can mark their notifications read" on public.notifications;

revoke insert on table public.notifications from authenticated;
revoke update on table public.notifications from authenticated;

grant update (read) on table public.notifications to authenticated;

create policy "Users can mark their notifications read"
  on public.notifications
  for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
    and read = true
  );
