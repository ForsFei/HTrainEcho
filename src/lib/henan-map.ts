import fs from 'node:fs';
import path from 'node:path';

export type HenanLineCategory='highspeed'|'ordinary'|'unclassified';
export type HenanLine={id:string;name:string;category:HenanLineCategory;points:[number,number][]};
export type HenanStation={id:string;name:string;lng:number;lat:number;kind:string;level:'city'|'county'};
export type HenanCity={id:string;name:string;label:[number,number];rings:[number,number][][]};
export type HenanMapData={format:string;source:string;sourceUrl:string;license:string;builtAt:string;precision:string;boundary:[number,number][][];cities:HenanCity[];lines:HenanLine[];stations:HenanStation[]};
const file=path.join(process.cwd(),'data','henan-rail-map.json');
let cache:HenanMapData|undefined;
let cacheMtime=0;
export function getHenanMap():HenanMapData|undefined{
 if(!fs.existsSync(file))return undefined;
 const mtime=fs.statSync(file).mtimeMs;
 if(cache&&cacheMtime===mtime)return cache;
 const data=JSON.parse(fs.readFileSync(file,'utf8')) as HenanMapData;
 if(data.format!=='HTrainEoco-Henan-OSM-v1'||!Array.isArray(data.lines)||!Array.isArray(data.stations)||!Array.isArray(data.cities))return undefined;
 cache=data;cacheMtime=mtime;return data;
}
