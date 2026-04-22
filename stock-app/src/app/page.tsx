'use client';

import { useState } from 'react';
import { IndexHeader } from '@/components/IndexHeader';
import { Watchlist } from '@/components/Watchlist';
import { StockChart } from '@/components/StockChart';
import { motion } from 'framer-motion';

export default function Home() {
  const [selectedStock, setSelectedStock] = useState<{ code: string; name: string }>({
    code: 'sh000001',
    name: '上证指数',
  });
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily');

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header section with branding */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-emerald-400 tracking-tighter">
            ANTIGRAVITY STOCK
          </h1>
          <p className="text-gray-500 text-sm mt-1">实时行情与量化分析平台</p>
        </div>
        <div className="flex items-center gap-3 glass px-4 py-2 rounded-full border-white/10">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Live Market Data</span>
        </div>
      </div>

      {/* Top Indices Dashboard */}
      <IndexHeader />

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Chart Viewport (7/12 Width) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-7"
        >
          <div className="glass rounded-2xl p-6 shadow-2xl border border-white/5">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{selectedStock.name}</h2>
                <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">{selectedStock.code}</p>
              </div>
              
              {/* Chart Period Selectors */}
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                <button 
                  onClick={() => setPeriod('daily')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${period === 'daily' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  日线
                </button>
                <button 
                  onClick={() => setPeriod('weekly')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${period === 'weekly' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  周线
                </button>
              </div>
            </div>
            
            {/* The actual chart - Height managed internally */}
            <StockChart symbol={selectedStock.code} name={selectedStock.name} />
          </div>
        </motion.div>

        {/* Watchlist & Portfolio (5/12 Width) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-5 sticky top-6"
        >
          <Watchlist onSelect={setSelectedStock} />
        </motion.div>
      </div>

      {/* Site Footer */}
      <footer className="pt-12 border-t border-white/5 text-center">
        <p className="text-gray-600 text-[10px] uppercase tracking-[0.2em]">
          © 2026 Antigravity Stock • Market Data via Sina Finance • For Testing Only
        </p>
      </footer>
    </main>
  );
}
