import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // --- 方案：接入新浪最稳的官方市场统计接口 ---
    const response = await fetch('https://quotes.sina.cn/cn/api/openapi.php/StockService.getMarketCount', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1'
      },
      next: { revalidate: 20 }
    });

    const json = await response.json();
    
    // 新浪的返回结构：result.data = { up: "xxx", down: "xxx", unchange: "xxx", total: "xxx" }
    if (json.result && json.result.data) {
      const d = json.result.data;
      const up = parseInt(d.up) || 0;
      const down = parseInt(d.down) || 0;
      const flat = parseInt(d.unchange) || 0;
      const total = parseInt(d.total) || (up + down + flat);

      return NextResponse.json({
        up,
        down,
        flat,
        total: total || 5300,
        ratio: parseFloat(((up / (total || 1)) * 100).toFixed(1)) || 0,
        status: '新浪实时源'
      });
    }

    // 如果接口挂了，返回一组“模拟但合理”的数据，防止前端崩溃
    throw new Error('Sina API Error');

  } catch (e) {
    // 保底数据，确保页面能正常渲染
    return NextResponse.json({
      up: 1800,
      down: 3200,
      flat: 300,
      total: 5300,
      ratio: 34.0,
      status: '保底数据'
    });
  }
}
