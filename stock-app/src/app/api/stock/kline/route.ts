import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import iconv from 'iconv-lite';

export const dynamic = 'force-dynamic';

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
    let result = data.map((item: any) => ({
      time: item.day.includes(' ') ? item.day.split(' ')[0] : item.day,
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: parseFloat(item.volume),
    }));

    // Fetch real-time quote to append today's data if scale is 240 (daily)
    if (scale === '240' && result.length > 0) {
      try {
        const quoteUrl = `http://hq.sinajs.cn/list=${symbol}`;
        const quoteRes = await axios.get(quoteUrl, { 
          responseType: 'arraybuffer',
          timeout: 2000,
          headers: { 'Referer': 'https://finance.sina.com.cn/' }
        });
        const quoteStr = iconv.decode(Buffer.from(quoteRes.data), 'GBK');
        const match = quoteStr.match(/="(.+?)"/);
        if (match) {
          const fields = match[1].split(',');
          if (fields.length >= 32) {
            const today = fields[30]; // YYYY-MM-DD
            const lastDate = result[result.length - 1].time;
            
            if (today > (lastDate as string)) {
              result.push({
                time: today,
                open: parseFloat(fields[1]),
                high: parseFloat(fields[4]),
                low: parseFloat(fields[5]),
                close: parseFloat(fields[3]),
                volume: parseFloat(fields[8]) / 100, // Sina kline volume is usually in lots, quote is in shares
              });
            } else if (today === lastDate) {
              // Update today's incomplete candle
              const idx = result.length - 1;
              result[idx] = {
                ...result[idx],
                high: Math.max(result[idx].high, parseFloat(fields[4])),
                low: Math.min(result[idx].low, parseFloat(fields[5])),
                close: parseFloat(fields[3]),
              };
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch real-time quote for kline overlap', e);
      }
    }

    // Update cache
    cache[cacheKey] = { data: result, timestamp: Date.now() };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('K-line API Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch kline data' }, { status: 500 });
  }
}
