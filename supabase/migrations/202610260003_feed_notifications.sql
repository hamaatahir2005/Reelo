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
