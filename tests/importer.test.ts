import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseImport } from '../src/lib/importer';
test('all shipped CSV templates parse',()=>{for(const kind of ['nodes','segments','points','trains','observations'] as const){const input=fs.readFileSync(`public/templates/${kind}.csv`,'utf8');const result=parseImport(input,'csv',kind);assert.deepEqual(result.errors,[],kind);assert.equal(result.counts[kind]>0,true);}});
test('JSON template parses with cross references',()=>{const result=parseImport(fs.readFileSync('public/templates/dataset.json','utf8'),'json');assert.deepEqual(result.errors,[]);assert.equal(result.counts.trains,1);});
test('invalid clock and duplicate IDs are rejected',()=>{const input=JSON.parse(fs.readFileSync('public/templates/dataset.json','utf8'));input.trains[0].stops[0].departure='25:99';input.nodes.push(input.nodes[0]);const result=parseImport(JSON.stringify(input),'json');assert.ok(result.errors.some(x=>x.includes('HH:mm')));input.trains[0].stops[0].departure='10:00';assert.ok(parseImport(JSON.stringify(input),'json').errors.some(x=>x.includes('重复 ID')));});
