import type { Dataset } from './types';
import { shanghaiDate, shanghaiNow } from './time';

// Entirely fictional service and schematic geometry. Never presented as a real timetable.
export function demoDataset(): Dataset {
 const date=shanghaiDate(), now=shanghaiNow();
 const moment=(offset:number)=>{const value=new Date(Date.now()+offset*60000),local=new Date(value.getTime()+8*3600000),clock=local.toISOString().slice(11,16),day=Math.round((Date.parse(local.toISOString().slice(0,10))-Date.parse(date))/86400000);return {clock,day};};
 const m=(offset:number)=>moment(offset).clock,dy=(offset:number)=>moment(offset).day;
 return {scope:'demo',refreshedAt:now,
 nodes:[
  {id:'a',name:'示例西站',lat:34.210,lng:113.380},
  {id:'b',name:'示例中央站',lat:34.215,lng:113.415},
  {id:'c',name:'示例东站',lat:34.223,lng:113.455},
  {id:'d',name:'示例南站',lat:34.185,lng:113.432},
  {id:'x',name:'示例北节点',lat:34.240,lng:113.425},
  {id:'y',name:'示例南节点',lat:34.180,lng:113.425}
 ],
 segments:[
  {id:'s-ab',name:'西站—中央站',from:'a',to:'b',geometry:[[113.380,34.210],[113.398,34.213],[113.415,34.215]],km:3.6,directions:['往示例中央站','往示例西站'],source:'演示拓扑 v1'},
  {id:'s-bc',name:'中央站—东站（北线）',from:'b',to:'c',geometry:[[113.415,34.215],[113.432,34.228],[113.455,34.223]],km:4.5,directions:['往示例东站','往示例中央站'],source:'演示拓扑 v1'},
  {id:'s-bc-south',name:'中央站—东站（南线）',from:'b',to:'c',geometry:[[113.415,34.215],[113.430,34.204],[113.455,34.223]],km:4.8,directions:['往示例东站','往示例中央站'],source:'演示拓扑 v1'},
  {id:'s-bd',name:'中央站—南站',from:'b',to:'d',geometry:[[113.415,34.215],[113.425,34.195],[113.432,34.185]],km:3.7,directions:['往示例南站','往示例中央站'],source:'演示拓扑 v1'},
  {id:'s-xy',name:'北节点—南节点（交叉不连通）',from:'x',to:'y',geometry:[[113.425,34.240],[113.425,34.180]],km:6.8,directions:['往示例南节点','往示例北节点'],source:'演示拓扑 v1'}
 ],
 points:[
  {id:'p-bridge',name:'河畔公共步道',segmentId:'s-ab',fraction:0.63,lat:34.212,lng:113.402,status:'confirmed',inboundMinutes:5,outboundMinutes:4},
  {id:'p-hill',name:'观景平台',segmentId:'s-bc',fraction:0.5,lat:34.225,lng:113.434,status:'confirmed'}
 ],
 trains:[
  {id:'demo-g101',code:'G101',type:'highspeed',originDate:date,stops:[{nodeId:'a',sequence:1,departure:m(18),departureDay:dy(18)},{nodeId:'b',sequence:2,arrival:m(25),arrivalDay:dy(25),departure:m(28),departureDay:dy(28)},{nodeId:'c',sequence:3,arrival:m(35),arrivalDay:dy(35)}],path:['s-ab','s-bc'],pathStatus:'confirmed',pathBasis:'演示数据明确映射：西站→中央站→北线→东站',source:'演示时刻表 v1',updatedAt:now},
  {id:'demo-k202',code:'K202',type:'normal',originDate:date,stops:[{nodeId:'c',sequence:1,departure:m(46),departureDay:dy(46)},{nodeId:'b',sequence:2,arrival:m(58),arrivalDay:dy(58),departure:m(62),departureDay:dy(62)},{nodeId:'a',sequence:3,arrival:m(71),arrivalDay:dy(71)}],path:['s-bc-south','s-ab'],pathStatus:'confirmed',pathBasis:'演示数据明确映射：东站→南线→中央站→西站',source:'演示时刻表 v1',updatedAt:now},
  {id:'demo-d303',code:'D303',type:'highspeed',originDate:date,stops:[{nodeId:'a',sequence:1,departure:m(81),departureDay:dy(81)},{nodeId:'b',sequence:2,arrival:m(88),arrivalDay:dy(88),departure:m(91),departureDay:dy(91)},{nodeId:'c',sequence:3,arrival:m(99),arrivalDay:dy(99)}],path:[],pathStatus:'ambiguous',pathBasis:'中央站与东站之间有两条平行线路，停站不能确定路径',source:'演示时刻表 v1',updatedAt:now},
  {id:'demo-t404',code:'T404',type:'normal',originDate:date,stops:[{nodeId:'a',sequence:1,departure:m(110),departureDay:dy(110)},{nodeId:'b',sequence:2,arrival:m(120),arrivalDay:dy(120),departure:m(125),departureDay:dy(125)},{nodeId:'d',sequence:3,arrival:m(136),arrivalDay:dy(136)}],path:['s-ab','s-bd'],pathStatus:'confirmed',pathBasis:'演示数据明确映射：西站→中央站→南站',source:'演示时刻表 v1',updatedAt:now}
 ],observations:[],calibrations:[]};
}

