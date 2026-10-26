create table public.auth_reauth_events(user_id uuid primary key references auth.users on delete cascade,created_at timestamptz not null default now());
alter table public.auth_reauth_events enable row level security;
revoke all on public.auth_reauth_events from anon,authenticated;
create function public.server_rate(u uuid,a text,lim int) returns void language plpgsql security definer set search_path=public as $$ declare n int; begin
insert into rate_limits values(u,a,date_trunc('minute',now()),1) on conflict(user_id,action,bucket) do update set hits=rate_limits.hits+1 returning hits into n;
if n>lim then raise exception 'rateLimited';end if;end $$;
create function public.admin_action(actor uuid,act text,target uuid,reason text,flag_key text,enabled boolean) returns jsonb language plpgsql security definer set search_path=public as $$ begin
if not exists(select 1 from user_roles where user_id=actor and (role='admin' or act='moderate')) then raise exception 'notAllowed';end if;
if act='moderate' then update videos set status='removed' where id=target;insert into moderation_actions(actor_id,target_id,action,reason) values(actor,target,act,reason);
elsif act='restrict' then insert into account_restrictions values(target,null,reason) on conflict(user_id) do update set reason=excluded.reason,until_at=null;
elsif act='flag' then if flag_key in ('live','purchases','payouts') then raise exception 'notConfigured';end if;update feature_flags set enabled=admin_action.enabled where key=flag_key;
else raise exception 'invalidInput';end if;
insert into audit_logs(actor_id,action,details) values(actor,act,jsonb_build_object('target',target,'reason',reason,'flag',flag_key));return '{"ok":true}'::jsonb;end $$;
revoke all on function public.server_rate(uuid,text,int),public.admin_action(uuid,text,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.server_rate(uuid,text,int),public.admin_action(uuid,text,uuid,text,text,boolean) to service_role;
