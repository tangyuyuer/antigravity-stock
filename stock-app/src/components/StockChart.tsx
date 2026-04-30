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
  const [markers, setMarkers] = useState<Record<string, 'buy' | 'sell'>>({});
  const [klineData, setKlineData] = useState<any[]>([]);

  // Load saved markers when symbol changes
  useEffect(() => {
    const saved = localStorage.getItem(`markers_${symbol}`);
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        setMarkers(parsed && typeof parsed === 'object' ? parsed : {}); 
      } catch (e) { 
        setMarkers({}); 
      }
    } else {
      setMarkers({});
    }
  }, [symbol]);

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
        setKlineData(data);
        const len = data.length;
        if (len > 90) {
          chart.timeScale().setVisibleLogicalRange({ from: len - 90, to: len - 1 });
        } else {
          chart.timeScale().fitContent();
        }
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

    const clickHandler = (param: any) => {
      if (!param.time) return;
      let timeStr = '';
      if (typeof param.time === 'string') {
        timeStr = param.time;
      } else if (typeof param.time === 'object') {
        const t = param.time;
        timeStr = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
      }
      if (!timeStr) return;

      setMarkers(prev => {
        const newMarkers = { ...prev };
        if (!newMarkers[timeStr]) newMarkers[timeStr] = 'buy';
        else if (newMarkers[timeStr] === 'buy') newMarkers[timeStr] = 'sell';
        else delete newMarkers[timeStr];
        
        localStorage.setItem(`markers_${symbol}`, JSON.stringify(newMarkers));
        return newMarkers;
      });
    };

    chart.subscribeClick(clickHandler);
    window.addEventListener('resize', handleResize);

    return () => {
      chart.unsubscribeClick(clickHandler);
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [symbol, scale]);

  useEffect(() => {
    if (!seriesRef.current || !Array.isArray(klineData) || klineData.length === 0) return;
    
    const chartMarkers: any[] = [];
    const safeMarkers = markers || {};
    klineData.forEach(item => {
      if (item && item.time && safeMarkers[item.time]) {
        chartMarkers.push({
          time: item.time,
          position: safeMarkers[item.time] === 'buy' ? 'belowBar' : 'aboveBar',
          color: safeMarkers[item.time] === 'buy' ? '#ef4444' : '#22c55e',
          shape: safeMarkers[item.time] === 'buy' ? 'arrowUp' : 'arrowDown',
          text: safeMarkers[item.time] === 'buy' ? '买' : '卖',
          size: 1,
        });
      }
    });
    seriesRef.current.setMarkers(chartMarkers);
  }, [markers, klineData]);

  return (
    <div className="glass p-6 rounded-2xl mb-8 relative">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-3">
            {name}
            <span className="text-xs font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
              💡 点击图表 K 线即可添加 买/卖 标记
            </span>
          </h2>
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
