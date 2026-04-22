'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries } from 'lightweight-charts';

interface ChartProps {
  symbol: string; // e.g. sh600000
  name: string;
}

export const StockChart: React.FC<ChartProps> = ({ symbol, name }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [scale, setScale] = useState<'240' | '1680'>('240'); // 240 is daily, 1680 is weekly (dummy for "Yearly" feel)

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#888',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#ef4444',
      downColor: '#22c55e',
      borderVisible: false,
      wickUpColor: '#ef4444',
      wickDownColor: '#22c55e',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const fetchKline = async () => {
      try {
        const res = await fetch(`/api/stock/kline?symbol=${symbol}&scale=${scale}&datalen=500`);
        const data = await res.json();
        series.setData(data);
        chart.timeScale().fitContent();
      } catch (e) {
        console.error('Failed to fetch kline', e);
      }
    };

    fetchKline();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [symbol, scale]);

  return (
    <div className="glass p-6 rounded-2xl mb-8 relative">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">{name}</h2>
          <span className="text-gray-500 text-sm uppercase">{symbol}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setScale('240')}
            className={`px-4 py-1 rounded-full text-sm transition-colors ${scale === '240' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
          >
            日线
          </button>
          <button
             onClick={() => setScale('1680')}
             className={`px-4 py-1 rounded-full text-sm transition-colors ${scale === '1680' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
          >
            周线
          </button>
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full h-[400px]" />
    </div>
  );
};
