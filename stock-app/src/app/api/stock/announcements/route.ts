import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Cache for announcements to avoid frequent hits
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 3600000 * 2; // 2 hours

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const codeWithPrefix = searchParams.get('code');

  if (!codeWithPrefix) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  // Clean code (sh600519 -> 600519)
  const code = codeWithPrefix.replace(/^(sh|sz)/i, '');

  if (cache[code] && Date.now() - cache[code].timestamp < CACHE_TTL) {
    return NextResponse.json(cache[code].data, { headers: { 'X-Cache': 'HIT' } });
  }

  try {
    // EastMoney announcement API
    const url = `https://np-anotice-stock.eastmoney.com/api/security/ann?sr=-1&page_size=1&page_index=1&ann_type=A&stock_list=${code}`;
    const response = await axios.get(url, { timeout: 5000 });
    
    const announcements = response.data?.data?.list || [];
    const latest = announcements[0] || null;

    if (latest) {
      const data = {
        id: latest.art_code,
        title: latest.title || latest.title_ch || '无标题公告',
        date: latest.notice_date,
        url: `https://data.eastmoney.com/notices/stock/${code}.html`
      };
      cache[code] = { data, timestamp: Date.now() };
      return NextResponse.json(data);
    }

    return NextResponse.json(null);
  } catch (error: any) {
    console.error('Announcement API Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}
