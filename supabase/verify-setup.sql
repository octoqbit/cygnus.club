-- Read-only: run in Supabase SQL Editor. Does not return member information.
-- Every row should report PASS on a fully upgraded project.
with required_tables(name) as (
  values ('profiles'),('member_id_counters'),('content'),('content_details'),
         ('site_content'),('registrations'),('memories')
), required_columns(table_name,column_name) as (
  values ('profiles','mobile_number'),('profiles','qr_token'),('profiles','pronouns'),('profiles','member_id'),
         ('profiles','submitted_at'),('content_details','data'),('memories','sort_order')
), required_functions(signature) as (
  values ('public.is_email_confirmed()'),('public.is_admin()'),('public.is_approved()'),
         ('public.handle_new_user()'),('public.handle_user_update()'),
         ('public.normalize_mobile_number(text)'),('public.allocate_member_id(text)'),
         ('public.is_core_member()'),('public.set_core_member(uuid,boolean)'),('public.verify_member_qr(text,uuid)'),
         ('public.save_profile(text,text,text)'),
         ('public.submit_application(text,text,text,text,text[],text,text,text)'),
         ('public.review_member(uuid,text)'),('public.save_content(jsonb,text)')
), private_rpcs(signature) as (
  values ('public.save_profile(text,text,text)'),
         ('public.submit_application(text,text,text,text,text[],text,text,text)'),
         ('public.review_member(uuid,text)'),('public.save_content(jsonb,text)')
), required_triggers(table_schema,table_name,trigger_name) as (
  values ('auth','users','on_auth_user_created'),('auth','users','on_auth_user_updated'),
         ('public','profiles','profile_choices_locked'),('public','content','project_details_private')
), required_policies(table_schema,table_name,policy_name) as (
  values ('public','profiles','profile_read'),
         ('public','content','content_read'),('public','content','content_manage'),
         ('public','content_details','details_read'),('public','content_details','details_manage'),
         ('public','site_content','site_read'),('public','site_content','site_manage'),
         ('public','registrations','registrations_read'),('public','registrations','registrations_create'),('public','registrations','registrations_cancel'),
         ('public','memories','memories_read'),('public','memories','memories_manage'),
         ('storage','objects','image_read'),('storage','objects','image_create'),('storage','objects','image_delete')
), checks as (
  select 'Table + RLS: '||name as item,
         exists(select 1 from pg_class where oid=to_regclass('public.'||name) and relrowsecurity) as ok
  from required_tables
  union all
  select 'Column: '||r.table_name||'.'||r.column_name,
         exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=r.table_name and c.column_name=r.column_name)
  from required_columns r
  union all
  select 'Function: '||signature,to_regprocedure(signature) is not null from required_functions
  union all
  select 'RPC grants: '||signature,
         coalesce(has_function_privilege('authenticated',to_regprocedure(signature),'EXECUTE'),false)
         and not coalesce(has_function_privilege('anon',to_regprocedure(signature),'EXECUTE'),true)
  from private_rpcs
  union all
  select 'Trigger: '||table_schema||'.'||table_name||'.'||trigger_name,
         exists(select 1 from pg_trigger where tgrelid=to_regclass(table_schema||'.'||table_name) and tgname=trigger_name and tgenabled<>'D')
  from required_triggers
  union all
  select 'Policy: '||table_schema||'.'||table_name||'.'||policy_name,
         exists(select 1 from pg_policies where schemaname=table_schema and tablename=table_name and policyname=policy_name)
  from required_policies
  union all
  select 'Mobile number constraint',exists(select 1 from pg_constraint where conrelid=to_regclass('public.profiles') and conname='profiles_mobile_number_check' and convalidated)
  union all
  select 'Profiles are private',to_regclass('public.profiles') is not null and not coalesce(has_table_privilege('anon',to_regclass('public.profiles'),'SELECT'),true)
  union all
  select 'Profile policy requires email confirmation',exists(select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profile_read' and qual like '%is_email_confirmed%')
  union all
  select 'No obsolete profile RPC',to_regprocedure('public.save_profile(text,text)') is null
  union all
  select 'No obsolete application RPCs',to_regprocedure('public.submit_application(text,text,text,text,text[],text)') is null and to_regprocedure('public.submit_application(text,text,text,text,text[],text,text)') is null
  union all
  select 'Admissions switch enforced by signup and application RPC',
    coalesce((select prosrc like '%applications_open%' from pg_proc where oid=to_regprocedure('public.handle_new_user()')),false)
    and coalesce((select prosrc like '%applications_open%' from pg_proc where oid=to_regprocedure('public.submit_application(text,text,text,text,text[],text,text,text)')),false)
  union all
  select 'Image upload bucket',exists(select 1 from storage.buckets where id='content-images' and public and file_size_limit=5242880)
  union all
  select 'Image upload policy',exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='image_create' and with_check like '%is_admin%')
)
select item,case when ok then 'PASS' else 'MISSING / CHECK' end as result
from checks order by ok,item;
