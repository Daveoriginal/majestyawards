-- HMA ADDITIONAL SUPABASE SETUP
-- Run this AFTER your first registration-table SQL script.
-- This adds a public capacity count and secure admin-only management functions.

-- Public count exposes only the total number of registrations, not attendee details.
create or replace function public.public_registration_count()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::integer from public.attendees;
$$;

revoke all on function public.public_registration_count() from public;
grant execute on function public.public_registration_count() to anon, authenticated;

-- A private allow-list of administrator accounts.
create table if not exists public.hma_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.hma_admins enable row level security;
revoke all on public.hma_admins from anon, authenticated;

-- Internal helper: true only for signed-in users explicitly added to hma_admins.
create or replace function public.is_hma_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hma_admins where user_id = auth.uid()
  );
$$;

revoke all on function public.is_hma_admin() from public, anon;
grant execute on function public.is_hma_admin() to authenticated;

create or replace function public.admin_hma_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_checked integer;
begin
  if not public.is_hma_admin() then
    raise exception 'NOT_AUTHORISED';
  end if;

  select count(*)::integer, count(*) filter (where checked_in)::integer
    into v_total, v_checked
  from public.attendees;

  return json_build_object(
    'total', v_total,
    'remaining', greatest(0, 260 - v_total),
    'checked_in', v_checked
  );
end;
$$;

create or replace function public.admin_hma_attendees()
returns table (
  id uuid,
  registration_code text,
  full_name text,
  phone text,
  email text,
  age integer,
  department text,
  checked_in boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_hma_admin() then
    raise exception 'NOT_AUTHORISED';
  end if;

  return query
  select a.id, a.registration_code, a.full_name, a.phone, a.email,
         a.age, a.department, a.checked_in, a.created_at
  from public.attendees a
  order by a.created_at desc;
end;
$$;

drop function if exists public.admin_hma_checkin(uuid);

create or replace function public.admin_hma_delete_attendee(p_attendee_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_hma_admin() then
    raise exception 'NOT_AUTHORISED';
  end if;

  delete from public.attendees where id = p_attendee_id;

  if not found then
    raise exception 'ATTENDEE_NOT_FOUND';
  end if;

  return true;
end;
$$;

revoke all on function public.admin_hma_stats() from public, anon;
revoke all on function public.admin_hma_attendees() from public, anon;
revoke all on function public.admin_hma_delete_attendee(uuid) from public, anon;

grant execute on function public.admin_hma_stats() to authenticated;
grant execute on function public.admin_hma_attendees() to authenticated;
grant execute on function public.admin_hma_delete_attendee(uuid) to authenticated;

-- IMPORTANT: After creating the admin user in Supabase Authentication,
-- copy that user's UUID and run this separately:
-- insert into public.hma_admins (user_id) values ('PASTE-ADMIN-USER-UUID-HERE');


create or replace function public.admin_hma_checkin_code(p_registration_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_checked boolean;
begin
  if not public.is_hma_admin() then
    raise exception 'NOT_AUTHORISED';
  end if;

  select id, checked_in into v_id, v_checked
  from public.attendees
  where registration_code = upper(trim(p_registration_code))
  for update;

  if v_id is null then
    raise exception 'REGISTRATION_CODE_NOT_FOUND';
  end if;

  if not v_checked then
    update public.attendees set checked_in = true where id = v_id;
  end if;

  return json_build_object(
    'registration_code', upper(trim(p_registration_code)),
    'already_checked_in', coalesce(v_checked, false)
  );
end;
$$;

revoke all on function public.admin_hma_checkin_code(text) from public, anon;
grant execute on function public.admin_hma_checkin_code(text) to authenticated;
