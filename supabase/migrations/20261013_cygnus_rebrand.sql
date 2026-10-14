-- CYGNUS rebrand: run on an existing database before deploying the frontend.
-- Preserves department numbers, user UUIDs, accounts, approvals and registrations.
begin;
lock table public.profiles in share row exclusive mode;

create table if not exists public.member_id_counters (
  department_code text primary key check (department_code in ('EC','ME','CS','EE','CE','BT','AI','RB','OT')),
  last_number bigint not null check (last_number > 0)
);
alter table public.member_id_counters drop constraint if exists member_id_counters_department_code_check;
alter table public.member_id_counters add constraint member_id_counters_department_code_check check (department_code in ('EC','ME','CS','EE','CE','BT','AI','RB','OT'));
lock table public.member_id_counters in share row exclusive mode;
alter table public.member_id_counters enable row level security;
revoke all on public.member_id_counters from public,anon,authenticated;

create or replace function public.department_code(department_name text)
returns text language sql immutable set search_path = '' as $$
  select case regexp_replace(lower(coalesce(department_name,'')), '[^a-z0-9]', '', 'g')
    when 'ec' then 'EC' when 'ece' then 'EC' when 'electronics' then 'EC'
    when 'electronicsandcommunication' then 'EC' when 'electronicsandcommunicationengineering' then 'EC'
    when 'electronicandcommunicationengineering' then 'EC' when 'electronicscommunicationengineering' then 'EC'
    when 'me' then 'ME' when 'mechanical' then 'ME' when 'mechanicalengineering' then 'ME'
    when 'cs' then 'CS' when 'cse' then 'CS' when 'computerscience' then 'CS'
    when 'computerscienceengineering' then 'CS' when 'computerscienceandengineering' then 'CS'
    when 'ee' then 'EE' when 'eee' then 'EE' when 'electrical' then 'EE'
    when 'electricalengineering' then 'EE' when 'electricalandelectronicsengineering' then 'EE'
    when 'civil' then 'CE' when 'ce' then 'CE' when 'civilengineering' then 'CE'
    when 'biotech' then 'BT' when 'biotechnology' then 'BT' when 'bt' then 'BT'
    when 'aiml' then 'AI' when 'artificialintelligence' then 'AI' when 'ai' then 'AI'
    when 'robotics' then 'RB' when 'rb' then 'RB'
    else 'OT'
  end;
$$;

create or replace function public.allocate_member_id(department_name text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  code text := public.department_code(department_name);
  next_number bigint;
  candidate text;
begin
  loop
    -- Atomic increment serializes approvals within a department.
    insert into public.member_id_counters(department_code,last_number) values(code,1)
      on conflict(department_code) do update
      set last_number=public.member_id_counters.last_number+1
      returning last_number into next_number;
    candidate := 'CYG-' || code || '-' || lpad(next_number::text,greatest(3,length(next_number::text)),'0');
    if not exists(select 1 from public.profiles where member_id=candidate) then return candidate; end if;
  end loop;
end;
$$;
revoke execute on function public.allocate_member_id(text) from public,anon,authenticated;

create or replace function public.review_member(target uuid, decision text)
returns void language plpgsql security definer set search_path = '' as $$
declare applicant public.profiles%rowtype;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if decision is null or decision not in ('approved','rejected','suspended') then raise exception 'Invalid decision'; end if;
  if target = auth.uid() then raise exception 'You cannot review your own account'; end if;
  select * into applicant from public.profiles
    where id=target and role='member' and submitted_at is not null for update;
  if not found then raise exception 'Application not found'; end if;
  update public.profiles set status=decision, reviewed_at=now(),
    member_id=case when decision='approved'
      then coalesce(applicant.member_id,public.allocate_member_id(applicant.department))
      else applicant.member_id end
    where id=target;
end;
$$;
revoke execute on function public.review_member(uuid,text) from public,anon;
grant execute on function public.review_member(uuid,text) to authenticated;

-- Refuse an ambiguous conversion instead of silently reassigning an issued number.
do $$
begin
  if exists (
    select 1 from public.profiles old_id join public.profiles new_id
      on new_id.member_id = 'CYG-' || substring(old_id.member_id from 5)
    where old_id.member_id ~ '^SAC-(EC|ME|CS|EE|CE|BT|AI|RB|OT)-[0-9]{3,}$'
  ) then
    raise exception 'CYGNUS rename stopped: a SAC department ID conflicts with an existing CYG ID. Resolve the duplicate before retrying.';
  end if;
end; $$;
update public.profiles set member_id = 'CYG-' || substring(member_id from 5)
where member_id ~ '^SAC-(EC|ME|CS|EE|CE|BT|AI|RB|OT)-[0-9]{3,}$';

-- Start after any department numbers that have already been issued.
insert into public.member_id_counters(department_code,last_number)
select split_part(member_id,'-',2),max(split_part(member_id,'-',3)::bigint)
from public.profiles
where member_id ~ '^CYG-(EC|ME|CS|EE|CE|BT|AI|RB|OT)-[0-9]{3,}$'
group by split_part(member_id,'-',2)
having max(split_part(member_id,'-',3)::bigint)>0
on conflict(department_code) do update
set last_number=greatest(public.member_id_counters.last_number,excluded.last_number);

-- Keep user UUIDs, passwords, approval status, and registrations intact.
do $$
declare applicant record;
begin
  for applicant in
    select id,department from public.profiles
    where (member_id is not null and member_id !~ '^CYG-(EC|ME|CS|EE|CE|BT|AI|RB|OT)-[0-9]{3,}$')
       or (member_id is null and role='member' and status='approved')
    order by created_at,id
  loop
    update public.profiles set member_id=public.allocate_member_id(applicant.department) where id=applicant.id;
  end loop;
end;
$$;
-- Only club-authored content is rebranded. Profile names and application text stay intact.
-- Temporary helpers disappear with the SQL session and create no new public RPCs.
create or replace function pg_temp.cygnus_words(value text)
returns text language sql immutable as $$
  select replace(replace(replace(
    regexp_replace(regexp_replace(regexp_replace(value,
      'Sensing[[:space:]]*(and|&amp;|&)[[:space:]]*Automation Club', 'CYGNUS', 'gi'),
      '\mSAC-((EC|ME|CS|EE|CE|BT|AI|RB|OT)-[0-9]{3,})\M', 'CYG-\1', 'g'),
      '\mSAC\M', 'CYGNUS', 'g'),
    'CYGNUS (CYGNUS)', 'CYGNUS'), 'CYGNUS / CYGNUS', 'CYGNUS / THE TECHNICAL CLUB'),
    'Who can join the CYGNUS?', 'Who can join CYGNUS?');
$$;

create or replace function pg_temp.cygnus_text(value text)
returns text language plpgsql immutable as $$
declare
  remaining text := value;
  result text := '';
  token text[];
  offset_at integer;
begin
  -- Keep links and contact addresses exactly as configured, even inside prose.
  for token in select regexp_matches(value, '(https?://[^[:space:]<>"'']+|mailto:[^[:space:]<>"'']+|[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,})', 'gi')
  loop
    offset_at := strpos(remaining, token[1]);
    result := result || pg_temp.cygnus_words(left(remaining,offset_at-1)) || token[1];
    remaining := substring(remaining from offset_at+length(token[1]));
  end loop;
  return result || pg_temp.cygnus_words(remaining);
end; $$;

create or replace function pg_temp.cygnus_json(value jsonb)
returns jsonb language plpgsql immutable as $$
declare result jsonb;
begin
  case jsonb_typeof(value)
    when 'string' then return to_jsonb(pg_temp.cygnus_text(value #>> '{}'));
    when 'array' then
      select coalesce(jsonb_agg(pg_temp.cygnus_json(element) order by position),'[]'::jsonb)
        into result from jsonb_array_elements(value) with ordinality as items(element,position);
      return result;
    when 'object' then
      select coalesce(jsonb_object_agg(key,case
        when key ~* '(url|image|slug|path|id)$' then element
        else pg_temp.cygnus_json(element) end),'{}'::jsonb)
        into result from jsonb_each(value) as items(key,element);
      return result;
    else return value;
  end case;
end; $$;

update public.site_content set value=pg_temp.cygnus_text(value)
where value is distinct from pg_temp.cygnus_text(value)
  and value !~ '^(https?://|/|about-assets/|showcase-assets/)';

update public.content set
  title=pg_temp.cygnus_text(title), summary=pg_temp.cygnus_text(summary),
  image_alt=pg_temp.cygnus_text(image_alt),
  tags=array(select pg_temp.cygnus_text(tag) from unnest(tags) as tag),
  data=pg_temp.cygnus_json(data)
where title is distinct from pg_temp.cygnus_text(title)
   or summary is distinct from pg_temp.cygnus_text(summary)
   or image_alt is distinct from pg_temp.cygnus_text(image_alt)
   or tags is distinct from array(select pg_temp.cygnus_text(tag) from unnest(tags) as tag)
   or data is distinct from pg_temp.cygnus_json(data);

alter table public.content_details add column if not exists data jsonb not null default '{}'::jsonb;
update public.content_details set body=pg_temp.cygnus_text(body),data=pg_temp.cygnus_json(data)
where body is distinct from pg_temp.cygnus_text(body) or data is distinct from pg_temp.cygnus_json(data);

commit;
