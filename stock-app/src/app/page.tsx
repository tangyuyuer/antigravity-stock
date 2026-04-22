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

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header section with branding */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-emerald-400 tracking-tighter">
            ANTIGRAVITY STOCK
          </h1>
          <p className="text-gray-500 text-sm mt-1">实时行情与量化分析平台</p>
        </div>
        <div className="flex items-center gap-3 glass px-4 py-2 rounded-full border-white/10">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-emerald-500">LIVE MARKET DATA</span>
        </div>
      </div>

      {/* Top Indices */}
      <IndexHeader />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left/Top Content: Charts */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-8"
        >
          <StockChart symbol={selectedStock.code} name={selectedStock.name} />
          
          <div className="glass p-6 rounded-2xl">
            <h3 className="text-lg font-bold mb-4">市场情报</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '上证综指', value: '3,285.67', change: '+0.45%' },
                { label: '创业板指', value: '2,156.78', change: '-0.12%' },
                { label: '沪深300', value: '3,985.44', change: '+0.31%' },
                { label: '成交额', value: '8,865亿', change: '+23%' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-gray-500 text-xs">{item.label}</span>
                  <span className="font-bold text-sm mt-1">{item.value}</span>
                  <span className={`text-[10px] font-bold ${item.change.startsWith('+') ? 'stock-up' : 'stock-down'}`}>
                    {item.change}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right Content: Watchlist */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-4"
        >
          <Watchlist onSelect={setSelectedStock} />
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="mt-20 pt-8 border-t border-white/5 text-center text-gray-600 text-xs">
        <p>© 2026 Antigravity Stock. Data provided by Sina Finance. For demonstration purposes only.</p>
      </footer>
    </main>
  );
}
