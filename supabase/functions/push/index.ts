import {serve,context,json,check,rate} from '../_shared/http.ts';
// Invoked by an authenticated administrator or a separately configured scheduler identity.
// Notifications carry generic localized text, never private message bodies.
const text={en:{title:'Reelo',body:'You have new activity.'},ckb:{title:'Reelo',body:'چالاکییەکی نوێت هەیە.'},ar:{title:'Reelo',body:'لديك نشاط جديد.'}};
serve(async req=>{const {admin,user}=await context(req);const {data:role}=await admin.from('user_roles').select('role').eq('user_id',user.id).single();if(role?.role!=='admin')throw new Error('notAllowed');await rate(admin,user.id,'push',2);
 const {data:jobs,error}=await admin.from('push_deliveries').select('notification_id').eq('status','pending').limit(50);check(error);let sent=0;
 for(const job of jobs!){const {data:claim,error}=await admin.from('push_deliveries').update({status:'sending',attempts:1}).eq('notification_id',job.notification_id).eq('status','pending').select('notification_id');check(error);if(!claim?.length)continue;
 try{const {data:n}=await admin.from('notifications').select('user_id').eq('id',job.notification_id).single();const {data:settings}=await admin.from('account_settings').select('locale').eq('user_id',n!.user_id).single();const locale=settings?.locale as keyof typeof text;const {data:tokens}=await admin.from('push_tokens').select('token').eq('user_id',n!.user_id);
 if(tokens?.length){const response=await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'Content-Type':'application/json',...(Deno.env.get('EXPO_ACCESS_TOKEN')?{Authorization:`Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}`}:{})},body:JSON.stringify(tokens.map(t=>({to:t.token,...(text[locale]||text.en),data:{notificationId:job.notification_id}})))});if(!response.ok)throw new Error('pushFailed');const result=await response.json();if(result.errors||result.data?.some((x:any)=>x.status==='error'))throw new Error('pushFailed');}
 await admin.from('push_deliveries').update({status:'sent'}).eq('notification_id',job.notification_id);sent++;
 }catch{await admin.from('push_deliveries').update({status:'failed'}).eq('notification_id',job.notification_id);}
 }return json({sent});});
