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

export const IndexHeader: React.FC = () => {
  const [data, setData] = useState<IndexData[]>([]);

  const fetchIndices = async () => {
    try {
      // Fetch real-time data from our API instead of the static JSON
      const res = await fetch('/api/stock/quote?codes=sh000001,sz399001,sz399006');
      if (res.ok) {
        const json = await res.json();
        // The API returns an array of objects
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      {data.map((idx) => {
        const isUp = parseFloat(idx.pct) >= 0;
        return (
          <motion.div
            key={idx.code}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-3 rounded-2xl flex flex-col items-center justify-center transition-all hover:border-white/10"
          >
            <span className="text-gray-400 text-xs font-medium mb-0.5">{idx.name}</span>
            <span className={`text-2xl font-bold mb-1 ${isUp ? 'stock-up' : 'stock-down'}`}>
              {idx.price}
            </span>
            <div className={`flex gap-2 text-sm font-semibold ${isUp ? 'stock-up' : 'stock-down'}`}>
              <span>{idx.change}</span>
              <span>{idx.pct}%</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
