-- Run this once in Supabase SQL Editor to enable Admin Portal account creation
-- for an existing administrator. Public signups still default to Librarian.
create or replace function public.admin_promote_staff_to_admin(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_library_admin() then
    raise exception 'Administrator access is required';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Choose a different staff account';
  end if;
  update public.users set role = 'admin' where id = p_user_id and role = 'librarian';
  if not found then
    raise exception 'The new staff profile was not found or is already an administrator';
  end if;
end; $$;

revoke all on function public.admin_promote_staff_to_admin(uuid) from public, anon;
grant execute on function public.admin_promote_staff_to_admin(uuid) to authenticated;
