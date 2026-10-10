import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'HTrainEoco · 听见火车',description:'下一列火车，什么时候来？火车观测与经过时间预测。'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
