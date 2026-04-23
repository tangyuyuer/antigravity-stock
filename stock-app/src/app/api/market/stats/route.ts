import { NextResponse } from 'next/server';
import axios from 'axios';

const cache: { data: any; timestamp: number } = { data: null, timestamp: 0 };
const CACHE_TTL = 60000; // 1 minute

export async function GET() {
  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data, { headers: { 'X-Cache': 'HIT' } });
  }

  try {
    // Fetch SSE and SZSE market stats
    const url = 'https://push2.eastmoney.com/api/qt/ulist.rt/get?secid=1.000001,0.399001&fields=f104,f105,f106';
    const response = await axios.get(url, { timeout: 5000 });
    
    const list = response.data?.data?.diff || [];
    if (list.length < 2) {
       // Fallback or retry if data is missing
       throw new Error('Incomplete market stats data');
    }

    // Summing up SSE and SZSE counts
    const up = (list[0].f104 || 0) + (list[1].f104 || 0);
    const flat = (list[0].f105 || 0) + (list[1].f105 || 0);
    const down = (list[0].f106 || 0) + (list[1].f106 || 0);
    const total = up + flat + down;

    const data = {
      up,
      flat,
      down,
      total,
      ratio: total > 0 ? (up / total) * 100 : 0,
      timestamp: Date.now()
    };

    cache.data = data;
    cache.timestamp = Date.now();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Market Stats API Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch market stats' }, { status: 500 });
  }
}
