let blockedUntil=0;
let requestQueue:Promise<void>=Promise.resolve();

export function fetchRailGoJson(url:URL):Promise<unknown>{
 const job=requestQueue.then(async()=>{
  if(blockedUntil>Date.now())throw new Error('RailGo 已限流或拒绝访问，本机自动请求已暂停');
  let response:Response;
  try{response=await fetch(url,{signal:AbortSignal.timeout(12_000),cache:'no-store',headers:{'User-Agent':'HTrainEoco/0.1 (local noncommercial rail observation app)'}})}
  catch{throw new Error('RailGo 网络连接失败，未将失败解释为没有列车')}
  if(response.status===429||response.status===403){blockedUntil=Date.now()+3600000;throw new Error('RailGo 已限流或拒绝访问，本机自动请求已暂停 1 小时')}
  if(!response.ok)throw new Error(`RailGo 服务暂不可用（HTTP ${response.status}）`);
  return response.json().catch(()=>{throw new Error('RailGo 返回的内容不是有效 JSON')});
 });
 requestQueue=job.then(()=>{},()=>{});
 return job;
}
