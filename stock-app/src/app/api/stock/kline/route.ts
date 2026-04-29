import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const TDX_API = 'http://localhost:8080';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fullSymbol = searchParams.get('symbol') || ''; 
  const type = searchParams.get('type') || 'day';

  if (!fullSymbol) return NextResponse.json([]);

  try {
    const symbol = fullSymbol.replace(/^(sh|sz|bj)/i, '');
    let tdxType = '4';
    if (type === 'week') tdxType = '5';
    if (type === 'month') tdxType = '6';

    const url = type === 'minute'
      ? `${TDX_API}/api/minute?code=${symbol}`
      : `${TDX_API}/api/kline?code=${symbol}&type=${tdxType}`;

    const response = await fetch(url);
    const json = await response.json();
    if (json.code !== 0 || !json.data) return NextResponse.json([]);

    const list = json.data.List || json.data.list || [];

    if (type === 'minute') {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const d = now.getDate();

      return NextResponse.json(list.map((bar: any) => {
        // 后端返回的是 Price, Number, Time (大写开头)
        const timeStr = bar.Time || '09:30';
        const [hh, mm] = timeStr.split(':').map(Number);
        const localDate = new Date(y, m, d, hh, mm, 0);
        
        return {
          time: Math.floor(localDate.getTime() / 1000),
          price: (bar.Price || 0) / 1000,
          volume: bar.Number || 0,
        };
      }));
    }

    return NextResponse.json(list.map((bar: any) => {
      return {
        time: bar.Time.split('T')[0],
        open: (bar.Open || 0) / 1000,
        high: (bar.High || 0) / 1000,
        low: (bar.Low || 0) / 1000,
        close: (bar.Close || 0) / 1000,
        volume: bar.Volume || 0,
      };
    }).filter((bar: any) => bar.time && bar.close > 0));
  } catch (error) {
    return NextResponse.json([]);
  }
}
