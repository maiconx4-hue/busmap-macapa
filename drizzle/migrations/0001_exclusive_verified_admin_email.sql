create or replace function public.admin_email_eligible(_email text, _confirmed_at timestamptz)
returns boolean language sql immutable set search_path = public
as $$ select _confirmed_at is not null and coalesce(lower(_email) = 'maicon.x4@gmail.com', false) $$;
revoke all on function public.admin_email_eligible(text, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_email_eligible(text, timestamptz) to service_role;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.admin_users a join auth.users u on u.id = a.user_id
  where a.user_id = auth.uid() and public.admin_email_eligible(u.email, u.email_confirmed_at)
) $$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.sync_verified_admin_email()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if public.admin_email_eligible(new.email, new.email_confirmed_at) then
    insert into public.admin_users(user_id) values(new.id) on conflict(user_id) do nothing;
  else
    delete from public.admin_users where user_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.sync_verified_admin_email() from public, anon, authenticated;
create trigger sync_admin_email_on_signup after insert on auth.users
for each row execute function public.sync_verified_admin_email();
create trigger sync_admin_email_on_change after update of email, email_confirmed_at on auth.users
for each row execute function public.sync_verified_admin_email();