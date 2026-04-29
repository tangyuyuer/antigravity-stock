'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MarketStats {
  up: number;
  flat: number;
  down: number;
  total: number;
  ratio: number;
}

export const MarketSentiment: React.FC = () => {
  const [stats, setStats] = useState<MarketStats | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/market/stats?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch market stats', e);
    }
  };

  useEffect(() => {
    fetchStats();
    const timer = setInterval(fetchStats, 60000); // 1 minute
    return () => clearInterval(timer);
  }, []);

  if (!stats) return null;

  const getStatus = () => {
    const { ratio } = stats;
    if (ratio > 85) return { text: '极度亢奋', color: 'text-red-500', bg: 'bg-red-500/10', icon: '🔥' };
    if (ratio > 65) return { text: '情绪火热', color: 'text-red-400', bg: 'bg-red-400/10', icon: '📈' };
    if (ratio > 45) return { text: '多空平衡', color: 'text-gray-400', bg: 'bg-gray-400/10', icon: '⚖️' };
    if (ratio > 20) return { text: '情绪低迷', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: '❄️' };
    return { text: '恐慌冰点', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: '🧊' };
  };

  const status = getStatus();

  return (
    <div className="glass p-3 rounded-2xl border border-white/5 bg-gradient-to-r from-white/5 to-transparent">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Ratio & Status */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <div className={`text-2xl font-black font-sans ${status.color}`}>
              {(stats.ratio || 0).toFixed(1)}%
            </div>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest whitespace-nowrap">上涨家数占比</p>
          </div>

          <div className="flex items-center gap-3 border-l border-white/10 pl-6">
            <div className={`p-1.5 rounded-xl ${status.bg}`}>
              <Thermometer size={18} className={status.color} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-base font-black tracking-tight ${status.color}`}>{status.text}</span>
                <span className="text-lg">{status.icon}</span>
              </div>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest whitespace-nowrap">全市场涨跌分布 (A股)</p>
            </div>
          </div>
        </div>

        {/* Center/Right: Bar Chart */}
        <div className="flex-1 w-full max-w-xl space-y-2">
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-red-500 flex items-center gap-1"><TrendingUp size={10}/> 涨 {stats.up}</span>
            <span className="text-gray-500 flex items-center gap-1"><Minus size={10}/> 平 {stats.flat}</span>
            <span className="text-emerald-500 flex items-center gap-1"><TrendingDown size={10}/> 跌 {stats.down}</span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(stats.up / stats.total) * 100}%` }}
              className="h-full bg-gradient-to-r from-red-600 to-red-400"
            />
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(stats.flat / stats.total) * 100}%` }}
              className="h-full bg-gray-600"
            />
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(stats.down / stats.total) * 100}%` }}
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
