-- Require email confirmation before any member portal data or action is available.
create or replace function public.is_email_confirmed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users
    where id = auth.uid()
      and email_confirmed_at is not null
  );
$$;

revoke execute on function public.is_email_confirmed() from public, anon;
grant execute on function public.is_email_confirmed() to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_email_confirmed()
    and exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
        and status = 'approved'
    );
$$;

create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_email_confirmed()
    and exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and status = 'approved'
    );
$$;

drop policy if exists profile_read on public.profiles;
create policy profile_read on public.profiles
for select to authenticated
using (public.is_email_confirmed() and (id = auth.uid() or public.is_admin()));

create or replace function public.submit_application(
  display_name text,
  emoji text,
  department_name text,
  year_value text,
  interest_values text[],
  reason text,
  member_pronouns text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare applicant public.profiles%rowtype;
begin
  if not public.is_email_confirmed() then
    raise exception 'Confirm your email before submitting an application';
  end if;
  select * into applicant from public.profiles where id=auth.uid() for update;
  if not found or applicant.status<>'pending' or applicant.submitted_at is not null then
    raise exception 'An application has already been submitted';
  end if;
  if applicant.pronouns is not null and member_pronouns is not null and applicant.pronouns<>member_pronouns then
    raise exception 'Pronouns cannot be changed after selection';
  end if;
  if length(trim(coalesce(display_name,''))) not between 1 and 120
     or coalesce(emoji,'') not in ('robot','rocket','satellite','gear','brain','battery','microscope','bulb')
     or coalesce(applicant.pronouns,member_pronouns,'') not in ('he/him','she/her')
     or length(trim(coalesce(reason,''))) not between 1 and 4000
     or length(trim(coalesce(department_name,''))) not between 1 and 100
     or length(trim(coalesce(year_value,''))) not between 1 and 20 then
    raise exception 'Complete all application fields';
  end if;
  update public.profiles
  set name=trim(display_name),avatar=emoji,pronouns=coalesce(applicant.pronouns,member_pronouns),
      department=department_name,study_year=year_value,interests=coalesce(interest_values,'{}'),
      motivation=reason,submitted_at=now()
  where id=auth.uid();
end;
$$;
