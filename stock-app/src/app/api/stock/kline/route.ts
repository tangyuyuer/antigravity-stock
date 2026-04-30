import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Cache for historical data
const cache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 10000; // 10 seconds

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol'); // e.g. sh000001
  const scale = searchParams.get('scale') || '240'; // 240 is daily
  const datalen = searchParams.get('datalen') || '240';

  if (!symbol) {
    return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
  }

  // Check cache
  const cacheKey = `${symbol}_${scale}_${datalen}`;
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: { 'X-Cache': 'HIT' }
    });
  }

  try {
    // Sina K-line API
    const url = `http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${symbol}&scale=${scale}&ma=no&datalen=${datalen}`;
    
    const response = await axios.get(url, {
      headers: {
        'Referer': 'https://finance.sina.com.cn/',
        'User-Agent': 'Mozilla/5.0',
      },
      timeout: 5000,
    });

    const data = response.data;
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 500 });
    }

    // Transform to lightweight-charts format
    const result = data.map((item: any) => ({
      time: item.day.includes(' ') ? item.day.split(' ')[0] : item.day,
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: parseFloat(item.volume),
    }));

    // Update cache
    cache[cacheKey] = { data: result, timestamp: Date.now() };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('K-line API Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch kline data' }, { status: 500 });
  }
}
