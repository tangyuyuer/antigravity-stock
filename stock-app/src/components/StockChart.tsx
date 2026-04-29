'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, AreaSeries, CandlestickSeries, HistogramSeries } from 'lightweight-charts';

interface ChartProps {
  symbol: string;
  name: string;
}

type TF = 'minute' | 'day' | 'week' | 'month';

export const StockChart: React.FC<ChartProps> = ({ symbol, name }) => {
  const priceRef = useRef<HTMLDivElement>(null);
  const volRef = useRef<HTMLDivElement>(null);
  const [tf, setTf] = useState<TF>('minute');
  const [quote, setQuote] = useState<any>(null);

  useEffect(() => {
    if (!priceRef.current) return;

    const isMin = tf === 'minute';
    const isST = name.includes('ST');
    const limit = isST ? 5 : 10;

    const chart = createChart(priceRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#0d0d0d' }, textColor: '#aaa' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
      width: priceRef.current.clientWidth,
      height: isMin ? 340 : 450,
      timeScale: { 
        borderColor: 'rgba(255,255,255,0.1)', 
        timeVisible: true, 
        secondsVisible: false,
      },
      rightPriceScale: { visible: true, borderColor: 'rgba(255,255,255,0.1)' },
      localization: { locale: 'zh-CN' }
    });

    let vChart: IChartApi | null = null;
    if (isMin && volRef.current) {
      vChart = createChart(volRef.current, {
        layout: { background: { type: ColorType.Solid, color: '#0d0d0d' }, textColor: '#888' },
        grid: { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
        width: volRef.current.clientWidth,
        height: 100,
        timeScale: { visible: false },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)', scaleMargins: { top: 0.1, bottom: 0 } },
      });
    }

    let mounted = true;

    const f = async () => {
      try {
        const [qR, kR] = await Promise.all([
          fetch(`/api/stock/quote?codes=${symbol}`),
          fetch(`/api/stock/kline?symbol=${symbol}&type=${tf}`)
        ]);
        const qD = await qR.json();
        const kD = await kR.json();

        if (!mounted || !chart) return;
        if (qD && qD[0]) setQuote(qD[0]);

        const prevClose = parseFloat(qD[0]?.prevClose || '0');
        if (!kD || kD.length === 0) return;

        if (isMin) {
          const s1 = chart.addSeries(AreaSeries, { 
            lineColor: '#2196F3', 
            topColor: 'rgba(33,150,243,0.15)', 
            bottomColor: 'transparent', 
            lineWidth: 2,
            priceFormat: {
              type: 'custom',
              formatter: (p: number) => {
                const pct = ((p - prevClose) / prevClose) * 100;
                return `${p.toFixed(2)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`;
              }
            }
          });
          s1.setData(kD.map((x: any) => ({ time: x.time, value: x.price })));

          if (prevClose > 0) {
            s1.createPriceLine({
              price: prevClose,
              color: 'rgba(255,255,255,0.4)',
              lineWidth: 1,
              lineStyle: 2,
              title: '0.00%',
            });

            const range = prevClose * (limit / 100);
            chart.priceScale('right').setOptions({
              autoScale: false,
              minValue: prevClose - range,
              maxValue: prevClose + range,
            });
          }

          if (vChart) {
            const vs = vChart.addSeries(HistogramSeries, { color: '#26a69a' });
            vs.setData(kD.map((d: any, i: number) => ({
              time: d.time,
              value: d.volume,
              color: i > 0 && d.price < kD[i-1].price ? '#22c55e' : '#ef4444'
            })));
            vChart.timeScale().fitContent();
          }

        } else {
          const s2 = chart.addSeries(CandlestickSeries, { 
            upColor: '#ef4444', downColor: '#22c55e', borderVisible: false, 
            wickUpColor: '#ef4444', wickDownColor: '#22c55e' 
          });
          s2.setData(kD);
          
          // --- 自动缩放逻辑 ---
          const len = kD.length;
          let visibleCount = 50; // 默认
          if (tf === 'day') visibleCount = 14;   // 日线 2周
          if (tf === 'week') visibleCount = 12;  // 周线 3个月
          if (tf === 'month') visibleCount = 24; // 月线 2年
          
          if (len > visibleCount) {
            chart.timeScale().setVisibleLogicalRange({
              from: len - visibleCount,
              to: len - 1,
            });
          } else {
            chart.timeScale().fitContent();
          }
        }
        
        if (isMin) chart.timeScale().fitContent();

        if (vChart) {
          chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
            vChart?.timeScale().setVisibleRange(range as any);
          });
        }
      } catch (e) {}
    };

    f();
    const hR = () => {
      chart.applyOptions({ width: priceRef.current?.clientWidth });
      vChart?.applyOptions({ width: volRef.current?.clientWidth });
    };
    window.addEventListener('resize', hR);
    return () => { mounted = false; window.removeEventListener('resize', hR); chart.remove(); vChart?.remove(); };
  }, [symbol, tf, name]);

  const isUp = quote && parseFloat(quote.change) >= 0;

  return (
    <div className="flex flex-col bg-[#0a0a0a] p-5 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
      {quote && (
        <div className="flex flex-wrap items-center gap-10 border-b border-white/5 pb-6">
          <div>
            <div className="text-3xl font-black text-white tracking-tighter">{name}</div>
            <div className="text-[10px] text-gray-600 font-mono tracking-[0.3em] uppercase mt-0.5">{symbol}</div>
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-4xl font-mono font-bold leading-none ${isUp ? 'text-red-500' : 'text-green-500'}`}>{quote.price}</span>
            <span className={`text-lg font-bold mb-1 ${isUp ? 'text-red-500' : 'text-green-500'}`}>
              {isUp ? '+' : ''}{quote.pct}%
            </span>
          </div>
          <div className="flex flex-col text-[10px] text-gray-500">
            <span>\u6628\u6536: {quote.prevClose}</span>
            <span>\u6210\u4ea4: {(parseInt(quote.volume)/100).toFixed(0)} \u624b</span>
          </div>
        </div>
      )}

      <div className="flex gap-1 p-3">
        {[
          {l: '\u5206\u65f6', v: 'minute'},
          {l: '\u65e5\u7ebf', v: 'day'},
          {l: '\u5468\u7ebf', v: 'week'},
          {l: '\u6708\u7ebf', v: 'month'}
        ].map(x => (
          <button key={x.v} onClick={() => setTf(x.v as TF)} className={`px-5 py-2 text-[11px] font-black rounded-lg transition-all ${tf === x.v ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}>{x.l}</button>
        ))}
      </div>

      <div ref={priceRef} className="w-full" />
      {tf === 'minute' && <div ref={volRef} className="w-full border-t border-white/5" />}
    </div>
  );
};
