-- Mobile contacts and locally generated member QR cards. Safe to run again.
-- Existing mobile numbers are unknown: leave them NULL until members save them.
begin;
alter table public.profiles add column if not exists mobile_number text;
alter table public.profiles drop constraint if exists profiles_mobile_number_check;
alter table public.profiles add constraint profiles_mobile_number_check
  check (mobile_number is null or mobile_number ~ '^\+91[0-9]{10}$');

create or replace function public.normalize_mobile_number(value text)
returns text language plpgsql immutable set search_path = '' as $$
declare compact text := regexp_replace(coalesce(value,''),'[[:space:]]','','g');
begin
  if compact = '' then return null; end if;
  if compact ~ '^[0-9]{10}$' then return '+91' || compact; end if;
  if compact ~ '^91[0-9]{10}$' then return '+' || compact; end if;
  if compact ~ '^\+91[0-9]{10}$' then return compact; end if;
  raise exception 'Enter a valid 10-digit Indian mobile number';
end; $$;
revoke execute on function public.normalize_mobile_number(text) from public,anon,authenticated;

-- Remove old RPC overloads so PostgREST resolves named arguments unambiguously.
drop function if exists public.save_profile(text,text);
drop function if exists public.submit_application(text,text,text,text,text[],text);
drop function if exists public.submit_application(text,text,text,text,text[],text,text);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  chosen_pronouns text := coalesce(new.raw_user_meta_data->>'pronouns',case new.raw_user_meta_data->>'avatar' when 'girl' then 'she/her' when 'boy' then 'he/him' end);
  phone text := public.normalize_mobile_number(new.raw_user_meta_data->>'mobile_number');
  chosen_emoji text := new.raw_user_meta_data->>'avatar';
begin
  if length(trim(coalesce(new.raw_user_meta_data->>'motivation',''))) > 0 and exists (select 1 from public.site_content where id='applications_open' and value='false') then raise exception 'Club applications are currently closed'; end if;
  if length(trim(coalesce(new.raw_user_meta_data->>'motivation',''))) > 0 and phone is null then raise exception 'Enter a valid 10-digit Indian mobile number'; end if;
  if chosen_pronouns is not null and chosen_pronouns not in ('he/him','she/her') then raise exception 'Choose valid pronouns'; end if;
  if length(trim(coalesce(new.raw_user_meta_data->>'motivation',''))) > 0 and chosen_pronouns is null then raise exception 'Choose your pronouns'; end if;
  if chosen_emoji is null or chosen_emoji not in ('robot','rocket','satellite','gear','brain','battery','microscope','bulb') then chosen_emoji := 'robot'; end if;
  insert into public.profiles (id,email,mobile_number,name,avatar,pronouns,department,study_year,interests,motivation,submitted_at)
  values (new.id, coalesce(new.email,''),phone, left(coalesce(new.raw_user_meta_data->>'name',''),120),chosen_emoji,chosen_pronouns,
    left(coalesce(new.raw_user_meta_data->>'department',''),100), left(coalesce(new.raw_user_meta_data->>'study_year',''),20),
    case when jsonb_typeof(new.raw_user_meta_data->'interests')='array' then array(select jsonb_array_elements_text(new.raw_user_meta_data->'interests')) else '{}' end,
    left(coalesce(new.raw_user_meta_data->>'motivation',''),4000),
    case when length(trim(coalesce(new.raw_user_meta_data->>'motivation',''))) > 0 and new.email_confirmed_at is not null then now() end);
  return new;
end; $$;

create or replace function public.save_profile(display_name text, emoji text, contact_number text default null) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if length(trim(coalesce(display_name,''))) not between 1 and 120 or coalesce(emoji,'') not in ('robot','rocket','satellite','gear','brain','battery','microscope','bulb','technologist') then raise exception 'Invalid profile'; end if;
  if not public.is_email_confirmed() then raise exception 'Confirm your email before updating your profile'; end if;
  if contact_number is not null and public.normalize_mobile_number(contact_number) is null then raise exception 'Enter a valid 10-digit Indian mobile number'; end if;
  update public.profiles set mobile_number=case when contact_number is null then mobile_number else public.normalize_mobile_number(contact_number) end,name=trim(display_name),avatar=case when role='admin' then 'technologist' else emoji end where id=auth.uid();
end; $$;

create or replace function public.submit_application(display_name text, emoji text, department_name text, year_value text, interest_values text[], reason text, member_pronouns text default null, contact_number text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare applicant public.profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if not public.is_email_confirmed() then raise exception 'Confirm your email before submitting an application'; end if;
  select * into applicant from public.profiles where id=auth.uid() for update;
  if not found or applicant.status<>'pending' or applicant.submitted_at is not null then raise exception 'An application has already been submitted'; end if;
  if applicant.pronouns is not null and member_pronouns is not null and applicant.pronouns<>member_pronouns then raise exception 'Pronouns cannot be changed after selection'; end if;
  if length(trim(coalesce(display_name,''))) not between 1 and 120
     or coalesce(emoji,'') not in ('robot','rocket','satellite','gear','brain','battery','microscope','bulb')
     or coalesce(applicant.pronouns,member_pronouns,'') not in ('he/him','she/her')
     or length(trim(coalesce(reason,''))) not between 1 and 4000
     or length(trim(coalesce(department_name,''))) not between 1 and 100
     or length(trim(coalesce(year_value,''))) not between 1 and 20 then raise exception 'Complete all application fields'; end if;
  if exists (select 1 from public.site_content where id='applications_open' and value='false') then raise exception 'Club applications are currently closed'; end if;
  if public.normalize_mobile_number(contact_number) is null then raise exception 'Enter a valid 10-digit Indian mobile number'; end if;
  update public.profiles set mobile_number=public.normalize_mobile_number(contact_number),name=trim(display_name),avatar=emoji,pronouns=coalesce(applicant.pronouns,member_pronouns),department=department_name,study_year=year_value,
    interests=coalesce(interest_values,'{}'),motivation=reason,submitted_at=now() where id=auth.uid();
end; $$;

revoke execute on function public.handle_new_user() from public,anon,authenticated;
revoke execute on function public.save_profile(text,text,text),public.submit_application(text,text,text,text,text[],text,text,text) from public,anon;
grant execute on function public.save_profile(text,text,text),public.submit_application(text,text,text,text,text[],text,text,text) to authenticated;
-- Existing profile_read RLS keeps contacts visible only to the owner and admins.
-- No public profile policy, QR table, Storage bucket, or Edge Function is needed.
notify pgrst, 'reload schema';
commit;
