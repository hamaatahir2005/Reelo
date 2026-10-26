import {serve,context,json,check,rate} from '../_shared/http.ts';
serve(async req=>{const {admin,user}=await context(req);const {data:role}=await admin.from('user_roles').select('role').eq('user_id',user.id).single();if(!role)throw new Error('notAllowed');await rate(admin,user.id,'admin',30);
 const b=await req.json();const allowed=['overview','reports','videos','users','audit','flags','moderate','restrict','flag'];if(!allowed.includes(b.action))throw new Error('invalidInput');
 if(['restrict','flag','audit'].includes(b.action)&&role.role!=='admin')throw new Error('notAllowed');
 if(b.action==='overview'){const result:Record<string,number|null>={};for(const table of ['profiles','videos','reports','video_processing_jobs']){const {count,error}=await admin.from(table).select('*',{count:'exact',head:true});check(error);result[table]=count;}return json(result);}
 const tables:Record<string,string>={reports:'reports',videos:'videos',users:'profiles',audit:'audit_logs',flags:'feature_flags'};
 if(tables[b.action]){let q=admin.from(tables[b.action]).select('*').limit(50);if(b.action==='users'&&typeof b.search==='string')q=q.ilike('username',`%${b.search.replace(/[^a-z0-9_]/g,'')}%`);else if(b.action!=='flags')q=q.order('created_at',{ascending:false});const {data,error}=await q;check(error);return json(data);}
 if(typeof b.reason!=='string'||b.reason.trim().length<5||b.reason.length>2000)throw new Error('invalidInput');
 // Atomic SQL performs changes and audit logging in the same transaction.
 const {data,error}=await admin.rpc('admin_action',{actor:user.id,act:b.action,target:b.target||null,reason:b.reason,flag_key:b.key||null,enabled:b.enabled===true});check(error);return json(data);
});
