import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { demoDataset } from './demo';
import type { Dataset, Scope, Node, Segment, Point, Train, Observation, Calibration } from './types';

const file=process.env.DATABASE_PATH || path.join(process.cwd(),'data','htraineoco.sqlite');
let singleton: Database.Database | undefined;
function db():Database.Database {
 if(singleton) return singleton;
 fs.mkdirSync(path.dirname(file),{recursive:true});
 singleton=new Database(file); singleton.pragma('journal_mode = WAL');
 singleton.exec(fs.readFileSync(path.join(process.cwd(),'migrations','001_init.sql'),'utf8'));
 const n=(singleton.prepare("SELECT count(*) n FROM records WHERE scope='demo'").get() as {n:number}).n;
 if(n===0) { const d=demoDataset(); saveDataset(d,true); }
 return singleton;
}
function rows<T>(scope:Scope,kind:string):T[] { return db().prepare('SELECT payload FROM records WHERE scope=? AND kind=? ORDER BY id').all(scope,kind).map((r:any)=>JSON.parse(r.payload)); }
export function getDataset(scope:Scope):Dataset {
 const dbc=db();
 const refreshedAt=(dbc.prepare('SELECT value FROM meta WHERE scope=? AND key=?').get(scope,'refreshedAt') as {value?:string}|undefined)?.value || '';
 const demo=scope==='demo';
 const trains=rows<Train>(scope,'train');
 // Demo service dates repeat every selected day; persisted entities and observations remain in a separate scope.
 const nodes=rows<Node>(scope,'node'),segments=rows<Segment>(scope,'segment'),points=rows<Point>(scope,'point');
 // Existing fictional demo databases used an older schematic coordinate range.
 // Keep saved observations while moving only the fictional sketch into Henan.
 if(demo){const move=(lat:number,lng:number):[number,number]=>lng>120?[lat+3,lng-8]:[lat,lng];
  for(const n of nodes)[n.lat,n.lng]=move(n.lat,n.lng);
  for(const s of segments)s.geometry=s.geometry.map(([lng,lat])=>{const [nextLat,nextLng]=move(lat,lng);return [nextLng,nextLat]});
  for(const p of points)[p.lat,p.lng]=move(p.lat,p.lng);
 }
 return {scope,nodes,segments,points,trains,observations:rows<Observation>(scope,'observation'),calibrations:rows<Calibration>(scope,'calibration'),refreshedAt};
}
export function saveRecord<T extends {id:string}>(scope:Scope,kind:string,item:T):void {
 db().prepare('INSERT INTO records(scope,kind,id,payload,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(scope,kind,id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').run(scope,kind,item.id,JSON.stringify(item),new Date().toISOString());
}
export function deleteRecord(scope:Scope,kind:string,id:string):void { db().prepare('DELETE FROM records WHERE scope=? AND kind=? AND id=?').run(scope,kind,id); }
export function getSourceDeclarations(scope:Scope):unknown[]{return rows(scope,'source');}
export function saveDataset(data:Dataset,replace=false):void {
 const dbc=singleton || db(); const write=dbc.transaction(()=>{
  if(replace) dbc.prepare('DELETE FROM records WHERE scope=?').run(data.scope);
  for(const [kind,items] of Object.entries({node:data.nodes,segment:data.segments,point:data.points,train:data.trains,observation:data.observations,calibration:data.calibrations})) for(const item of items) dbc.prepare('INSERT INTO records(scope,kind,id,payload,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(scope,kind,id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').run(data.scope,kind,item.id,JSON.stringify(item),new Date().toISOString());
  dbc.prepare('INSERT INTO meta(scope,key,value) VALUES(?,?,?) ON CONFLICT(scope,key) DO UPDATE SET value=excluded.value').run(data.scope,'refreshedAt',new Date().toISOString());
 }); write();
}
export function migrate():void { db(); }
