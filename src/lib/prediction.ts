import type { Dataset, EventKind, Prediction, Segment, Stop, Train } from './types';
import { addMinutes, localDateTime, minuteDiff } from './time';

const name=(d:Dataset,id:string)=>d.nodes.find(n=>n.id===id)?.name || id;
const at=(train:Train,stop:Stop,kind:'arrival'|'departure',serviceDate:string)=>{
 const clock=stop[kind]; if(!clock) return undefined;
 const estimate=train.eventEstimates?.find(x=>x.nodeId===stop.nodeId&&x.kind===kind&&Date.parse(x.expiresAt)>Date.now()&&Date.parse(x.time)>0);
 if(estimate)return estimate.time;
 return localDateTime(serviceDate,clock,stop[`${kind}Day`] ?? 0);
};
const hasEstimate=(train:Train,stop:Stop,kind:'arrival'|'departure')=>train.eventEstimates?.some(x=>x.nodeId===stop.nodeId&&x.kind===kind&&Date.parse(x.expiresAt)>Date.now())||false;
function window(center:string,half:number):[string,string] {return [addMinutes(center,-half),addMinutes(center,half)];}
function stationEvents(d:Dataset,t:Train,serviceDate:string):Prediction[] {
 const out:Prediction[]=[];
 for(const stop of t.stops) for(const kind of ['arrival','departure'] as const){
  const time=at(t,stop,kind,serviceDate); if(!time) continue;
  const next=t.stops.find(s=>s.sequence===stop.sequence+(kind==='departure'?1:-1));
  const direction=next?`往${name(d,next.nodeId)}方向`:'终到 / 始发';
  const estimated=hasEstimate(t,stop,kind),info=t.eventEstimates?.find(x=>x.nodeId===stop.nodeId&&x.kind===kind);
  out.push({id:`${t.id}-${stop.nodeId}-${kind}`,trainId:t.id,code:t.code,type:t.type,targetId:stop.nodeId,targetKind:'station',event:kind,start:time,end:time,direction,method:estimated?'适用的到发预计时间':'计划时刻',explanation:`${name(d,stop.nodeId)}${kind==='arrival'?'到达':'出发'}${estimated?'有效预计':'计划'}时间；这是车站事件，不是站外经过时间。`,anchors:[`${name(d,stop.nodeId)}${kind==='arrival'?'到达':'出发'} ${estimated?'有效预计':'计划'} ${time}`],pathStatus:t.pathStatus,confidence:'一般',source:estimated?info!.source:t.source,updatedAt:estimated?info!.updatedAt:t.updatedAt,calibrationSamples:0});
 }
 return out;
}
function segmentTrips(d:Dataset,t:Train,serviceDate:string){
 const stops=[...t.stops].sort((a,b)=>a.sequence-b.sequence);
 const out:{segment:Segment;from:Stop;to:Stop;start:string;end:string;forward:boolean}[]=[];
 if(!['confirmed','unique'].includes(t.pathStatus)) return out;
 for(let i=0;i<stops.length-1;i++){
  const from=stops[i],to=stops[i+1],segment=d.segments.find(s=>s.id===t.path[i]);
  if(!segment || !((segment.from===from.nodeId && segment.to===to.nodeId)||(segment.to===from.nodeId && segment.from===to.nodeId))) continue;
  const start=at(t,from,'departure',serviceDate),end=at(t,to,'arrival',serviceDate);
  if(!start || !end || minuteDiff(end,start)<=0) continue;
  out.push({segment,from,to,start,end,forward:segment.from===from.nodeId});
 }
 return out;
}
export function predict(d:Dataset,serviceDate:string):Prediction[] {
 const result:Prediction[]=[];
 for(const original of d.trains){
  const inferred=pathCandidates(d,original);
  const t:Train=original.pathStatus==='insufficient'&&inferred.status==='unique'&&inferred.segments.length===original.stops.length-1?{...original,path:inferred.segments,pathStatus:'unique',pathBasis:inferred.reason}:original;
  const date=d.scope==='demo'?serviceDate:t.originDate;
  result.push(...stationEvents(d,t,date));
  for(const trip of segmentTrips(d,t,date)){
   const duration=minuteDiff(trip.end,trip.start), direction=`往${name(d,trip.to.nodeId)}方向`;
   const midpoint=addMinutes(trip.start,duration/2);
   const startEstimate=hasEstimate(t,trip.from,'departure'),endEstimate=hasEstimate(t,trip.to,'arrival');
   const base={trainId:t.id,code:t.code,type:t.type,direction,pathStatus:t.pathStatus,source:startEstimate||endEstimate?'计划时刻＋事件预计时间':t.source,updatedAt:t.updatedAt,anchors:[`${name(d,trip.from.nodeId)}${startEstimate?'有效预计':'计划'}出发 ${trip.start}`,`${name(d,trip.to.nodeId)}${endEstimate?'有效预计':'计划'}到达 ${trip.end}`],calibrationSamples:0};
   const [ss,se]=window(midpoint,Math.max(4,Math.ceil(duration*.25)));
   result.push({...base,id:`${t.id}-${trip.segment.id}`,targetId:trip.segment.id,targetKind:'segment',event:'crossing',start:ss,end:se,method:'相邻站时间锚点插值',explanation:`路径${t.pathStatus==='confirmed'?'已确认':'唯一推断'}；用相邻两站到发时间估算区段中点，未假定匀速行驶。`,confidence:'一般'});
   for(const p of d.points.filter(p=>p.segmentId===trip.segment.id && p.status==='confirmed')){
    const ratio=trip.forward?p.fraction:1-p.fraction;
    let center=addMinutes(trip.start,duration*ratio),method='沿已确认区段的里程比例插值',half=Math.max(5,Math.ceil(duration*.3));
    const outbound=trip.forward?p.outboundMinutes:p.inboundMinutes;
    const inbound=trip.forward?p.inboundMinutes:p.outboundMinutes;
    if(outbound!==undefined){center=addMinutes(trip.start,outbound);method='上游站出发＋人工配置耗时';half=Math.max(4,Math.ceil(outbound*.4));}
    else if(inbound!==undefined){center=addMinutes(trip.end,-inbound);method='下游站到达－人工配置耗时';half=Math.max(4,Math.ceil(inbound*.4));}
    const calibration=d.calibrations.find(c=>c.pointId===p.id&&c.direction===direction&&c.type===t.type&&c.applied&&c.samples>=3);
    if(calibration){center=addMinutes(center,calibration.offsetMinutes);half=Math.max(half,calibration.spreadMinutes);method+='＋现场校准';}
    const [start,end]=window(center,half);
    result.push({...base,id:`${t.id}-${p.id}`,targetId:p.id,targetKind:'point',event:'crossing',start,end,method,explanation:`${p.name}位于${trip.segment.name}；${method}。路径依据：${t.pathBasis}。`,confidence:calibration&&calibration.samples>=5?'较高':'一般',calibrationSamples:calibration?.samples||0});
   }
  }
 }
 return result.sort((a,b)=>a.start.localeCompare(b.start));
}
export function pathCandidates(d:Dataset,train:Train):{status:string;segments:string[];reason:string}{
 if(train.pathStatus==='confirmed'||train.pathStatus==='unique')return {status:train.pathStatus,segments:train.path,reason:train.pathBasis};
 const stops=[...train.stops].sort((a,b)=>a.sequence-b.sequence);
 const segments:string[]=[]; let ambiguous=false,missing=false;
 for(let i=0;i<stops.length-1;i++){
  const options=d.segments.filter(s=>(s.from===stops[i].nodeId&&s.to===stops[i+1].nodeId)||(s.to===stops[i].nodeId&&s.from===stops[i+1].nodeId));
  if(options.length===1)segments.push(options[0].id); else if(options.length>1)ambiguous=true; else missing=true;
 }
 return {status:missing?'insufficient':ambiguous?'ambiguous':'unique',segments,reason:missing?'节点之间缺少已验证连接':ambiguous?'至少一对节点之间存在多条可能线路':'每对相邻节点只有一条拓扑连接；仍需核对适用日期'};
}
export function median(values:number[]):number { const s=[...values].sort((a,b)=>a-b); const m=Math.floor(s.length/2);return s.length?s.length%2?s[m]:(s[m-1]+s[m])/2:0; }
export function calibrationSuggestions(d:Dataset,serviceDate:string){
 const base=predict({...d,calibrations:[]},serviceDate).filter(p=>p.targetKind==='point');
 const groups=new Map<string,number[]>();
 for(const o of d.observations){
  if(!o.trainId||o.type!=='passenger')continue;
  const train=d.trains.find(t=>t.id===o.trainId);if(!train)continue;
  const prediction=base.find(p=>p.trainId===o.trainId&&p.targetId===o.pointId&&p.direction===o.direction);
  if(!prediction)continue;
  const offset=minuteDiff(o.time,addMinutes(prediction.start,minuteDiff(prediction.end,prediction.start)/2));
  if(Math.abs(offset)>60)continue;
  const key=`${o.pointId}|${o.direction}|${train.type}`;
  groups.set(key,[...(groups.get(key)||[]),offset]);
 }
 return [...groups].map(([key,offsets])=>{const [pointId,direction,type]=key.split('|');const center=median(offsets),spread=Math.max(4,median(offsets.map(x=>Math.abs(x-center)))*2);return {id:key,scope:d.scope,pointId,direction,type:type as Train['type'],offsetMinutes:Math.round(center),spreadMinutes:Math.ceil(spread),samples:offsets.length,applied:false};});
}
