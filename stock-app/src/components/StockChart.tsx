'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries } from 'lightweight-charts';

interface ChartProps {
  symbol: string; // e.g. sh600000
  name: string;
}

export const StockChart: React.FC<ChartProps> = ({ symbol }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

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
      height: 300,
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
        const res = await fetch(`/api/stock/kline?symbol=${symbol}&scale=240&datalen=500`);
        const data = await res.json();
        series.setData(data);
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

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [symbol]);

  return (
    <div ref={chartContainerRef} className="w-full h-[300px]" />
  );
};
