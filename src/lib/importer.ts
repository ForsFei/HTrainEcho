import { z } from 'zod';
import type { Dataset, Scope } from './types';

const id=z.string().min(1);
const node=z.object({id,name:z.string().min(1),lat:z.number().min(-90).max(90),lng:z.number().min(-180).max(180)});
const segment=z.object({id,name:z.string().min(1),from:id,to:id,geometry:z.array(z.tuple([z.number(),z.number()])).min(2),km:z.number().positive(),directions:z.array(z.string()),source:z.string()});
const point=z.object({id,name:z.string().min(1),segmentId:id,fraction:z.number().min(0).max(1),lat:z.number().min(-90).max(90),lng:z.number().min(-180).max(180),status:z.enum(['confirmed','candidate']),inboundMinutes:z.number().nonnegative().optional(),outboundMinutes:z.number().nonnegative().optional()});
const clock=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/,'时间必须为 HH:mm');
const stop=z.object({nodeId:id,sequence:z.number().int().positive(),arrival:clock.optional(),departure:clock.optional(),arrivalDay:z.number().int().nonnegative().optional(),departureDay:z.number().int().nonnegative().optional()});
const eventEstimate=z.object({nodeId:id,kind:z.enum(['arrival','departure']),time:z.iso.datetime({offset:true}),source:z.string(),updatedAt:z.iso.datetime({offset:true}),expiresAt:z.iso.datetime({offset:true})});
const train=z.object({id,code:z.string().min(1),aliases:z.array(z.string()).optional(),type:z.enum(['normal','highspeed','other']),originDate:z.iso.date(),stops:z.array(stop).min(2),path:z.array(id),pathStatus:z.enum(['confirmed','unique','ambiguous','insufficient','excluded']),pathBasis:z.string(),source:z.string(),updatedAt:z.string(),eventEstimates:z.array(eventEstimate).optional()});
const observation=z.object({id,scope:z.enum(['demo','manual']),pointId:id,trainId:id.optional(),time:z.iso.datetime({offset:true}),direction:z.string(),type:z.enum(['passenger','freight','unknown']),note:z.string(),createdAt:z.iso.datetime({offset:true})});
const schema=z.object({nodes:z.array(node).default([]),segments:z.array(segment).default([]),points:z.array(point).default([]),trains:z.array(train).default([]),observations:z.array(observation).default([])});
function csvRows(text:string):string[][] {
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field='';}else field+=c;}
 row.push(field);if(row.some(Boolean))rows.push(row);return rows;
}
export function parseImport(content:string,format:'json'|'csv',kind?:'nodes'|'segments'|'points'|'trains'|'observations'):{data?:Partial<Dataset>;errors:string[];counts:Record<string,number>} {
 const errors:string[]=[];let raw:any;
 try {
  if(format==='json')raw=JSON.parse(content);
  else {if(!kind)throw Error('CSV 需要选择模板类型');const rows=csvRows(content);const heads=rows.shift()?.map(x=>x.trim().replace(/^\uFEFF/,''))||[];raw={[kind]:rows.map((r,i)=>{const item:any={};heads.forEach((h,j)=>{let v:any=r[j]??'';if(['lat','lng','km','fraction','inboundMinutes','outboundMinutes'].includes(h)&&v!=='')v=Number(v);else if(['sequence','arrivalDay','departureDay'].includes(h)&&v!=='')v=Number(v);else if(['geometry','directions','stops','path','aliases'].includes(h)&&v!=='')try{v=JSON.parse(v);}catch{errors.push(`第 ${i+2} 行：${h} 不是有效 JSON`);}if(v!=='')item[h]=v;});return item;})};}
 }catch(e){return {errors:[e instanceof Error?e.message:'文件无法解析'],counts:{}};}
 const checked=schema.safeParse(raw);
 if(!checked.success) for(const issue of checked.error.issues)errors.push(`${issue.path.join('.')}: ${issue.message}`);
 const data=checked.success?checked.data:undefined;
 if(data){
  for(const collection of ['nodes','segments','points','trains','observations'] as const){const seen=new Set<string>();for(const item of data[collection]){if(seen.has(item.id))errors.push(`${collection}: 重复 ID ${item.id}`);seen.add(item.id);}}
  const nodes=new Set(data.nodes.map(x=>x.id));const segs=new Set(data.segments.map(x=>x.id));
  for(const s of data.segments)if(data.nodes.length&&(!nodes.has(s.from)||!nodes.has(s.to)))errors.push(`区段 ${s.id}: 节点不存在`);
  for(const p of data.points)if(data.segments.length&&!segs.has(p.segmentId))errors.push(`观察点 ${p.id}: 区段不存在`);
  for(const t of data.trains){const seq=t.stops.map(s=>s.sequence);if(new Set(seq).size!==seq.length)errors.push(`车次 ${t.code}: 经停顺序重复`);if(t.pathStatus==='confirmed'&&t.path.length!==t.stops.length-1)errors.push(`车次 ${t.code}: 已确认路径需与相邻站对逐段对应`);}
 }
 const counts=data?Object.fromEntries(Object.entries(data).map(([k,v])=>[k,(v as unknown[]).length])):{};
 return {data:data as Partial<Dataset>|undefined,errors,counts};
}
