import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
export const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
export function json(value:unknown,status=200){return new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json'}});}
export async function context(req:Request,allowRestricted=false){
 const token=req.headers.get('Authorization')?.replace(/^Bearer /,''); if(!token)throw new Error('unauthorized');
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const {data:{user},error}=await admin.auth.getUser(token);if(error||!user||!user.email_confirmed_at)throw new Error('unauthorized');
 const {data:restriction}=await admin.from('account_restrictions').select('*').eq('user_id',user.id).maybeSingle();
 if(!allowRestricted&&restriction&&(!restriction.until_at||Date.parse(restriction.until_at)>Date.now()))throw new Error('accountRestricted');
 return {admin,user};
}
export function serve(fn:(req:Request)=>Promise<Response>){Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response(null,{headers:cors});if(req.method!=='POST')return json({error:'methodNotAllowed'},405);try{return await fn(req);}catch(e){const message=e instanceof Error?e.message:'requestFailed';return json({error:['unauthorized','accountRestricted','notAllowed','invalidInput','rateLimited','invalidMedia','notConfigured'].includes(message)?message:'requestFailed'},message==='unauthorized'?401:400);}});}
export function check(error:unknown){if(error)throw new Error('requestFailed');}
export async function rate(admin:any,userId:string,action:string,max:number){const {error}=await admin.rpc('server_rate',{u:userId,a:action,lim:max});if(error)throw new Error('rateLimited');}
