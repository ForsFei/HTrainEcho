import { NextRequest, NextResponse } from 'next/server';
import { queryHenanBoard } from '@/lib/henan-upcoming';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const host=req.headers.get('host')?.split(':')[0];
 if(host!=='127.0.0.1'&&host!=='localhost')return NextResponse.json({error:'河南车站大屏目前仅供本机使用'},{status:403});
 const event=req.nextUrl.searchParams.get('event');
 if(event!=='arrival'&&event!=='departure')return NextResponse.json({error:'事件类型错误'},{status:400});
 try{return NextResponse.json(await queryHenanBoard(req.nextUrl.searchParams.get('stationId')||'',event),{headers:{'Cache-Control':'private, no-store'}})}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:'查询失败'},{status:400,headers:{'Cache-Control':'private, no-store'}})}
}
