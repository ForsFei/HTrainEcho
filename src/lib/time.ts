const TZ = 'Asia/Shanghai';
export function shanghaiDate(date = new Date()): string { return new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
export function shanghaiNow(): string { return new Date().toISOString(); }
export function localDateTime(date:string,time:string,day=0): string { const ms=Date.parse(`${date}T${time}:00+08:00`)+day*86400000; return new Date(ms).toISOString(); }
export function addMinutes(iso:string,n:number):string { return new Date(Date.parse(iso)+n*60000).toISOString(); }
export function minuteDiff(a:string,b:string):number { return (Date.parse(a)-Date.parse(b))/60000; }
export function formatTime(iso:string):string { return new Intl.DateTimeFormat('zh-CN',{timeZone:TZ,month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(iso)); }
export function formatClock(iso:string):string { return new Intl.DateTimeFormat('zh-CN',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(iso)); }
