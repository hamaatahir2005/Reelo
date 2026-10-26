import {serve,context,json,check,rate} from '../_shared/http.ts';
serve(async req=>{const {admin,user}=await context(req,true);await rate(admin,user.id,'account',2);const body=await req.json();
 if(body.action==='export'){
 const filters:Record<string,string>={profiles:'id',account_settings:'user_id',videos:'creator_id',comments:'user_id',likes:'user_id',saved_videos:'user_id',watch_events:'user_id',messages:'sender_id',reports:'reporter_id',user_blocks:'blocker_id',follows:'follower_id'};
 const output:Record<string,unknown>={exportedAt:new Date().toISOString()};
 for(const [table,column] of Object.entries(filters)){const rows=[];for(let offset=0;;offset+=500){const {data,error}=await admin.from(table).select('*').eq(column,user.id).range(offset,offset+499);check(error);rows.push(...data!);if(data!.length<500)break;}output[table]=rows;}
 return json(output);
 }
 if(body.action==='delete'&&body.confirm==='DELETE'){
 // Recent password reauthentication required; access-token refresh alone cannot satisfy this.
 const {data:events,error:e}=await admin.from('auth_reauth_events').select('created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(1);check(e);
 if(!events?.length||Date.parse(events[0].created_at)<Date.now()-300000)throw new Error('notAllowed');
 const {data:vids,error}=await admin.from('videos').select('id').eq('creator_id',user.id);check(error);
 for(const v of vids!){const {data:assets,error:a}=await admin.from('video_assets').select('storage_path').eq('video_id',v.id);check(a);if(assets?.length)check((await admin.storage.from('videos').remove(assets.map(a=>a.storage_path))).error);}
 check((await admin.auth.admin.deleteUser(user.id)).error);return json({deleted:true});
 }
 if(body.action==='reauthenticate'&&typeof body.password==='string'){
 const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.57.4');const verifier=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false}});
 const {data,error}=await verifier.auth.signInWithPassword({email:user.email!,password:body.password});if(error||data.user?.id!==user.id)throw new Error('unauthorized');
 check((await admin.from('auth_reauth_events').upsert({user_id:user.id,created_at:new Date().toISOString()})).error);await verifier.auth.signOut();return json({verified:true});
 }throw new Error('invalidInput');});
