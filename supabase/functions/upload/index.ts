import {serve,context,json,check,rate} from '../_shared/http.ts';
import {inspectMp4} from '../_shared/mp4.ts';
serve(async req=>{const {admin,user}=await context(req);const body=await req.json();
 if(body.action==='create'){
 await rate(admin,user.id,'upload',5);
 if(typeof body.caption!=='string'||body.caption.length>2200||!['public','private','followers'].includes(body.visibility)||!Number.isInteger(body.size)||body.size<=0||body.size>104857600||body.mime!=='video/mp4')throw new Error('invalidInput');
 const {data:v,error}=await admin.from('videos').insert({creator_id:user.id,caption:body.caption,visibility:body.visibility}).select('id').single();check(error);
 const path=`${user.id}/${v.id}/original.mp4`;
 check((await admin.from('video_assets').insert({video_id:v.id,storage_path:path,kind:'original',bytes:body.size,mime:body.mime})).error);
 const {data:s,error:e}=await admin.storage.from('videos').createSignedUploadUrl(path);check(e);return json({videoId:v.id,path,token:s!.token,signedUrl:s!.signedUrl});
 }
 if(body.action==='complete'){
 await rate(admin,user.id,'complete',10);
 const {data:v}=await admin.from('videos').select('id,status').eq('id',body.videoId).eq('creator_id',user.id).single();if(!v||!['uploading','failed'].includes(v.status))throw new Error('notAllowed');
 const {data:a}=await admin.from('video_assets').select('*').eq('video_id',v.id).eq('kind','original').single();if(!a)throw new Error('invalidInput');
 const {data:claimed,error:claimError}=await admin.from('videos').update({status:'processing'}).eq('id',v.id).eq('status',v.status).select('id');check(claimError);if(!claimed?.length)throw new Error('notAllowed');
 const {data:job}=await admin.from('video_processing_jobs').insert({video_id:v.id,status:'processing',attempts:1}).select('id').single();
 try{
 const {data:file,error}=await admin.storage.from('videos').download(a.storage_path);check(error);if(!file||file.size!==a.bytes||file.size>104857600)throw new Error('invalidMedia');
 const metadata=inspectMp4(new Uint8Array(await file.arrayBuffer()));
 check((await admin.from('video_assets').update({verified:true}).eq('id',a.id)).error);
 check((await admin.from('videos').update({...metadata,status:'ready'}).eq('id',v.id)).error);
 await admin.from('video_processing_jobs').update({status:'completed'}).eq('id',job!.id);
 return json({status:'ready',provider:'raw-private',...metadata});
 }catch(e){await admin.from('videos').update({status:'failed'}).eq('id',v.id);await admin.from('video_processing_jobs').update({status:'failed',error:'mediaValidationFailed'}).eq('id',job!.id);throw e;}
 }
 if(body.action==='cancel'){
 const {data:v}=await admin.from('videos').select('id').eq('id',body.videoId).eq('creator_id',user.id).single();if(!v)throw new Error('notAllowed');
 const {data:assets}=await admin.from('video_assets').select('storage_path').eq('video_id',v.id);
 if(assets?.length)check((await admin.storage.from('videos').remove(assets.map(a=>a.storage_path))).error);
 check((await admin.from('videos').delete().eq('id',v.id)).error);return json({deleted:true});
 }throw new Error('invalidInput');});
