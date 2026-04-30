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
  const type = searchParams.get('type') || 'day';

  if (!symbol) {
    return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
  }

  // Check cache
  const cacheKey = `${symbol}_${type}`;
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: { 'X-Cache': 'HIT' }
    });
  }

  try {
    if (type === 'minute') {
      // Tencent minute API
      const url = `http://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${symbol}`;
      const response = await axios.get(url, { timeout: 5000 });
      const resData = response.data?.data?.[symbol]?.data;
      if (!resData || !resData.data) {
        return NextResponse.json([]);
      }
      
      const dateStr = resData.date; // "20260429"
      const yyyy = dateStr.substring(0, 4);
      const mm = dateStr.substring(4, 6);
      const dd = dateStr.substring(6, 8);
      
      const lines = resData.data; // array of "0930 4061.82 6345575 10295..."
      const result = [];
      let prevCumVol = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split(' ');
        if (parts.length < 3) continue;
        
        const timeStr = parts[0]; // "0930"
        const hh = timeStr.substring(0, 2);
        const min = timeStr.substring(2, 4);
        
        const price = parseFloat(parts[1]);
        const cumVol = parseInt(parts[2], 10);
        let vol = cumVol;
        if (i > 0) {
          vol = Math.max(0, cumVol - prevCumVol);
        }
        prevCumVol = cumVol;
        
        // Use +08:00 to specify Beijing time correctly
        const timestamp = Math.floor(new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00+08:00`).getTime() / 1000);
        
        result.push({
          time: timestamp,
          price: price,
          volume: vol
        });
      }
      
      cache[cacheKey] = { data: result, timestamp: Date.now() };
      return NextResponse.json(result);

    } else {
      // Sina K-line API for day, week, month
      let scale = '240';
      let datalen = '300';
      if (type === 'week') { scale = '240'; datalen = '100'; } // fallback to daily
      if (type === 'month') { scale = '240'; datalen = '100'; } // fallback to daily

      const url = `http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${symbol}&scale=${scale}&ma=no&datalen=${datalen}`;
      
      const response = await axios.get(url, {
        headers: { 'Referer': 'https://finance.sina.com.cn/' },
        timeout: 5000,
      });

      let data = response.data;
      if (!Array.isArray(data)) return NextResponse.json([]);

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
    }
  } catch (error: any) {
    console.error('K-line API Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch kline data' }, { status: 500 });
  }
}
