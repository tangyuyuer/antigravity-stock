'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { INDICES } from '@/lib/constants';

interface IndexData {
  code: string;
  name: string;
  price: string;
  change: string;
  pct: string;
}
interface IndexHeaderProps {
  onSelect?: (stock: { code: string; name: string }) => void;
}

export const IndexHeader: React.FC<IndexHeaderProps> = ({ onSelect }) => {
  const [data, setData] = useState<IndexData[]>([]);

  const fetchIndices = async () => {
    try {
      // Fetch real-time data from our API
      const res = await fetch(`/api/stock/quote?codes=sh000001,sz399001,sz399006,sh000300,sh000852&t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to fetch indices from live API', e);
    }
  };

  useEffect(() => {
    fetchIndices();
    const timer = setInterval(fetchIndices, 5000);
    return () => clearInterval(timer);
  }, []);

  const getDisplayName = (code: string, originalName: string) => {
    if (code === 'sh000300') return '大市值';
    if (code === 'sh000852') return '小市值';
    return originalName;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
      {data.map((idx) => {
        const isUp = parseFloat(idx.pct) >= 0;
        return (
          <motion.div
            key={idx.code}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onSelect?.({ code: idx.code, name: getDisplayName(idx.code, idx.name) })}
            className="glass p-3 rounded-2xl flex flex-col items-center justify-center transition-all hover:border-white/20 hover:bg-white/5 cursor-pointer"
          >
            <span className="text-gray-400 text-xs font-medium mb-0.5">
              {getDisplayName(idx.code, idx.name)}
            </span>
            <span className={`text-2xl font-bold mb-1 ${isUp ? 'stock-up' : 'stock-down'}`}>
              {idx.price}
            </span>
            <div className={`flex gap-2 text-sm font-semibold ${isUp ? 'stock-up' : 'stock-down'}`}>
              <span>{isUp ? '+' : ''}{idx.change}</span>
              <span>{isUp ? '+' : ''}{idx.pct}%</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
