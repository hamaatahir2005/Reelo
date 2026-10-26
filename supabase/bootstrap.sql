-- REELO: first-time setup for a NEW Supabase project only.
-- Run the WHOLE file once in Dashboard > SQL Editor as the project owner.
-- This is transactional: any failure rolls back all setup changes.
-- Do not re-run on an existing installation; use versioned migrations instead.
-- Never paste service-role keys, passwords or access tokens into this file.
begin;

-- 202610260001_initial.sql
-- Reelo: clients cannot choose roles, processing status, counts or moderation state.
create extension if not exists pgcrypto;
create table public.profiles(id uuid primary key references auth.users on delete cascade, username text not null unique check(username ~ '^[a-z0-9_]{3,24}$'), display_name text check(length(display_name)<=80), bio text check(length(bio)<=500), avatar_path text, is_private boolean not null default false, created_at timestamptz not null default now());
create table public.account_settings(user_id uuid primary key references public.profiles on delete cascade, locale text not null default 'en' check(locale in ('en','ar','ckb')), theme text not null default 'dark' check(theme in ('dark','light')), recommendations_since timestamptz not null default now());
create table public.user_roles(user_id uuid primary key references public.profiles on delete cascade, role text not null check(role in ('admin','moderator')));
create table public.user_blocks(blocker_id uuid references public.profiles on delete cascade, blocked_id uuid references public.profiles on delete cascade, created_at timestamptz default now(), primary key(blocker_id,blocked_id), check(blocker_id<>blocked_id));
create table public.user_mutes(user_id uuid references public.profiles on delete cascade, muted_id uuid references public.profiles on delete cascade, primary key(user_id,muted_id),check(user_id<>muted_id));
create table public.follows(follower_id uuid references public.profiles on delete cascade, following_id uuid references public.profiles on delete cascade, status text not null default 'pending' check(status in ('pending','accepted')), created_at timestamptz default now(), primary key(follower_id,following_id), check(follower_id<>following_id));
create table public.videos(id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.profiles on delete cascade,caption text not null default '' check(length(caption)<=2200),visibility text not null default 'public' check(visibility in ('public','private','followers')),status text not null default 'uploading' check(status in ('uploading','processing','ready','failed','removed')),created_at timestamptz not null default now(),duration numeric check(duration>0 and duration<=90),width int,height int,like_count int not null default 0,comment_count int not null default 0,view_count int not null default 0);
create table public.video_assets(id uuid primary key default gen_random_uuid(),video_id uuid not null references public.videos on delete cascade,storage_path text not null unique,kind text not null check(kind in ('original','thumbnail','hls')),verified boolean not null default false,bytes bigint,mime text);
create table public.video_processing_jobs(id uuid primary key default gen_random_uuid(),video_id uuid not null references public.videos on delete cascade,status text not null default 'pending' check(status in ('pending','processing','completed','failed')),provider text not null default 'raw-private',attempts int not null default 0,error text,created_at timestamptz default now());
create table public.likes(user_id uuid references public.profiles on delete cascade,video_id uuid references public.videos on delete cascade,created_at timestamptz default now(),primary key(user_id,video_id));
create table public.comments(id uuid primary key default gen_random_uuid(),video_id uuid not null references public.videos on delete cascade,user_id uuid not null references public.profiles on delete cascade,parent_id uuid references public.comments on delete cascade,body text not null check(length(trim(body)) between 1 and 2000),created_at timestamptz not null default now());
create table public.comment_likes(user_id uuid references public.profiles on delete cascade,comment_id uuid references public.comments on delete cascade,primary key(user_id,comment_id));
create table public.saved_videos(user_id uuid references public.profiles on delete cascade,video_id uuid references public.videos on delete cascade,created_at timestamptz default now(),primary key(user_id,video_id));
create table public.hashtags(id bigint generated always as identity primary key,name text not null unique check(length(name)<=100));
create table public.video_hashtags(video_id uuid references public.videos on delete cascade,hashtag_id bigint references public.hashtags on delete cascade,primary key(video_id,hashtag_id));
create table public.watch_events(user_id uuid references public.profiles on delete cascade,video_id uuid references public.videos on delete cascade,completion numeric not null check(completion between 0 and 1),created_at timestamptz not null default now(),primary key(user_id,video_id));
create table public.conversations(id uuid primary key default gen_random_uuid(),created_at timestamptz default now());
create table public.conversation_participants(conversation_id uuid references public.conversations on delete cascade,user_id uuid references public.profiles on delete cascade,last_read_at timestamptz,primary key(conversation_id,user_id));
create table public.messages(id uuid primary key default gen_random_uuid(),conversation_id uuid not null references public.conversations on delete cascade,sender_id uuid not null references public.profiles on delete cascade,body text not null check(length(trim(body)) between 1 and 4000),created_at timestamptz default now());
create table public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,actor_id uuid references public.profiles on delete cascade,kind text not null,payload jsonb not null default '{}',read_at timestamptz,created_at timestamptz default now());
create table public.push_tokens(user_id uuid references public.profiles on delete cascade,token text not null unique check(token ~ '^ExponentPushToken\[|^ExpoPushToken\['),platform text check(platform in ('ios','android')),primary key(user_id,token));
create table public.reports(id uuid primary key default gen_random_uuid(),reporter_id uuid not null references public.profiles on delete cascade,target_id uuid not null,kind text not null check(kind in ('video','user','comment','message')),reason text not null check(reason in ('spam','harassment','violence','sexual','copyright','other')),details text check(length(details)<=2000),status text not null default 'open' check(status in ('open','resolved','dismissed')),created_at timestamptz default now());
create table public.moderation_actions(id uuid primary key default gen_random_uuid(),actor_id uuid references public.profiles on delete set null,target_id uuid not null,action text not null,reason text not null,created_at timestamptz default now());
create table public.appeals(id uuid primary key default gen_random_uuid(),user_id uuid references public.profiles on delete cascade,video_id uuid references public.videos on delete cascade,reason text not null check(length(reason) between 1 and 2000),status text not null default 'open',created_at timestamptz default now());
create table public.audit_logs(id bigint generated always as identity primary key,actor_id uuid references public.profiles on delete set null,action text not null,details jsonb not null default '{}',created_at timestamptz default now());
create table public.app_settings(key text primary key,value jsonb not null);
create table public.feature_flags(key text primary key,enabled boolean not null default false);
create table public.account_restrictions(user_id uuid primary key references public.profiles on delete cascade,until_at timestamptz,reason text not null);
create table public.rate_limits(user_id uuid not null,action text not null,bucket timestamptz not null,hits int not null default 1,primary key(user_id,action,bucket));
insert into public.feature_flags values ('messaging',false),('live',false),('purchases',false),('payouts',false);
insert into public.app_settings values ('ranking','{"completion":2,"likes":0.25,"follow":1.4,"freshness":2,"repeatPenalty":5}');
create function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from user_roles where user_id=auth.uid()); $$;
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from user_roles where user_id=auth.uid() and role='admin'); $$;
create function public.active_user() returns boolean language sql stable security definer set search_path=public as $$ select auth.uid() is not null and not exists(select 1 from account_restrictions where user_id=auth.uid() and (until_at is null or until_at>now())); $$;
create function public.blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from user_blocks where (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a)); $$;
create function public.can_watch(v uuid) returns boolean language sql stable security definer set search_path=public as $$
select exists(select 1 from videos v1 join profiles p on p.id=v1.creator_id where v1.id=v and active_user() and not blocked(auth.uid(),p.id) and (p.id=auth.uid() or (v1.status='ready' and v1.visibility<>'private' and (not p.is_private and v1.visibility='public' or exists(select 1 from follows where follower_id=auth.uid() and following_id=p.id and status='accepted')))));
$$;
create function public.in_conversation(c uuid) returns boolean language sql stable security definer set search_path=public as $$ select active_user() and exists(select 1 from conversation_participants where conversation_id=c and user_id=auth.uid()) and not exists(select 1 from conversation_participants where conversation_id=c and blocked(auth.uid(),user_id)); $$;
create function public.consume_rate(a text,lim int) returns void language plpgsql security definer set search_path=public as $$
declare n int; begin
if not active_user() then raise exception 'accountRestricted'; end if;
insert into rate_limits values(auth.uid(),a,date_trunc('minute',now()),1) on conflict(user_id,action,bucket) do update set hits=rate_limits.hits+1 returning hits into n;
if n>lim then raise exception 'rateLimited'; end if; end $$;
revoke all on function public.consume_rate(text,int) from public,anon,authenticated;
create function public.bootstrap_profile() returns trigger language plpgsql security definer set search_path=public as $$ begin
insert into profiles(id,username) values(new.id,'u_'||replace(new.id::text,'-',''));
insert into account_settings(user_id) values(new.id); return new; end $$;
-- Initial generated username must satisfy the 24-character username limit.
create or replace function public.bootstrap_profile() returns trigger language plpgsql security definer set search_path=public as $$ begin
insert into profiles(id,username) values(new.id,'u_'||substr(replace(new.id::text,'-',''),1,22));
insert into account_settings(user_id) values(new.id); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.bootstrap_profile();
alter table public.profiles enable row level security;
alter table public.account_settings enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_blocks enable row level security;
alter table public.user_mutes enable row level security;
alter table public.follows enable row level security;
alter table public.videos enable row level security;
alter table public.video_assets enable row level security;
alter table public.video_processing_jobs enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.saved_videos enable row level security;
alter table public.hashtags enable row level security;
alter table public.video_hashtags enable row level security;
alter table public.watch_events enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.appeals enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_settings enable row level security;
alter table public.feature_flags enable row level security;
alter table public.account_restrictions enable row level security;
alter table public.rate_limits enable row level security;

create policy profiles_read on profiles for select to authenticated using(active_user() and not blocked(auth.uid(),id));
create policy profiles_update on profiles for update to authenticated using(id=auth.uid() and active_user()) with check(id=auth.uid());
create policy settings_own on account_settings for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy roles_read on user_roles for select to authenticated using(user_id=auth.uid() or is_admin());
create policy blocks_own on user_blocks for all to authenticated using(blocker_id=auth.uid()) with check(blocker_id=auth.uid() and active_user());
create policy mutes_own on user_mutes for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and active_user());
create policy follows_read on follows for select to authenticated using(active_user() and (status='accepted' or auth.uid() in (follower_id,following_id)) and not blocked(auth.uid(),following_id));
create policy videos_read on videos for select to authenticated using(can_watch(id) or is_staff());
create policy assets_read on video_assets for select to authenticated using(can_watch(video_id) or is_staff());
create policy jobs_read on video_processing_jobs for select to authenticated using(exists(select 1 from videos where id=video_id and creator_id=auth.uid()) or is_staff());
create policy likes_read on likes for select to authenticated using(can_watch(video_id));
create policy likes_insert on likes for insert to authenticated with check(user_id=auth.uid() and can_watch(video_id));
create policy likes_delete on likes for delete to authenticated using(user_id=auth.uid());
create policy comments_read on comments for select to authenticated using(can_watch(video_id) and not blocked(auth.uid(),user_id));
create policy comments_insert on comments for insert to authenticated with check(user_id=auth.uid() and can_watch(video_id));
create policy comments_delete on comments for delete to authenticated using(user_id=auth.uid());
create policy comment_likes_own on comment_likes for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and exists(select 1 from comments where id=comment_id));
create policy saved_own on saved_videos for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and can_watch(video_id));
create policy hashtags_read on hashtags for select to authenticated using(true);
create policy video_hashtags_read on video_hashtags for select to authenticated using(can_watch(video_id));
create policy watch_own on watch_events for select to authenticated using(user_id=auth.uid());
create policy conversations_read on conversations for select to authenticated using(in_conversation(id));
create policy participants_read on conversation_participants for select to authenticated using(in_conversation(conversation_id));
create policy messages_read on messages for select to authenticated using(in_conversation(conversation_id));
create policy messages_insert on messages for insert to authenticated with check(sender_id=auth.uid() and in_conversation(conversation_id) and exists(select 1 from feature_flags where key='messaging' and enabled));
create policy notifications_read on notifications for select to authenticated using(user_id=auth.uid());
create policy notifications_update on notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy push_own on push_tokens for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and active_user());
create policy reports_read on reports for select to authenticated using(reporter_id=auth.uid() or is_staff());
create policy reports_insert on reports for insert to authenticated with check(reporter_id=auth.uid() and active_user() and status='open');
create policy moderation_read on moderation_actions for select to authenticated using(is_staff() or target_id=auth.uid());
create policy appeals_read on appeals for select to authenticated using(user_id=auth.uid() or is_staff());
create policy appeals_insert on appeals for insert to authenticated with check(user_id=auth.uid() and status='open' and exists(select 1 from videos where id=video_id and creator_id=auth.uid() and status='removed'));
create policy audit_read on audit_logs for select to authenticated using(is_admin());
create policy app_settings_read on app_settings for select to authenticated using(true);
create policy flags_read on feature_flags for select to authenticated using(true);
create policy restrictions_read on account_restrictions for select to authenticated using(user_id=auth.uid() or is_staff());
-- Column grants prevent notification payload and identity tampering.
revoke update on notifications from authenticated;
grant update(read_at) on notifications to authenticated;
create function public.follow_user(target uuid) returns text language plpgsql security definer set search_path=public as $$
declare s text; begin perform consume_rate('follow',20); if target=auth.uid() or blocked(auth.uid(),target) then raise exception 'notAllowed'; end if;
select case when is_private then 'pending' else 'accepted' end into s from profiles where id=target;
insert into follows values(auth.uid(),target,s,now()) on conflict do nothing; return s; end $$;
create function public.unfollow_user(target uuid) returns void language sql security definer set search_path=public as $$ delete from follows where follower_id=auth.uid() and following_id=target; $$;
create function public.accept_follow(follower uuid) returns void language sql security definer set search_path=public as $$ update follows set status='accepted' where following_id=auth.uid() and follower_id=follower and not blocked(auth.uid(),follower); $$;
create function public.guard_social() returns trigger language plpgsql security definer set search_path=public as $$ begin
perform consume_rate(tg_table_name,case when tg_table_name='likes' then 60 else 20 end);
if tg_table_name='comments' then
 if new.parent_id is not null and not exists(select 1 from comments where id=new.parent_id and video_id=new.video_id) then raise exception 'invalidReply'; end if;
end if; return new; end $$;
create trigger comment_guard before insert on comments for each row execute function guard_social();
create trigger like_guard before insert on likes for each row execute function guard_social();
create trigger report_guard before insert on reports for each row execute function guard_social();
create trigger message_guard before insert on messages for each row execute function guard_social();
create function public.engagement_count() returns trigger language plpgsql security definer set search_path=public as $$
declare v uuid; delta int; begin v=case when tg_op='DELETE' then old.video_id else new.video_id end; delta=case when tg_op='DELETE' then -1 else 1 end;
if tg_table_name='likes' then update videos set like_count=greatest(0,like_count+delta) where id=v;
else update videos set comment_count=greatest(0,comment_count+delta) where id=v; end if;
return null; end $$;
create trigger likes_count after insert or delete on likes for each row execute function engagement_count();
create trigger comments_count after insert or delete on comments for each row execute function engagement_count();
create function public.record_watch(v uuid,completion numeric) returns void language plpgsql security definer set search_path=public as $$
declare n int; begin perform consume_rate('watch',60); if not can_watch(v) then raise exception 'notAllowed'; end if;
insert into watch_events values(auth.uid(),v,greatest(0,least(1,completion)),now()) on conflict do nothing;
get diagnostics n=row_count;
if n=1 then update videos set view_count=view_count+1 where id=v; else update watch_events set completion=greatest(watch_events.completion,least(1,record_watch.completion)) where user_id=auth.uid() and video_id=v; end if; end $$;
create function public.reset_recommendations() returns void language plpgsql security definer set search_path=public as $$ begin delete from watch_events where user_id=auth.uid(); update account_settings set recommendations_since=now() where user_id=auth.uid(); end $$;
create function public.feed(mode text default 'forYou',before_time timestamptz default now(),page_size int default 10) returns setof videos language sql stable security invoker set search_path=public as $$
select v.* from videos v where v.status='ready' and v.created_at<before_time and can_watch(v.id)
and not exists(select 1 from user_mutes where user_id=auth.uid() and muted_id=v.creator_id)
and (mode<>'following' or exists(select 1 from follows where follower_id=auth.uid() and following_id=v.creator_id and status='accepted'))
order by v.created_at desc,v.id desc limit least(greatest(page_size,1),30); $$;
create function public.start_conversation(target uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare c uuid; begin perform consume_rate('conversation',5);
if not exists(select 1 from feature_flags where key='messaging' and enabled) or target=auth.uid() or blocked(auth.uid(),target) or not exists(select 1 from follows where follower_id=target and following_id=auth.uid() and status='accepted') then raise exception 'notAllowed'; end if;
select a.conversation_id into c from conversation_participants a join conversation_participants b using(conversation_id) where a.user_id=auth.uid() and b.user_id=target limit 1;
if c is null then insert into conversations default values returning id into c; insert into conversation_participants values(c,auth.uid(),now()),(c,target,null); end if; return c; end $$;
-- Storage is private. Users can only upload the exact path issued by an Edge Function.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('videos','videos',false,104857600,array['video/mp4']);
create policy media_read on storage.objects for select to authenticated using(bucket_id='videos' and exists(select 1 from video_assets where storage_path=name and verified and can_watch(video_id)));
-- No client INSERT/UPDATE policy: signed upload token is issued by authenticated server only.
create index videos_feed_idx on videos(created_at desc,id desc) where status='ready';
create index videos_creator_idx on videos(creator_id,created_at desc);
create index follows_reverse_idx on follows(following_id,status);
create index comments_page_idx on comments(video_id,created_at desc,id desc);
create index messages_page_idx on messages(conversation_id,created_at desc,id desc);
create index notifications_page_idx on notifications(user_id,created_at desc);
create index reports_queue_idx on reports(status,created_at);
create index jobs_status_idx on video_processing_jobs(status,created_at);
create index watches_video_idx on watch_events(video_id);
create index profiles_search_idx on profiles(username text_pattern_ops);
alter publication supabase_realtime add table public.messages,public.notifications;
-- Explicit grants: never expose server-owned mutation APIs.
revoke all on user_roles,videos,video_assets,video_processing_jobs,watch_events,conversations,conversation_participants,moderation_actions,audit_logs,app_settings,feature_flags,account_restrictions,rate_limits from anon,authenticated;
grant select on user_roles,videos,video_assets,video_processing_jobs,watch_events,conversations,conversation_participants,moderation_actions,audit_logs,app_settings,feature_flags,account_restrictions to authenticated;
revoke all on all functions in schema public from public,anon;
grant execute on function public.is_staff(),public.is_admin(),public.active_user(),public.blocked(uuid,uuid),public.can_watch(uuid),public.in_conversation(uuid),public.follow_user(uuid),public.unfollow_user(uuid),public.accept_follow(uuid),public.record_watch(uuid,numeric),public.reset_recommendations(),public.feed(text,timestamptz,int),public.start_conversation(uuid) to authenticated;


-- 202610260002_server.sql
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


-- 202610260003_feed_notifications.sql
-- Bounded heuristic candidate pool; weights are configuration, not an AI model.
create function public.ranked_feed(mode text default 'forYou',page_offset int default 0,as_of timestamptz default now()) returns setof videos language sql stable security invoker set search_path=public as $$
with candidates as (
 select v.*,coalesce(w.completion,0) completion,w.video_id is not null seen,
 exists(select 1 from follows where follower_id=auth.uid() and following_id=v.creator_id and status='accepted') followed,
 row_number() over(partition by v.creator_id order by v.created_at desc) creator_position,
 coalesce((select value from app_settings where key='ranking'),'{}'::jsonb) weights
 from videos v left join watch_events w on w.video_id=v.id and w.user_id=auth.uid()
 where v.status='ready' and v.created_at<=as_of and can_watch(v.id)
 and not exists(select 1 from user_mutes where user_id=auth.uid() and muted_id=v.creator_id)
 and (mode<>'following' or exists(select 1 from follows where follower_id=auth.uid() and following_id=v.creator_id and status='accepted'))
 order by v.created_at desc limit 500
), ranked as (
select id,least(completion,1)*coalesce((weights->>'completion')::numeric,2)
 +ln(1+least(like_count,1000))*coalesce((weights->>'likes')::numeric,.25)
 +followed::int*coalesce((weights->>'follow')::numeric,1.4)
 +coalesce((weights->>'freshness')::numeric,2)/(1+greatest(0,extract(epoch from (as_of-created_at))/86400))
 -seen::int*coalesce((weights->>'repeatPenalty')::numeric,5)-least(creator_position-1,5) score from candidates
) select v.* from ranked r join videos v on v.id=r.id order by r.score desc,v.id limit 10 offset least(greatest(page_offset,0),490); $$;
revoke all on function ranked_feed(text,int,timestamptz) from public,anon;
grant execute on function ranked_feed(text,int,timestamptz) to authenticated;
create table public.push_deliveries(notification_id uuid primary key references notifications on delete cascade,status text not null default 'pending' check(status in ('pending','sending','sent','failed')),attempts int not null default 0,created_at timestamptz default now());
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from anon,authenticated;
create function public.social_notification() returns trigger language plpgsql security definer set search_path=public as $$
declare recipient uuid; actor uuid; kind_name text; target uuid; notification uuid;
begin
if tg_table_name in ('likes','comments') then select creator_id into recipient from videos where id=new.video_id;actor=new.user_id;kind_name=case when tg_table_name='likes' then 'likeNotification' else 'commentNotification' end;target=new.video_id;
elsif tg_table_name='follows' then recipient=new.following_id;actor=new.follower_id;kind_name='followNotification';target=actor;
else select user_id into recipient from conversation_participants where conversation_id=new.conversation_id and user_id<>new.sender_id limit 1;actor=new.sender_id;kind_name='messageNotification';target=new.conversation_id;
end if;
if recipient<>actor and not blocked(actor,recipient) then
insert into notifications(user_id,actor_id,kind,payload) values(recipient,actor,kind_name,jsonb_build_object('target',target)) returning id into notification;
insert into push_deliveries(notification_id) values(notification);
end if;return new;end $$;
create trigger like_notification after insert on likes for each row execute function social_notification();
create trigger comment_notification after insert on comments for each row execute function social_notification();
create trigger follow_notification after insert on follows for each row execute function social_notification();
create trigger message_notification after insert on messages for each row execute function social_notification();
-- Storage access and historical follows must respect blocks after creation.
create function public.block_cleanup() returns trigger language plpgsql security definer set search_path=public as $$ begin delete from follows where (follower_id=new.blocker_id and following_id=new.blocked_id) or (follower_id=new.blocked_id and following_id=new.blocker_id);return new;end $$;
create trigger block_cleanup after insert on user_blocks for each row execute function block_cleanup();
revoke all on function social_notification(),block_cleanup() from public,anon,authenticated;
revoke all on all tables in schema public from anon;

-- Provision profiles for any real Auth accounts created before setup.
insert into public.profiles(id,username)
select id,'u_'||substr(replace(id::text,'-',''),1,22) from auth.users
on conflict(id) do nothing;
insert into public.account_settings(user_id)
select id from public.profiles on conflict(user_id) do nothing;
notify pgrst, 'reload schema';
commit;
