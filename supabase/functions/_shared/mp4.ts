// Parse ISO BMFF metadata; reject malformed, fragmented-only and oversized containers.
// This is container validation, not malware detection or a full codec decoder.
export function inspectMp4(bytes:Uint8Array){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let duration=0,width=0,height=0,ftyp=false,mdat=false;
 function scan(start:number,end:number,depth:number){if(depth>6)throw new Error('invalidMedia');let p=start;
 while(p+8<=end){let size=view.getUint32(p);const type=String.fromCharCode(...bytes.subarray(p+4,p+8));let head=8;
 if(size===1){if(p+16>end)throw new Error('invalidMedia');size=Number(view.getBigUint64(p+8));head=16;}if(size===0)size=end-p;
 if(size<head||p+size>end)throw new Error('invalidMedia');const d=p+head;
 if(type==='ftyp')ftyp=true;if(type==='mdat')mdat=true;
 if(['moov','trak','mdia'].includes(type))scan(d,p+size,depth+1);
 if(type==='mvhd'){const v=bytes[d];const offset=v===1?20:12;if(d+offset+(v===1?12:8)>p+size)throw new Error('invalidMedia');const scale=view.getUint32(d+offset);const ticks=v===1?Number(view.getBigUint64(d+offset+4)):view.getUint32(d+offset+4);duration=ticks/scale;}
 if(type==='tkhd'&&size>=84){width=Math.max(width,view.getUint32(p+size-8)/65536);height=Math.max(height,view.getUint32(p+size-4)/65536);}
 p+=size;}if(p!==end)throw new Error('invalidMedia');}
 scan(0,bytes.length,0);
 if(!ftyp||!mdat||!Number.isFinite(duration)||duration<=0||duration>90||width<144||height<144||width>3840||height>3840)throw new Error('invalidMedia');return {duration,width,height};
}
