import { z } from 'zod';
import { fetchRailGoJson } from './railgo';
import { getHenanMap } from './henan-map';

const candidate=z.object({name:z.string(),province:z.string(),telecode:z.string().regex(/^[A-Z]{3,4}\/?$/)});
const boardItem=z.object({trainNum:z.string(),time:z.string().regex(/^\d{2}:\d{2}$/),timeDelay:z.number().optional(),bigScreenStatus:z.string().optional(),trainStartStation:z.string().optional(),trainEndStation:z.string().optional()});
const boardSchema=z.object({success:z.literal(true),data:z.array(boardItem)});
type BoardItem=z.infer<typeof boardItem>;
export type HenanBoard={station:string;event:'arrival'|'departure';queriedAt:string;source:'RailGo 车站大屏';items:BoardItem[];note:string};
const telecodeCache=new Map<string,{code:string;expires:number}>();
const boardCache=new Map<string,{value:HenanBoard;expires:number}>();
const known:Record<string,string>={'郑州东':'ZAF','洛阳龙门':'LLF'};

async function telecodeFor(name:string):Promise<string>{
 if(known[name])return known[name];
 const cached=telecodeCache.get(name);if(cached&&cached.expires>Date.now())return cached.code;
 const url=new URL('https://data.railgo.zenglingkun.cn/api/station/preselect');url.searchParams.set('keyword',name);
 const raw=await fetchRailGoJson(url);
 if(!Array.isArray(raw))throw new Error('RailGo 车站检索结构变化，无法核对车站');
 const valid=raw.map(item=>candidate.safeParse(item)).filter(item=>item.success).map(item=>item.data);
 const exact=valid.filter(s=>s.name===name&&s.province==='河南省');
 if(exact.length!==1)throw new Error('无法唯一确认该河南车站的电报码，暂不查询大屏');
 const code=exact[0].telecode.replace('/','');telecodeCache.set(name,{code,expires:Date.now()+24*3600000});return code;
}

export async function queryHenanBoard(stationId:string,event:'arrival'|'departure'):Promise<HenanBoard>{
 const station=getHenanMap()?.stations.find(s=>s.id===stationId);
 if(!station)throw new Error('请选择河南地图中已收录的车站');
 const cacheKey=`${stationId}:${event}`,cached=boardCache.get(cacheKey);
 if(cached&&cached.expires>Date.now())return cached.value;
 const code=await telecodeFor(station.name);
 const url=new URL('https://rg-api.zenglingkun.cn/api/v2/getStationBigScreen');
 url.search=new URLSearchParams({stationTelecode:code,kind:event,ver:'3'}).toString();
 let raw:unknown;
 try{raw=await fetchRailGoJson(url)}catch(error){
  if(error instanceof Error&&error.message.includes('HTTP 500'))throw new Error(`RailGo 暂时无法提供“${station.name}”的大屏数据（上游 HTTP 500）。请稍后重试或选择其他车站`);
  throw error;
 }
 const result=boardSchema.safeParse(raw);
 if(!result.success)throw new Error('RailGo 车站大屏结构变化，无法可靠展示');
 const now=new Date(Date.now()+8*3600000).toISOString().slice(11,16),nowMin=Number(now.slice(0,2))*60+Number(now.slice(3,5));
 const items=result.data.data.filter(item=>{const minute=Number(item.time.slice(0,2))*60+Number(item.time.slice(3,5));return minute>=nowMin&&minute<=Math.min(1439,nowMin+180)}).sort((a,b)=>a.time.localeCompare(b.time)).slice(0,100);
 const value:HenanBoard={station:station.name,event,queriedAt:new Date().toISOString(),source:'RailGo 车站大屏',items,note:'仅显示大屏当前返回且北京时间未来 3 小时内的单个到站或发车时间。接口仍标注“测试中”；未提供可靠日期或位置流，跨日时段不外推。'};
 boardCache.set(cacheKey,{value,expires:Date.now()+5*60000});return value;
}
