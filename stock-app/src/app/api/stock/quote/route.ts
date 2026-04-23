import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import iconv from 'iconv-lite';

export const dynamic = 'force-dynamic';

// Simple in-memory cache
const cache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 3000; // 3 seconds

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const codes = searchParams.get('codes');

  if (!codes) {
    return NextResponse.json({ error: 'Missing codes parameter' }, { status: 400 });
  }

  // Check cache
  const cacheKey = codes;
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: { 'X-Cache': 'HIT' }
    });
  }

  try {
    const url = `http://hq.sinajs.cn/list=${codes}`;
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'Referer': 'https://finance.sina.com.cn/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 5000,
    });

    const data = iconv.decode(Buffer.from(response.data), 'GBK');
    const lines = data.split('\n').filter(l => l.trim());
    
    const result = lines.map(line => {
      const match = line.match(/hq_str_(.+?)="(.+?)"/);
      if (!match) return null;
      
      const [full, code, content] = match;
      const fields = content.split(',');
      if (fields.length < 10) return null;

      const open = parseFloat(fields[1]);
      const prevClose = parseFloat(fields[2]);
      let price = parseFloat(fields[3]);

      // Handle call auction or pre-market where current price (fields[3]) is 0
      if (price === 0) {
        price = open > 0 ? open : prevClose;
      }

      const change = price - prevClose;
      const pctChange = prevClose !== 0 ? (change / prevClose) * 100 : 0;

      return {
        code,
        name: fields[0],
        price: price.toFixed(2),
        change: change.toFixed(2),
        pct: pctChange.toFixed(2),
        open: fields[1],
        high: fields[4],
        low: fields[5],
        volume: fields[8],
        amount: fields[9],
        time: fields[31],
      };
    }).filter(Boolean);

    // Update cache
    cache[cacheKey] = { data: result, timestamp: Date.now() };

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Error:', errorMessage);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
