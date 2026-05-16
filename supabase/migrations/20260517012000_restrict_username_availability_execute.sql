revoke all on function public.is_username_available(text) from public;
revoke all on function public.is_username_available(text) from anon;
grant execute on function public.is_username_available(text) to authenticated;
