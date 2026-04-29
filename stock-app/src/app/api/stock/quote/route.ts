import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const TDX_API = 'http://localhost:8080';

const MANDATORY_NAMES: Record<string, string> = {
  'sh000001': '上证指数',
  'sz399001': '深证成指',
  'sz399006': '创业板指',
  'sh000300': '沪深300',
  'sh000852': '中证1000',
};

const nameCache: Record<string, string> = { ...MANDATORY_NAMES };

async function getStockName(fullCode: string): Promise<string> {
  const codeLower = fullCode.toLowerCase();
  if (MANDATORY_NAMES[codeLower]) return MANDATORY_NAMES[codeLower];
  if (nameCache[codeLower]) return nameCache[codeLower];
  try {
    const pureCode = codeLower.replace(/^(sh|sz|bj)/i, '');
    const res = await fetch(`${TDX_API}/api/search?keyword=${pureCode}`);
    const json = await res.json();
    const list = json.data?.list || json.data || [];
    const found = list.find((item: any) => item.code === pureCode);
    if (found?.name) {
      nameCache[codeLower] = found.name;
      return found.name;
    }
  } catch (e) {}
  return fullCode.toUpperCase();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const codesParam = searchParams.get('codes');
  if (!codesParam) return NextResponse.json([]);

  try {
    const processedCodes = codesParam.split(',').map(c => {
      let code = c.trim().toLowerCase();
      if (/^\d{6}$/.test(code)) {
        if (code.startsWith('6')) code = 'sh' + code;
        else if (code.startsWith('0') || code.startsWith('3')) code = 'sz' + code;
        else if (code.startsWith('4') || code.startsWith('8')) code = 'bj' + code;
      }
      return code;
    }).join(',');

    const response = await fetch(`${TDX_API}/api/quote?code=${processedCodes}`);
    const json = await response.json();
    if (json.code !== 0 || !Array.isArray(json.data)) return NextResponse.json([]);

    const result = await Promise.all(json.data.map(async (q: any) => {
      let ex = q.Exchange === 1 ? 'sh' : (q.Exchange === 0 ? 'sz' : 'bj');
      const code = `${ex}${q.Code}`;
      const name = await getStockName(code);

      // 核心修复：如果还没开盘(Close为0)，则使用昨收价Last
      const last = (q.K?.Last || 0) / 1000;
      let close = (q.K?.Close || 0) / 1000;
      if (close === 0) close = last; 

      const open = (q.K?.Open || 0) / 1000;
      const high = (q.K?.High || 0) / 1000;
      const low = (q.K?.Low || 0) / 1000;

      const change = close - last;
      const pct = last !== 0 ? (change / last) * 100 : 0;

      return {
        code, name, price: close.toFixed(2), change: change.toFixed(2), pct: pct.toFixed(2),
        open: open.toFixed(2), prevClose: last.toFixed(2), high: high.toFixed(2), low: low.toFixed(2),
        volume: String(q.TotalHand || 0), amount: String(q.Amount || 0),
      };
    }));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json([]);
  }
}
