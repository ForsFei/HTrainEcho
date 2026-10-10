import { getDataset } from './db';
import type { Dataset, Scope } from './types';

export interface ProviderStatus { id:string; name:string; status:string; capabilities:string[]; reason?:string; }
export interface DataProvider { status:ProviderStatus; load():Dataset; }
export class DemoProvider implements DataProvider {
 status={id:'demo',name:'演示数据',status:'可用 · 非真实',capabilities:['有限区域示例']};
 load(){return getDataset('demo');}
}
export class ManualImportProvider implements DataProvider {
 status={id:'manual',name:'手动导入',status:'可用',capabilities:['时刻表','经停','拓扑','路径']};
 load(){return getDataset('manual');}
}
export class UnavailableProvider {
 constructor(public status:ProviderStatus){}
 load():never {throw new Error(`${this.status.name}不可用：${this.status.reason||'使用条件未核验'}`);}
}
export function selectedProvider(scope:Scope):DataProvider {return scope==='manual'?new ManualImportProvider():new DemoProvider();}
export function providerCatalog():ProviderStatus[]{return [new ManualImportProvider().status,new DemoProvider().status,
 {id:'railgo',name:'RailGo 车站到发',status:'本机可手动查询',capabilities:['所选车站未来三小时到站或发车时刻'],reason:'非商业使用；仅本机展示，限速及内存缓存'},
 new UnavailableProvider({id:'12306',name:'12306 页面查询',status:'未接入',capabilities:['车站时刻页面','未来 3 小时正晚点页面'],reason:'自动访问和再发布权限未核验'}).status,
 new UnavailableProvider({id:'jisu',name:'极速数据',status:process.env.JISU_API_KEY?'已配置 Key，尚未验证授权':'缺少 Key',capabilities:['站站查询','车次经停'],reason:'授权、缓存和再发布条件未核验'}).status,
 new UnavailableProvider({id:'topology',name:'真实铁路拓扑与路径',status:'未接入',capabilities:[],reason:'真实图层及车次路径来源未核验'}).status];}
