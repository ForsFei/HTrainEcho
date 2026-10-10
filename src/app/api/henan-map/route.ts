import { NextRequest, NextResponse } from 'next/server';
import { getHenanMap } from '@/lib/henan-map';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const host=req.headers.get('host')?.split(':')[0];
 if(host!=='127.0.0.1'&&host!=='localhost')return NextResponse.json({error:'河南地图目前仅供本机使用'},{status:403});
 const data=getHenanMap();
 if(!data)return NextResponse.json({error:'河南地图数据尚未在本机生成；请运行地图数据构建脚本'},{status:503});
 return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});
}
