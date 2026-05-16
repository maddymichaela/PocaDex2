create schema if not exists private;

create or replace function private.create_follow_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, actor_user_id, type, read)
  values (new.following_id, new.follower_id, 'follow', false);

  return new;
end;
$$;

drop trigger if exists follows_create_notification on public.follows;

create trigger follows_create_notification
  after insert on public.follows
  for each row
  when (new.follower_id <> new.following_id)
  execute function private.create_follow_notification();
